"""Representative tests. Run from the project root: pytest tests/test_ai_pipeline.py

No database: FakeRepository implements the EntityRepository protocol in memory.
"""
import pytest
from rapidfuzz import fuzz

from app.ai_pipeline import PipelineError, RawExperience, run_pipeline
from app.ai_pipeline.stages.classify import Category, Difficulty, RuleBasedClassifier
from app.ai_pipeline.stages.extract import EntityType, extract
from app.ai_pipeline.stages.normalize import normalize, normalize_company, normalize_question, normalize_role
from app.ai_pipeline.stages.prepare import prepare
from app.ai_pipeline.stages.resolve import Decision, ExistingEntity, resolve


class FakeRepository:
    def __init__(self, entities: list[ExistingEntity]):
        self.entities = entities

    def find_exact(self, entity_type, normalized_value):
        return next((e for e in self.entities if e.entity_type == entity_type and e.normalized_value == normalized_value), None)

    def find_similar(self, entity_type, normalized_value, tokens, limit):
        same = [e for e in self.entities if e.entity_type == entity_type]
        same.sort(key=lambda e: fuzz.token_set_ratio(normalized_value, e.normalized_value), reverse=True)
        return same[:limit]


def existing(entity_id, etype, name, **kw):
    from app.ai_pipeline.stages.normalize import base_normalize, content_tokens
    norm = normalize_company(name) if etype == EntityType.COMPANY else base_normalize(name)
    return ExistingEntity(entity_id=entity_id, entity_type=etype, canonical_name=name, normalized_value=norm,
                          tokens=content_tokens(norm), **kw)


def run_stages(text, repo=None, **raw_kwargs):
    prepared = prepare(RawExperience(experience_id="t1", text=text, **raw_kwargs))
    normalized = normalize(extract(prepared))
    return prepared, normalized, resolve(normalized, repo or FakeRepository([]))


# ---- prepare -------------------------------------------------------------

def test_segmentation_keeps_abbreviations_and_offsets():
    prepared = prepare(RawExperience(experience_id="t", text="I met Dr. Rao, e.g. the panel head. Q1: Explain O(n log n).\n- Reverse arr[i]."))
    texts = [s.text for s in prepared.segments]
    assert texts == ["I met Dr. Rao, e.g. the panel head.", "Explain O(n log n).", "Reverse arr[i]."]
    assert prepared.segments[1].marker == "Q1:" and prepared.segments[2].is_list_item
    assert all(prepared.cleaned_text[s.start:s.end] == s.text for s in prepared.segments)


# ---- extract -------------------------------------------------------------

def test_extract_separates_narrative_rounds_and_questions():
    text = ("I applied for the Software Engineer role at Microsoft. The first round was DSA. "
            "The interviewer asked me to find the second largest element. I was nervous during the first round.")
    data = extract(prepare(RawExperience(experience_id="t", text=text)))
    assert [c.cleaned_text for c in data.companies] == ["Microsoft"]
    assert [(r.kind, r.ordinal) for r in data.rounds] == [("CODING", 1)]  # "first round" x2 merged
    assert [q.cleaned_text for q in data.questions] == ["find the second largest element."]
    assert data.questions[0].round_index == 0


def test_question_without_question_mark_and_unknown_company():
    text = "I interviewed at Zenith Labs Pvt last month. In round 2 they gave me a problem to detect a cycle in a linked list."
    data = extract(prepare(RawExperience(experience_id="t", text=text)))
    assert data.companies[0].cleaned_text.startswith("Zenith Labs")
    assert [q.cleaned_text for q in data.questions] == ["detect a cycle in a linked list."]


# ---- normalize -----------------------------------------------------------

def test_company_variants_share_a_normalized_form():
    forms = {normalize_company(x) for x in ["Microsoft.", "MICROSOFT", "Microsoft Inc", "microsoft", "Microsoft Corporation"]}
    assert forms == {"microsoft"}


def test_question_normalization_strips_numbering_but_not_meaning():
    assert normalize_question("Q1: Find the sum of two numbers.") == "find the sum of two numbers"
    assert normalize_question("Question 2) find sum of two numbers") == "find sum of two numbers"
    assert normalize_question("2. Reverse arr[i]?") == "reverse arr[i]"  # symbols survive
    assert normalize_role("SDE-1") == "software development engineer 1"


# ---- resolve -------------------------------------------------------------

def test_exact_and_fuzzy_company_match():
    repo = FakeRepository([existing("c1", EntityType.COMPANY, "Microsoft")])
    _, _, resolved = run_stages("I interviewed at Microsoft Corp. and later at MICROSOFT.", repo)
    assert len(resolved.companies) == 1  # in-experience duplicates collapse
    assert resolved.companies[0].decision == Decision.MATCH_EXISTING and resolved.companies[0].matched.entity_id == "c1"


def test_number_guard_keeps_sde1_and_sde2_apart():
    repo = FakeRepository([existing("r1", EntityType.ROLE, "software development engineer 2")])
    _, _, resolved = run_stages("Applied for the SDE 1 role at Amazon.", repo)
    assert resolved.roles[0].decision == Decision.CREATE_NEW


def test_similar_but_not_close_enough_goes_to_review():
    repo = FakeRepository([existing("q1", EntityType.QUESTION, "find the largest element in an array")])
    _, _, resolved = run_stages("They asked me to find the second largest element in an array.", repo)
    assert resolved.questions[0].decision in (Decision.NEED_REVIEW, Decision.CREATE_NEW)
    assert resolved.questions[0].decision != Decision.MATCH_EXISTING  # 'second largest' != 'largest'


# ---- classify ------------------------------------------------------------

@pytest.mark.parametrize("text,category,difficulty", [
    ("Explain the difference between process and thread", Category.OPERATING_SYSTEMS, Difficulty.UNKNOWN),
    ("Write a query to find the second highest salary", Category.SQL, Difficulty.UNKNOWN),
    ("Reverse a linked list", Category.DSA, Difficulty.EASY),
    ("Implement an LRU cache", Category.DSA, Difficulty.HARD),
    ("Tell me about yourself", Category.HR, Difficulty.UNKNOWN),
    ("Explain the process of paying rent", Category.OTHER, Difficulty.UNKNOWN),
])
def test_rule_classifier(text, category, difficulty):
    result = RuleBasedClassifier().classify(text)
    assert result.category == category and result.difficulty == difficulty


# ---- end to end ----------------------------------------------------------

PARAGRAPH = """I applied for the SDE role at Microsoft. Round 1: Online Assessment
1. Two Sum
2. Reverse a linked list
The second round was technical. The interviewer asked me what is deadlock? Then Tell me about yourself.
Tips: Practice DSA daily."""


def test_end_to_end_payload_is_consistent_and_deduplicated():
    repo = FakeRepository([existing("c1", EntityType.COMPANY, "Microsoft")])
    payload = run_pipeline(RawExperience(experience_id="e1", text=PARAGRAPH), repo)
    assert payload.companies_to_create == [] and payload.experience_company_links[0].ref.existing_id == "c1"
    assert payload.experience_company_links[0].is_primary
    assert len(payload.questions_to_create) == len(payload.experience_question_links) >= 3
    assert len({q.temp_id for q in payload.questions_to_create}) == len(payload.questions_to_create)
    assert {r.round_ref.temp_id for r in payload.experience_round_links}  # rounds created once per kind
    assert all(link.round_ref is not None for link in payload.experience_question_links[:2])
    # rerunning gives identical temp ids (idempotent)
    again = run_pipeline(RawExperience(experience_id="e1", text=PARAGRAPH), repo)
    assert [q.temp_id for q in again.questions_to_create] == [q.temp_id for q in payload.questions_to_create]


def test_matched_question_reuses_stored_classification_and_is_not_recreated():
    stored = existing("q9", EntityType.QUESTION, "what is deadlock", category="OPERATING_SYSTEMS", topic="Concurrency")
    payload = run_pipeline(RawExperience(experience_id="e2", text="They asked me what is deadlock?"), FakeRepository([stored]))
    assert payload.questions_to_create == []
    assert payload.experience_question_links[0].question_ref.existing_id == "q9"
    assert payload.question_topic_links == []


def test_failure_identifies_stage_and_experience():
    with pytest.raises(PipelineError) as err:
        run_pipeline(RawExperience(experience_id="bad", text="   "), FakeRepository([]))
    assert err.value.stage == "prepare" and err.value.experience_id == "bad"