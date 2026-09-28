"""Stage 2 - extract: find candidate companies, roles, rounds and questions.

Everything is deterministic (gazetteer + regex + scoring). Nothing here assumes a
sentence is a question: each segment is scored on several signals and only
segments that clear QUESTION_THRESHOLD become question candidates. The rest are
kept as supporting information so nothing is silently discarded.
"""
from __future__ import annotations

import re
from datetime import date
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .. import log_event, stage_guard
from .prepare import PreparedData, Segment

# ============================================================
# 1. INPUT / OUTPUT MODELS
# ============================================================


class EntityType(str, Enum):
    COMPANY = "COMPANY"
    ROLE = "ROLE"
    ROUND = "ROUND"
    QUESTION = "QUESTION"


class Candidate(BaseModel):
    """A raw extraction. `segment_index == -1` means the value came from a caller hint, not the text."""

    entity_type: EntityType
    raw_text: str  # full source segment
    cleaned_text: str  # the extracted span itself
    segment_index: int
    char_start: int  # offsets into PreparedData.cleaned_text
    char_end: int
    confidence: float = Field(ge=0.0, le=1.0)
    method: str  # hint | gazetteer | suffix | preposition | title | keyword | scored


class RoundCandidate(Candidate):
    kind: str  # controlled vocabulary, see _KIND_PATTERNS; "GENERAL" if unknown
    ordinal: Optional[int] = None
    is_final: bool = False
    mentions: list[int] = Field(default_factory=list)  # every segment that mentions this round


class QuestionCandidate(Candidate):
    round_index: Optional[int] = None  # index into ExtractedData.rounds active when asked
    style: str = "imperative"  # asked | list_item | interrogative | imperative


class SupportingInfo(BaseModel):
    segment_index: int
    text: str
    kind: Literal["tip", "outcome", "experience"]


class ExtractedData(BaseModel):
    experience_id: str
    interview_date: Optional[date] = None
    companies: list[Candidate] = Field(default_factory=list)
    roles: list[Candidate] = Field(default_factory=list)
    rounds: list[RoundCandidate] = Field(default_factory=list)
    questions: list[QuestionCandidate] = Field(default_factory=list)
    supporting: list[SupportingInfo] = Field(default_factory=list)


# ============================================================
# 2. CORE PROCESSING
# ============================================================

# ---- 2a. Companies -------------------------------------------------------

# High-precision seed list. It is a gazetteer, not the source of truth: unknown
# companies are still found by the patterns below and resolved against the DB later.
_KNOWN_COMPANIES = [
    "Google", "Microsoft", "Amazon", "Apple", "Meta", "Facebook", "Netflix", "Adobe", "Oracle", "IBM",
    "Intel", "Nvidia", "Qualcomm", "Cisco", "Salesforce", "SAP", "VMware", "Uber", "Flipkart", "Walmart",
    "PayPal", "Atlassian", "Goldman Sachs", "JP Morgan", "JPMorgan Chase", "JPMorgan", "Morgan Stanley",
    "Deloitte", "Accenture", "Capgemini", "Cognizant", "TCS", "Tata Consultancy Services", "Infosys",
    "Wipro", "HCLTech", "HCL", "Tech Mahindra", "LTIMindtree", "Zoho", "Freshworks", "Paytm", "Swiggy",
    "Zomato", "Razorpay", "PhonePe", "Myntra", "Mphasis", "Hexaware", "Virtusa", "Zensar", "Mindtree",
    "Persistent Systems", "Publicis Sapient", "Juspay", "Ericsson", "Bosch", "Siemens", "Honeywell",
    "Samsung", "Texas Instruments",
]
_GAZETTEER_RE = re.compile(
    r"\b(" + "|".join(re.escape(n) for n in sorted(_KNOWN_COMPANIES, key=len, reverse=True)) + r")\b", re.I
)

_TOKEN = r"[A-Z][\w&'-]*"
_CAP_PHRASE = rf"{_TOKEN}(?:\s+(?:(?:of|&)\s+)?{_TOKEN}){{0,3}}"
_PREPOSITION_RE = re.compile(rf"\b(?i:at|with|for|from|to|joined|by)\s+(?P<name>{_CAP_PHRASE})")
_SUFFIX_RE = re.compile(
    rf"\b(?P<name>(?:{_TOKEN}\s+){{0,3}}{_TOKEN}\s+"
    r"(?i:Technologies|Technology|Solutions|Systems|Labs|Corporation|Corp|Services|Software|Infotech|Inc|Ltd|Limited|Pvt))\b"
)
# Preposition matches are weak evidence ("to Bangalore"), so they only apply in
# segments that talk about the hiring process.
_HIRING_CONTEXT_RE = re.compile(
    r"\b(interview\w*|appl(?:y|ied|ication)|offer|placement|drive|hiring|hired|internship|joined|campus|"
    r"recruit\w*|opportunity|selected|shortlisted|visited|company)\b", re.I,
)
_STOP_NAME_TOKENS = set(
    "i we my our the a an this that their his her round rounds technical tech hr interview interviews "
    "online coding aptitude assessment test dsa oa sql java python c c++ dbms os oops oop cn campus "
    "placement on in monday tuesday wednesday thursday friday saturday sunday january february march april "
    "may june july august september october november december software data senior junior role position team "
    "company then after during first second third final last next while when also engineer developer "
    "analyst intern trainee sde swe".split()
)

# ---- 2b. Roles -----------------------------------------------------------

_ROLE_TITLES = [
    "software development engineer", "associate software engineer", "software engineer", "software developer",
    "graduate engineer trainee", "machine learning engineer", "full stack developer", "backend developer",
    "frontend developer", "devops engineer", "data engineer", "data scientist", "data analyst",
    "business analyst", "systems engineer", "system engineer", "qa engineer", "ml engineer", "sde", "swe",
    "analyst", "trainee", "intern",
]
_ROLE_RE = re.compile(
    r"\b(?:(?:associate|senior|junior|graduate|summer|research)\s+)?(?:"
    + "|".join(sorted(_ROLE_TITLES, key=len, reverse=True))
    + r")(?:[\s-]*(?:intern|trainee|i{1,3}|[1-3]))?\b",
    re.I,
)

# ---- 2c. Rounds ----------------------------------------------------------

_ORDINALS = {"first": 1, "1st": 1, "second": 2, "2nd": 2, "third": 3, "3rd": 3, "fourth": 4, "4th": 4, "fifth": 5, "5th": 5}
_ORD = r"(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|final|last)"
_KIND_PATTERNS = [
    ("ONLINE_ASSESSMENT", r"online\s+(?:assessment|test|round|coding\s+(?:test|round))|written\s+(?:test|round)|coding\s+(?:test|assessment)|assessment\s+round|OA(?:\s+round)?"),
    ("APTITUDE", r"aptitude\s+(?:round|test)"),
    ("GROUP_DISCUSSION", r"group\s+discussion(?:\s+round)?|GD(?:\s+round)?"),
    ("SYSTEM_DESIGN", r"system\s+design\s+(?:round|interview)"),
    ("CODING", r"(?:machine\s+)?coding\s+(?:round|interview)|DSA\s+(?:round|interview)|programming\s+(?:round|interview)"),
    ("TECHNICAL", r"(?:technical|tech)\s+(?:round|interview|discussion)"),
    ("MANAGERIAL", r"(?:managerial|manager|hiring\s+manager)\s+(?:round|interview)"),
    ("HR", r"(?:HR|human\s+resources)\s+(?:round|interview|discussion)"),
    ("BEHAVIORAL", r"behaviou?ral\s+(?:round|interview)"),
]
_KIND_REGEXES = [
    (kind, re.compile(rf"\b(?:(?P<ord>{_ORD})\s+)?(?P<kind>{pat})\b(?:\s*(?:no\.?\s*|#)?(?P<num>\d{{1,2}})\b)?", re.I))
    for kind, pat in _KIND_PATTERNS
]
# "first round", "Round 2": the type is not in the phrase, so look at what follows ("...was DSA").
_GENERIC_ROUND_RE = re.compile(
    rf"\b(?:(?P<ord>{_ORD})\s+(?:round|interview|stage)|round\s*(?:no\.?\s*|#)?(?P<num>\d{{1,2}}))\b", re.I
)
_TAIL_KINDS = [
    ("CODING", r"\b(?:dsa|coding|programming)\b"), ("TECHNICAL", r"\b(?:technical|tech)\b"),
    ("HR", r"\bhr\b"), ("MANAGERIAL", r"\bmanagerial\b"), ("APTITUDE", r"\baptitude\b"),
    ("ONLINE_ASSESSMENT", r"\b(?:online|oa)\b"), ("GROUP_DISCUSSION", r"\b(?:gd|group discussion)\b"),
    ("SYSTEM_DESIGN", r"\bsystem design\b"), ("BEHAVIORAL", r"\bbehaviou?ral\b"),
]
_TAIL_KIND_REGEXES = [(k, re.compile(p, re.I)) for k, p in _TAIL_KINDS]


class _RoundMention(BaseModel):
    kind: str
    ordinal: Optional[int]
    is_final: bool
    start: int  # offsets inside the segment text
    end: int
    confidence: float
    method: str


def _ordinal(word: Optional[str], number: Optional[str]) -> tuple[Optional[int], bool]:
    if number:
        return int(number), False
    if word and word.lower() in ("final", "last"):
        return None, True
    return (_ORDINALS.get(word.lower()) if word else None), False


def _tail_kind(text: str, end: int) -> Optional[str]:
    """Round type stated after a generic mention, e.g. 'The first round was DSA'."""
    tail = re.split(r"[.\n]", text[end:end + 60])[0]
    best: Optional[tuple[int, str]] = None
    for kind, regex in _TAIL_KIND_REGEXES:
        match = regex.search(tail)
        if match and (best is None or match.start() < best[0]):
            best = (match.start(), kind)
    return best[1] if best else None


def find_round_mentions(text: str) -> list[_RoundMention]:
    mentions: list[_RoundMention] = []
    for kind, regex in _KIND_REGEXES:
        for m in regex.finditer(text):
            ordinal, final = _ordinal(m.group("ord"), m.group("num"))
            has_position = ordinal is not None or final
            mentions.append(_RoundMention(kind=kind, ordinal=ordinal, is_final=final, start=m.start(), end=m.end(),
                                          confidence=0.9 if has_position else 0.85, method="keyword"))
    for m in _GENERIC_ROUND_RE.finditer(text):
        if any(x.start < m.end() and m.start() < x.end for x in mentions):
            continue  # a specific mention already covers this span
        ordinal, final = _ordinal(m.group("ord"), m.group("num"))
        kind = _tail_kind(text, m.end())
        mentions.append(_RoundMention(kind=kind or "GENERAL", ordinal=ordinal, is_final=final, start=m.start(),
                                      end=m.end(), confidence=0.6 if kind else 0.5, method="keyword"))
    return sorted(mentions, key=lambda x: x.start)


# ---- 2d. Questions -------------------------------------------------------

QUESTION_THRESHOLD = 50  # points out of 100; see _score_question

_ASK_LEAD_RE = re.compile(
    r"""(?ix)^(?P<lead>.*?\b(?:asked|asking|gave|posed|quizzed|questioned|wanted|(?:was|were|been|got)\s+given)\b
    (?:\s+(?:me|us|him|her|them))?
    (?:\s+(?:to|about|whether|if|that|for))?
    (?:\s+(?:a|an|the|some|one)\s+(?:question|problem|puzzle|query)s?\b(?:\s+(?:on|about|to|of|regarding))?)?
    )[\s:,\-]*"""
)
_START_WORDS = set(
    "what why how when where which who whom can could would will is are do does did should explain describe "
    "define write implement design find given print reverse check count sort merge remove delete detect "
    "convert calculate compute solve tell differentiate list create generate determine return optimize "
    "traverse search insert evaluate introduce".split()
)
_PROBLEM_RE = re.compile(
    r"\b(?:given (?:an?|the|two|n)\b|write (?:an?|the)\b|find (?:the|all|whether)\b|program to|query to|"
    r"function to|algorithm (?:to|for)|difference between|what (?:is|are|was)|how (?:do|does|would|can|to|will)|"
    r"why (?:is|are|do|does)|tell me about|introduce yourself|why should|where do you see)", re.I,
)
_TECH_RE = re.compile(
    r"\b(array|string|list|tree|graph|stack|queue|sort|linked|pointer|sql|query|table|database|thread|process|"
    r"deadlock|complexity|algorithm|program|function|class|object|inheritance|polymorphism|normali[sz]ation|"
    r"index|join|recursion|hash|binary|matrix|numbers?|element|palindrome|prime|tcp|http|oops?|dbms|os)\b", re.I,
)
_NARRATIVE_RE = re.compile(r"(?i)^(?:i|we|my|our|it|there|overall|after|then|finally|the (?:company|process|interviewer|panel|hr))\b")
_TIP_RE = re.compile(
    r"(?i)^(?:tips?|advice|suggestions?|note|pro tip|make sure|be sure|be prepared|practice|prepare|do not|don't|"
    r"always|try to|focus on|revise|study|remember|i would suggest|i suggest|my advice)\b"
)
_DESCRIPTIVE_RE = re.compile(r"(?i)^\d+\s*(?:coding\s+)?(?:questions?|problems?|mcqs?|minutes?|mins?|hours?|sections?)\b|\b(?:duration|time limit|platform)\b")
_OUTCOME_RE = re.compile(r"(?i)\b(selected|rejected|cleared|offer letter|got the offer|not selected|shortlisted|result)\b")
_BLOCK_HEAD_RE = re.compile(r"(?i)^(?:the\s+)?(?:(?:coding|technical|dsa|sql|aptitude|hr)\s+)?(?:questions?|problems?)\b[^.?]{0,40}:$")
_ROUND_PREFIX_RE = re.compile(r"(?i)^[\w\s#.]{0,40}?(?:round|interview|assessment|test)\s*\d{0,2}\s*:\s*(?=\S)")
_COMPOUND_RE = re.compile(r"(?i)\s*(?:,\s*)?\b(?:and then|and also|followed by|after that|then|also)\b\s+(?:to\s+)?")


def _score_question(text: str, remainder: str, seg: Segment, has_cue: bool, list_context: Optional[str]) -> int:
    """Additive evidence score (0-100). Weights are heuristics; the point is that no
    single weak signal (like a question mark or a list bullet) is enough on its own
    unless it is the only thing the segment offers."""
    words = remainder.split()
    score = 0
    if "?" in remainder:
        score += 45
    if words and words[0].lower().strip("'s") in _START_WORDS:
        score += 35
    if has_cue:
        score += 40
    if _PROBLEM_RE.search(remainder):
        score += 30
    if _TECH_RE.search(remainder):
        score += 15
    if seg.is_list_item:
        score += 15 + (35 if list_context == "questions" else 0)
    if not has_cue and _NARRATIVE_RE.match(text):
        score -= 35
    if _DESCRIPTIVE_RE.search(text):
        score -= 40
    if len(words) > 50:
        score -= 25
    if len(words) < 3 and not (seg.is_list_item and list_context == "questions"):
        score -= 30  # "Two Sum" is a fine list item, but a 2-word prose sentence is not a question
    return score


def _split_question_text(remainder: str, has_cue: bool) -> list[str]:
    """One segment can hold several questions ('What is X? how to Y?', '... and then ...')."""
    pieces = [p for p in re.split(r"(?<=\?)\s+", remainder) if p.strip()]
    if has_cue:
        expanded = []
        for piece in pieces:
            parts = _COMPOUND_RE.split(piece)
            expanded.extend(parts if len(parts) > 1 and all(len(p.split()) >= 3 for p in parts) else [piece])
        pieces = expanded
    cleaned = []
    for piece in pieces:
        piece = re.sub(r"(?i)^(?:and|also|then|next)\s+", "", piece.strip()).strip(" \"'")
        if len(piece.split()) >= 2:
            cleaned.append(piece)
    return cleaned


# ============================================================
# 3. HELPERS
# ============================================================


def _overlaps(span: tuple[int, int], taken: list[tuple[int, int]]) -> bool:
    return any(span[0] < b and a < span[1] for a, b in taken)


def _trim_company_name(phrase: str) -> Optional[str]:
    tokens = phrase.split()
    while tokens and tokens[0].lower().strip(".,") in _STOP_NAME_TOKENS:
        tokens.pop(0)
    while tokens and tokens[-1].lower().strip(".,") in _STOP_NAME_TOKENS:
        tokens.pop()
    name = " ".join(tokens).strip(" .,;:")
    return name if len(name) >= 2 else None


def _make_candidate(entity_type: EntityType, seg: Segment, start: int, end: int, conf: float, method: str) -> Candidate:
    return Candidate(entity_type=entity_type, raw_text=seg.text, cleaned_text=seg.text[start:end],
                     segment_index=seg.index, char_start=seg.start + start, char_end=seg.start + end,
                     confidence=conf, method=method)


def find_companies(seg: Segment) -> list[Candidate]:
    """Gazetteer > company-suffix > preposition, keeping the strongest non-overlapping matches."""
    found: list[tuple[int, int, float, str]] = []
    for m in _GAZETTEER_RE.finditer(seg.text):
        found.append((m.start(1), m.end(1), 0.9, "gazetteer"))
    for m in _SUFFIX_RE.finditer(seg.text):
        name = _trim_company_name(m.group("name"))
        if name and len(name.split()) > 1:  # a bare suffix word ("Technologies") is not a company
            start = seg.text.find(name, m.start("name"))
            found.append((start, start + len(name), 0.75, "suffix"))
    if _HIRING_CONTEXT_RE.search(seg.text):
        for m in _PREPOSITION_RE.finditer(seg.text):
            name = _trim_company_name(m.group("name"))
            if name:
                start = seg.text.find(name, m.start("name"))
                found.append((start, start + len(name), 0.5, "preposition"))
    taken: list[tuple[int, int]] = []
    result = []
    for start, end, conf, method in sorted(found, key=lambda f: (-f[2], f[0])):
        if not _overlaps((start, end), taken):
            taken.append((start, end))
            result.append(_make_candidate(EntityType.COMPANY, seg, start, end, conf, method))
    return sorted(result, key=lambda c: c.char_start)


def find_roles(seg: Segment) -> list[Candidate]:
    result = []
    for m in _ROLE_RE.finditer(seg.text):
        multi_word = len(m.group().split()) > 1 or m.group().lower() in ("sde", "swe")
        result.append(_make_candidate(EntityType.ROLE, seg, m.start(), m.end(), 0.8 if multi_word else 0.6, "title"))
    return result


def _register_round(rounds: list[RoundCandidate], seg: Segment, mention: _RoundMention) -> int:
    """Merge repeated mentions of the same round inside one experience.

    'Technical Round 1 ... during the technical round' is ONE round. A mention with
    no ordinal attaches to the first existing round of that kind.
    """
    for i, existing in enumerate(rounds):
        same_kind = existing.kind == mention.kind
        # "the first round" (kind unknown) refers to whichever round already has that ordinal,
        # and a later specific mention upgrades a GENERAL round to its real kind.
        generic_link = mention.ordinal is not None and existing.ordinal == mention.ordinal and "GENERAL" in (existing.kind, mention.kind)
        if generic_link or (same_kind and (existing.ordinal == mention.ordinal or mention.ordinal is None or existing.ordinal is None)):
            if existing.kind == "GENERAL" and mention.kind != "GENERAL":
                existing.kind = mention.kind
            if existing.ordinal is None and mention.ordinal is not None:
                existing.ordinal = mention.ordinal
            existing.mentions.append(seg.index)
            return i
    text = seg.text[mention.start:mention.end]
    rounds.append(RoundCandidate(
        entity_type=EntityType.ROUND, raw_text=seg.text, cleaned_text=text, segment_index=seg.index,
        char_start=seg.start + mention.start, char_end=seg.start + mention.end, confidence=mention.confidence,
        method=mention.method, kind=mention.kind, ordinal=mention.ordinal, is_final=mention.is_final,
        mentions=[seg.index]))
    return len(rounds) - 1


def _build_questions(seg: Segment, round_index: Optional[int], list_context: Optional[str]) -> list[QuestionCandidate]:
    prefix = _ROUND_PREFIX_RE.match(seg.text)  # "HR round: Tell me about yourself." -> judge what follows the colon
    body = seg.text[prefix.end():] if prefix else seg.text
    body = re.sub(r"(?i)^(?:and|also|then|next|after that)[,\s]+", "", body)  # "Then Tell me about..." is still a question
    lead = _ASK_LEAD_RE.match(body)
    has_cue = lead is not None
    remainder = body[lead.end():] if lead else body
    score = _score_question(body, remainder, seg, has_cue, list_context)
    if score < QUESTION_THRESHOLD:
        return []
    style = "asked" if has_cue else "list_item" if seg.is_list_item else "interrogative" if "?" in remainder else "imperative"
    questions = []
    for piece in _split_question_text(remainder, has_cue):
        idx = seg.text.find(piece)
        start = idx if idx >= 0 else 0
        end = start + len(piece) if idx >= 0 else len(seg.text)
        questions.append(QuestionCandidate(
            entity_type=EntityType.QUESTION, raw_text=seg.text, cleaned_text=piece, segment_index=seg.index,
            char_start=seg.start + start, char_end=seg.start + end, confidence=min(score, 100) / 100,
            method="scored", round_index=round_index, style=style))
    return questions


def _supporting_kind(text: str) -> Literal["tip", "outcome", "experience"]:
    if _TIP_RE.match(text):
        return "tip"
    return "outcome" if _OUTCOME_RE.search(text) else "experience"


# ============================================================
# 4. PUBLIC STAGE FUNCTION
# ============================================================


@stage_guard("extract", "extract_candidates")
def extract(prepared: PreparedData) -> ExtractedData:
    """Walk segments in order, tracking the current round so each question knows which round it belongs to."""
    data = ExtractedData(experience_id=prepared.experience_id, interview_date=prepared.interview_date)
    if prepared.company_hint:
        data.companies.append(Candidate(entity_type=EntityType.COMPANY, raw_text=prepared.company_hint,
                                        cleaned_text=prepared.company_hint, segment_index=-1, char_start=0,
                                        char_end=0, confidence=0.95, method="hint"))
    if prepared.role_hint:
        data.roles.append(Candidate(entity_type=EntityType.ROLE, raw_text=prepared.role_hint,
                                    cleaned_text=prepared.role_hint, segment_index=-1, char_start=0,
                                    char_end=0, confidence=0.95, method="hint"))

    current_round: Optional[int] = None
    list_context: Optional[str] = None  # "questions" | "tips": what the current bullet list contains
    for seg in prepared.segments:
        data.companies.extend(find_companies(seg))
        data.roles.extend(find_roles(seg))
        mentions = find_round_mentions(seg.text)
        for mention in mentions:
            current_round = _register_round(data.rounds, seg, mention)

        if not seg.is_list_item:
            list_context = None
        is_heading = seg.text.endswith(":") and not seg.is_list_item
        if is_heading:
            if _TIP_RE.match(seg.text):
                list_context = "tips"
            elif mentions or _BLOCK_HEAD_RE.match(seg.text) or _ASK_LEAD_RE.match(seg.text) or "question" in seg.text.lower():
                list_context = "questions"
            data.supporting.append(SupportingInfo(segment_index=seg.index, text=seg.text, kind="experience"))
            continue
        if mentions and not seg.is_list_item:
            list_context = "questions"  # a round header is usually followed by its questions

        if list_context == "tips" or _TIP_RE.match(seg.text):
            data.supporting.append(SupportingInfo(segment_index=seg.index, text=seg.text, kind="tip"))
            continue
        questions = _build_questions(seg, current_round, list_context)
        if questions:
            data.questions.extend(questions)
        else:
            data.supporting.append(SupportingInfo(segment_index=seg.index, text=seg.text, kind=_supporting_kind(seg.text)))

    log_event("candidates_extracted", experience_id=prepared.experience_id, companies=len(data.companies),
              roles=len(data.roles), rounds=len(data.rounds), questions=len(data.questions))
    return data