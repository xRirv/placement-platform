"""Stage 3 - normalize: give every candidate a comparable `normalized_value`.

The original text is never replaced. Normalization is deliberately conservative:
it removes formatting differences (case, punctuation, numbering, legal suffixes),
not meaning. Deciding that two strings are the SAME entity is resolve's job.
All normalization rules live in this file.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from .. import log_event, stage_guard
from .extract import Candidate, EntityType, ExtractedData, QuestionCandidate, RoundCandidate

# ============================================================
# 1. INPUT / OUTPUT MODELS
# ============================================================


class NormalizedEntity(BaseModel):
    """One entity in comparable form. Shared by all entity types so resolve can be generic."""

    entity_type: EntityType
    original_value: str
    normalized_value: str
    tokens: list[str]  # stemmed content tokens: used for overlap scoring and DB token lookups
    confidence: float
    extraction_method: str
    segment_index: int
    source_text: str
    char_start: int
    char_end: int
    round_kind: Optional[str] = None
    round_ordinal: Optional[int] = None
    round_is_final: bool = False
    round_index: Optional[int] = None  # questions: index into NormalizedData.rounds


class NormalizedData(BaseModel):
    experience_id: str
    interview_date: Optional[date] = None
    companies: list[NormalizedEntity] = Field(default_factory=list)
    roles: list[NormalizedEntity] = Field(default_factory=list)
    rounds: list[NormalizedEntity] = Field(default_factory=list)
    questions: list[NormalizedEntity] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ============================================================
# 2. CORE PROCESSING
# ============================================================

_SMART = {ord("\u2018"): "'", ord("\u2019"): "'", ord("\u201c"): '"', ord("\u201d"): '"', ord("\u2013"): "-", ord("\u2014"): "-"}
_TOKEN_RE = re.compile(r"[\w+#]+")
_TRAILING_PUNCT_RE = re.compile(r"[\s.,;:!?]+$")

_COMPANY_SUFFIXES = {"inc", "corp", "corporation", "ltd", "limited", "pvt", "private", "llc", "llp", "plc", "co", "company"}
_COMPANY_ALIASES = {"tcs": "tata consultancy services", "jp morgan": "jpmorgan chase", "jpmorgan": "jpmorgan chase",
                    "facebook": "meta", "hcl": "hcltech"}

_ROLE_NOISE = {"the", "role", "position", "profile", "a", "an"}
_ROMAN = {"i": "1", "ii": "2", "iii": "3"}

# Numbering / bullets / "Q1:" / "Question 2:" at the start of a question.
_QUESTION_PREFIX_RE = re.compile(
    r"^\s*(?:(?:q(?:uestion)?\s*\.?\s*\d{1,3}\s*[:.)\-]?|\d{1,3}\s*[.)\]:\-]|\(\d{1,3}\)|[-*\u2022\u25aa\u25e6\u25cf\u27a4>]+)\s*)+",
    re.I,
)
_QUESTION_FILLER_RE = re.compile(r"^(?:please|and|also|then|next|to)\s+", re.I)
# Words that carry no identity for question matching. "find"/"explain" are kept on purpose.
_STOPWORDS = set(
    "a an the of to in on for is are was were be and or that this it you your me us with by from as at "
    "given write program code please tell".split()
)


def base_normalize(text: str) -> str:
    """NFKC + casefold + collapse whitespace. NFKC also folds full-width forms ("＝" -> "=")."""
    text = unicodedata.normalize("NFKC", text).translate(_SMART).casefold()
    return re.sub(r"\s+", " ", text).strip()


def stem(token: str) -> str:
    """Tiny suffix stripper so 'numbers'/'number' and 'sorted'/'sort' align. Not linguistic; just consistent."""
    if token.isdigit() or len(token) <= 3:
        return token
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith("sses"):
        return token[:-2]
    for suffix in ("ing", "ed"):
        if token.endswith(suffix) and len(token) - len(suffix) >= 3:
            return token[: -len(suffix)]
    if token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def content_tokens(normalized: str) -> list[str]:
    """Ordered, de-duplicated, stemmed tokens with stopwords removed."""
    seen: dict[str, None] = {}
    for tok in _TOKEN_RE.findall(normalized):
        if tok not in _STOPWORDS:
            seen.setdefault(stem(tok))
    return list(seen)


def normalize_company(text: str) -> str:
    value = _TRAILING_PUNCT_RE.sub("", base_normalize(text))
    value = re.sub(r"^the\s+", "", value)
    words = value.split()
    while len(words) > 1 and words[-1].strip(".") in _COMPANY_SUFFIXES:
        words.pop()
    value = " ".join(w.strip(",") for w in words)
    return _COMPANY_ALIASES.get(value, value)


def normalize_role(text: str) -> str:
    value = _TRAILING_PUNCT_RE.sub("", base_normalize(text)).replace("-", " ")
    value = re.sub(r"\bsde\b", "software development engineer", value)
    value = re.sub(r"\bswe\b", "software engineer", value)
    words = [w for w in value.split() if w not in _ROLE_NOISE]
    if words and words[-1] in _ROMAN and len(words) > 1:
        words[-1] = _ROMAN[words[-1]]
    value = " ".join(words)
    return re.sub(r"\b(engineer|developer)(\d)", r"\1 \2", value)


def normalize_question(text: str) -> str:
    """Strip numbering/prefix/filler and trailing punctuation. Symbols such as
    []()<>= and digits are kept because they can distinguish two questions."""
    value = _QUESTION_PREFIX_RE.sub("", text)
    value = _QUESTION_FILLER_RE.sub("", value.strip())
    return _TRAILING_PUNCT_RE.sub("", base_normalize(value))


def normalize_round(kind: str) -> str:
    """Rounds normalize to their type only ('TECHNICAL' -> 'technical'). The ordinal
    is a property of the experience, not of the canonical round."""
    return kind.lower().replace("_", " ")


# ============================================================
# 3. HELPERS
# ============================================================


def _entity(candidate: Candidate, normalized: str, **extra: object) -> NormalizedEntity:
    return NormalizedEntity(
        entity_type=candidate.entity_type, original_value=candidate.cleaned_text, normalized_value=normalized,
        tokens=content_tokens(normalized), confidence=candidate.confidence, extraction_method=candidate.method,
        segment_index=candidate.segment_index, source_text=candidate.raw_text, char_start=candidate.char_start,
        char_end=candidate.char_end, **extra,
    )


def _normalize_simple(cands: list[Candidate], fn, warnings: list[str], label: str) -> list[NormalizedEntity]:
    result = []
    for cand in cands:
        value = fn(cand.cleaned_text)
        if value:
            result.append(_entity(cand, value))
        else:
            warnings.append(f"{label} dropped: empty after normalization: {cand.cleaned_text!r}")
    return result


def _normalize_rounds(cands: list[RoundCandidate]) -> list[NormalizedEntity]:
    return [_entity(c, normalize_round(c.kind), round_kind=c.kind, round_ordinal=c.ordinal, round_is_final=c.is_final)
            for c in cands]


def _normalize_questions(cands: list[QuestionCandidate], warnings: list[str]) -> list[NormalizedEntity]:
    result = []
    for cand in cands:
        value = normalize_question(cand.cleaned_text)
        entity = _entity(cand, value, round_index=cand.round_index) if value else None
        # A question with <2 content tokens ("Q3.") cannot be compared or classified meaningfully.
        if entity is None or len(entity.tokens) < 2:
            warnings.append(f"question dropped: too little content after normalization: {cand.cleaned_text!r}")
            continue
        result.append(entity)
    return result


# ============================================================
# 4. PUBLIC STAGE FUNCTION
# ============================================================


@stage_guard("normalize", "normalize_entities")
def normalize(extracted: ExtractedData) -> NormalizedData:
    """Attach normalized forms to every candidate; original text stays in `original_value`."""
    warnings: list[str] = []
    data = NormalizedData(
        experience_id=extracted.experience_id,
        interview_date=extracted.interview_date,
        companies=_normalize_simple(extracted.companies, normalize_company, warnings, "company"),
        roles=_normalize_simple(extracted.roles, normalize_role, warnings, "role"),
        rounds=_normalize_rounds(extracted.rounds),
        questions=_normalize_questions(extracted.questions, warnings),
        warnings=warnings,
    )
    log_event("normalized", experience_id=extracted.experience_id, dropped=len(warnings))
    return data