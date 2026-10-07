"""Stage 4 - resolve: decide whether each entity matches an existing canonical entity.

ONE generic resolver serves companies, roles, rounds and questions; only the
thresholds differ (RESOLVER_CONFIGS). The database is reached exclusively through
the `EntityRepository` protocol, and only two read operations are needed:

    find_exact    -> indexed equality lookup (canonical normalized value OR alias)
    find_similar  -> bounded top-K candidate generation (pg_trgm / token-array GIN later)

That bounded candidate generation is what keeps this from being an O(N) scan:
we only ever score at most `candidate_limit` rows per entity.
"""
from __future__ import annotations

import logging
from enum import Enum
from typing import Optional, Protocol

from pydantic import BaseModel, Field
from rapidfuzz import fuzz

from .. import log_event, stage_guard
from .extract import EntityType
from .normalize import NormalizedData, NormalizedEntity
from datetime import date

# ============================================================
# 1. INPUT / OUTPUT MODELS AND CONTRACTS
# ============================================================


class Decision(str, Enum):
    MATCH_EXISTING = "MATCH_EXISTING"
    CREATE_NEW = "CREATE_NEW"
    NEED_REVIEW = "NEED_REVIEW"


class ExistingEntity(BaseModel):
    """What the repository must return for a stored canonical entity."""

    entity_id: str
    entity_type: EntityType
    canonical_name: str
    normalized_value: str
    tokens: list[str] = Field(default_factory=list)
    category: Optional[str] = None  # questions only
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    difficulty: Optional[str] = None


class EntityRepository(Protocol):
    """Read-side contract the future db/repository.py must satisfy."""

    def find_exact(self, entity_type: EntityType, normalized_value: str) -> Optional[ExistingEntity]:
        """Return the entity whose canonical normalized_value OR any alias's normalized_value equals the input."""
        ...

    def find_similar(
        self, entity_type: EntityType, normalized_value: str, tokens: list[str], limit: int
    ) -> list[ExistingEntity]:
        """Return up to `limit` plausible candidates (trigram similarity and/or token overlap). Unscored, unordered is fine."""
        ...


class LLMVerdict(BaseModel):
    match_id: Optional[str] = None  # None means "none of the candidates; this is a new entity"


class LLMResolver(Protocol):
    """Optional fallback for the NEED_REVIEW band only. Return None to abstain."""

    def decide(self, entity: NormalizedEntity, candidates: list["MatchScore"]) -> Optional[LLMVerdict]: ...


class Alias(BaseModel):
    original_value: str
    normalized_value: str


class MatchScore(BaseModel):
    entity_id: str
    canonical_name: str
    score: float
    signals: dict[str, float] = Field(default_factory=dict)


class ResolverConfig(BaseModel):
    match_threshold: float  # >= this: same entity
    review_threshold: float  # >= this but < match: too close to call
    candidate_limit: int = 10
    cluster_within_experience: bool = True


class ResolvedEntity(BaseModel):
    key: str  # stable id inside this experience, e.g. "QUESTION:2"; links questions to rounds
    entity: NormalizedEntity  # representative mention
    decision: Decision
    method: str  # exact | fuzzy | llm | none
    score: float
    reason: str
    matched: Optional[ExistingEntity] = None
    runners_up: list[MatchScore] = Field(default_factory=list)
    mentions: int = 1
    variants: list[Alias] = Field(default_factory=list)  # every distinct spelling seen in this experience
    segment_indices: list[int] = Field(default_factory=list)
    round_keys: list[str] = Field(default_factory=list)  # questions: rounds they were asked in


class ResolvedData(BaseModel):
    experience_id: str
    interview_date: Optional[date] = None
    companies: list[ResolvedEntity] = Field(default_factory=list)
    roles: list[ResolvedEntity] = Field(default_factory=list)
    rounds: list[ResolvedEntity] = Field(default_factory=list)
    questions: list[ResolvedEntity] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ============================================================
# 2. CORE PROCESSING
# ============================================================

# Thresholds are starting points to tune against real data. Questions are stricter
# because a false merge silently corrupts question statistics, while a false
# split is cheap to fix later. Rounds skip clustering: (kind, ordinal) pairs are
# already unique per experience, and different ordinals must stay separate.
RESOLVER_CONFIGS: dict[EntityType, ResolverConfig] = {
    EntityType.COMPANY: ResolverConfig(match_threshold=0.92, review_threshold=0.80),
    EntityType.ROLE: ResolverConfig(match_threshold=0.90, review_threshold=0.75),
    EntityType.ROUND: ResolverConfig(match_threshold=0.90, review_threshold=0.75, cluster_within_experience=False),
    EntityType.QUESTION: ResolverConfig(match_threshold=0.88, review_threshold=0.70),
}
AMBIGUITY_MARGIN = 0.02  # two candidates this close, both above match threshold: don't guess
_SOFT_TOKEN_RATIO = 85  # tolerate typos ("microsft") when matching tokens of length >= 4


def _soft_overlap(a: list[str], b: list[str]) -> float:
    """Jaccard where near-identical long tokens count as a match (typo tolerance)."""
    if not a or not b:
        return 0.0
    matched = 0
    for tok in a:
        if tok in b or (len(tok) >= 4 and any(len(o) >= 4 and fuzz.ratio(tok, o) >= _SOFT_TOKEN_RATIO for o in b)):
            matched += 1
    return matched / (len(a) + len(b) - matched)


# Words that flip a question's meaning when only one side has them ("second largest" vs
# "largest", "sorted" vs "unsorted"). Stemmed forms, because tokens are stemmed.
_QUALIFIERS = set(
    "second third first last kth nth smallest largest minimum maximum min max longest shortest without not no "
    "odd even all any unsort distinct unique circular doubly singly senior junior associate".split()
)


def _numbers(tokens: list[str]) -> set[str]:
    return {t for t in tokens if t.isdigit()}


def score_pair(a_value: str, a_tokens: list[str], b_value: str, b_tokens: list[str], review_threshold: float, match_threshold: float) -> tuple[float, dict[str, float]]:
    """Blend of string and token signals. Numbers are a hard guard: 'sde 1' vs 'sde 2' or
    'top 3' vs 'top 5' are different things even though the strings are nearly identical."""
    signals = {
        "token_sort": fuzz.token_sort_ratio(a_value, b_value) / 100,
        "char": fuzz.ratio(a_value, b_value) / 100,
        "token_set": fuzz.token_set_ratio(a_value, b_value) / 100,
        "overlap": _soft_overlap(a_tokens, b_tokens),
    }
    score = 0.30 * signals["token_sort"] + 0.20 * signals["char"] + 0.20 * signals["token_set"] + 0.30 * signals["overlap"]
    na, nb = _numbers(a_tokens), _numbers(b_tokens)
    if na != nb:
        score = min(score, review_threshold - 0.01)  # different number => different entity
        signals["number_conflict"] = 1.0
    elif (set(a_tokens) ^ set(b_tokens)) & _QUALIFIERS:
        score = min(score, match_threshold - 0.01)  # too close to auto-merge; a human/LLM should look
        signals["qualifier_conflict"] = 1.0
    return round(score, 4), signals


def _rank(entity: NormalizedEntity, candidates: list[ExistingEntity], cfg: ResolverConfig) -> list[MatchScore]:
    scored = []
    for cand in candidates:
        score, signals = score_pair(entity.normalized_value, entity.tokens, cand.normalized_value, cand.tokens, cfg.review_threshold, cfg.match_threshold)
        scored.append(MatchScore(entity_id=cand.entity_id, canonical_name=cand.canonical_name, score=score, signals=signals))
    return sorted(scored, key=lambda m: m.score, reverse=True)


def _decide_from_scores(ranked: list[MatchScore], cfg: ResolverConfig) -> tuple[Decision, str]:
    if not ranked or ranked[0].score < cfg.review_threshold:
        return Decision.CREATE_NEW, "no similar existing entity"
    best = ranked[0]
    if best.score < cfg.match_threshold:
        return Decision.NEED_REVIEW, f"best score {best.score} is between review and match thresholds"
    if len(ranked) > 1 and ranked[1].score >= cfg.match_threshold and best.score - ranked[1].score < AMBIGUITY_MARGIN:
        return Decision.NEED_REVIEW, "two existing entities are almost equally similar"
    return Decision.MATCH_EXISTING, f"fuzzy score {best.score}"


def _resolve_one(entity: NormalizedEntity, repo: EntityRepository, cfg: ResolverConfig, llm: Optional[LLMResolver]) -> ResolvedEntity:
    """exact -> candidate generation -> similarity -> decision (-> optional LLM for the review band)."""
    base = dict(entity=entity, key="", segment_indices=[entity.segment_index])
    exact = repo.find_exact(entity.entity_type, entity.normalized_value)
    if exact is not None:
        return ResolvedEntity(**base, decision=Decision.MATCH_EXISTING, method="exact", score=1.0,
                              reason="exact normalized/alias match", matched=exact)

    candidates = repo.find_similar(entity.entity_type, entity.normalized_value, entity.tokens, cfg.candidate_limit)
    by_id = {c.entity_id: c for c in candidates}
    ranked = _rank(entity, candidates, cfg)[:3]
    decision, reason = _decide_from_scores(ranked, cfg)
    method = "fuzzy" if ranked else "none"

    if decision is Decision.NEED_REVIEW and llm is not None:
        verdict = llm.decide(entity, ranked)
        if verdict is not None:
            method = "llm"
            if verdict.match_id in by_id:
                decision, reason = Decision.MATCH_EXISTING, "llm verdict"
                ranked = sorted(ranked, key=lambda m: m.entity_id != verdict.match_id)
            elif verdict.match_id is None:
                decision, reason = Decision.CREATE_NEW, "llm verdict: new entity"

    matched = by_id.get(ranked[0].entity_id) if decision is Decision.MATCH_EXISTING and ranked else None
    return ResolvedEntity(**base, decision=decision, method=method, score=ranked[0].score if ranked else 0.0,
                          reason=reason, matched=matched, runners_up=ranked)


# ============================================================
# 3. HELPERS
# ============================================================


def _cluster(entities: list[NormalizedEntity], cfg: ResolverConfig) -> list[list[int]]:
    """Group near-identical mentions inside ONE experience (so 'two sum' said twice becomes one entity).

    Greedy against each cluster's first member. O(n^2) is fine here because n is
    the number of mentions in a single experience, not the size of the database.
    """
    clusters: list[list[int]] = []
    for i, ent in enumerate(entities):
        for members in clusters:
            rep = entities[members[0]]
            if cfg.cluster_within_experience:
                score, _ = score_pair(ent.normalized_value, ent.tokens, rep.normalized_value, rep.tokens, cfg.review_threshold, cfg.match_threshold)
                same = ent.normalized_value == rep.normalized_value or score >= cfg.match_threshold
            else:
                same = False
            if same:
                members.append(i)
                break
        else:
            clusters.append([i])
    return clusters


def _resolve_group(entities: list[NormalizedEntity], repo: EntityRepository, llm: Optional[LLMResolver], cache: dict) -> tuple[list[ResolvedEntity], dict[int, str]]:
    """Resolve one entity type. Returns resolved entities plus {input index -> key}."""
    if not entities:
        return [], {}
    entity_type = entities[0].entity_type
    cfg = RESOLVER_CONFIGS[entity_type]
    resolved, index_to_key = [], {}
    for n, members in enumerate(_cluster(entities, cfg)):
        rep = max((entities[m] for m in members), key=lambda e: e.confidence)
        cache_key = (entity_type, rep.normalized_value)
        # Same normalized value => same repository answer; also keeps rounds of one kind consistent.
        result = cache.get(cache_key) or _resolve_one(rep, repo, cfg, llm)
        cache[cache_key] = result
        key = f"{entity_type.value}:{n}"
        variants = {(entities[m].original_value, entities[m].normalized_value) for m in members}
        resolved.append(result.model_copy(update={
            "key": key,
            "entity": rep,
            "mentions": len(members),
            "variants": [Alias(original_value=o, normalized_value=v) for o, v in sorted(variants)],
            "segment_indices": sorted({entities[m].segment_index for m in members}),
        }))
        for m in members:
            index_to_key[m] = key
        _log_resolution(resolved[-1])
    return resolved, index_to_key


def _log_resolution(item: ResolvedEntity) -> None:
    fields = dict(type=item.entity.entity_type.value, value=item.entity.normalized_value, decision=item.decision.value,
                  score=item.score, method=item.method)
    if item.decision is Decision.NEED_REVIEW:
        log_event("low_confidence_match", **fields, reason=item.reason)
    elif item.decision is Decision.CREATE_NEW:
        log_event("entity_will_be_created", logging.DEBUG, **fields)
    else:
        log_event("entity_resolved", logging.DEBUG, **fields)


# ============================================================
# 4. PUBLIC STAGE FUNCTION
# ============================================================


@stage_guard("resolve", "resolve_entities")
def resolve(normalized: NormalizedData, repository: EntityRepository, llm_resolver: Optional[LLMResolver] = None) -> ResolvedData:
    """Resolve companies, roles, rounds, then questions (which need round keys)."""
    cache: dict = {}
    companies, _ = _resolve_group(normalized.companies, repository, llm_resolver, cache)
    roles, _ = _resolve_group(normalized.roles, repository, llm_resolver, cache)
    rounds, round_key_by_index = _resolve_group(normalized.rounds, repository, llm_resolver, cache)
    questions, _ = _resolve_group(normalized.questions, repository, llm_resolver, cache)

    # A clustered question may have been asked under several rounds; keep them all.
    for q in questions:
        ids = [i for i, e in enumerate(normalized.questions) if e.segment_index in q.segment_indices and e.round_index is not None]
        q.round_keys = sorted({round_key_by_index[normalized.questions[i].round_index] for i in ids
                               if normalized.questions[i].round_index in round_key_by_index})

    return ResolvedData(experience_id=normalized.experience_id, interview_date=normalized.interview_date,
                        companies=companies, roles=roles, rounds=rounds, questions=questions, warnings=normalized.warnings)
