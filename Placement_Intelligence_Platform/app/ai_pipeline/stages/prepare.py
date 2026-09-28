"""Stage 1 - prepare: raw paragraph -> cleaned text + traceable segments.

No entity extraction happens here. The goal is a clean, lossless-enough
representation: the original text is kept, and every segment carries character
offsets into the cleaned text so later stages can trace anything back to source.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date
from typing import Optional

from pydantic import BaseModel

from .. import log_event, stage_guard

# ============================================================
# 1. INPUT / OUTPUT MODELS
# ============================================================


class RawExperience(BaseModel):
    """Pipeline input: one experience as a raw paragraph plus optional caller hints."""

    experience_id: str
    text: Optional[str] = None
    company_hint: Optional[str] = None
    role_hint: Optional[str] = None
    interview_date: Optional[date] = None


class Segment(BaseModel):
    """One sentence or list item. `start`/`end` index into PreparedData.cleaned_text."""

    index: int
    source_field: str
    text: str  # content only; a leading list marker such as "1." or "Q2:" is stored in `marker`
    start: int
    end: int
    is_list_item: bool = False
    marker: Optional[str] = None


class PreparedData(BaseModel):
    experience_id: str
    original_text: str
    cleaned_text: str
    segments: list[Segment]
    company_hint: Optional[str] = None
    role_hint: Optional[str] = None
    interview_date: Optional[date] = None


# ============================================================
# 2. CORE PROCESSING
# ============================================================

# Invisible characters and typographic quotes/dashes are noise for matching, but
# digits, hyphens inside words, brackets and operators are left untouched because
# they can be part of a question ("arr[i]", "O(n log n)", "a-b").
_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff\u00ad"))
_TYPOGRAPHY = {
    ord("\u2018"): "'", ord("\u2019"): "'", ord("\u201c"): '"', ord("\u201d"): '"',
    ord("\u2013"): "-", ord("\u2014"): "-", ord("\u2026"): "...", ord("\u00a0"): " ",
}
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_RULE_LINE_RE = re.compile(r"^\s*[-=_*~#]{3,}\s*$")  # decorative separators such as "-----"
_MD_BOLD_RE = re.compile(r"(\*\*|__)(?=\S)(.+?)(?<=\S)\1")


def clean_text(raw: str) -> str:
    """Normalize newlines/whitespace/typography without dropping meaningful characters."""
    text = unicodedata.normalize("NFC", raw).translate(_ZERO_WIDTH).translate(_TYPOGRAPHY)
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    text = _CONTROL_RE.sub("", text)
    text = _MD_BOLD_RE.sub(r"\2", text)
    lines = []
    for line in text.split("\n"):
        if _RULE_LINE_RE.match(line):
            continue
        lines.append(re.sub(r" {2,}", " ", line).strip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


_MARKER_RE = re.compile(
    r"^(?:[-*\u2022\u25aa\u25e6\u25cf\u27a4>]+|\d{1,2}[.)]|\(\d{1,2}\)|[Qq]\d{1,2}\s*[:.)-]|Question\s*\d{1,2}\s*[:.)-])\s+"
)
# Splits inline enumerations ("...asked: 1. X" / "... Q2: Y") but only after sentence punctuation,
# so "in round 2 they" is never cut.
_INLINE_ENUM_RE = re.compile(r"(?<=[.:;?!])\s+(?=(?:\d{1,2}[.)]|\(\d{1,2}\)|[Qq]\d{1,2}\s*[:.)-])\s+\S)")
_SENTENCE_BOUNDARY_RE = re.compile(r"""[.!?]+["')\]]*\s+(?=["'(\[]?[A-Z0-9])""")
_ABBREVIATIONS = {"e.g", "i.e", "vs", "mr", "mrs", "ms", "dr", "inc", "ltd", "corp", "approx", "sr", "jr", "st", "fig", "ex"}


def _ends_with_abbreviation(text: str, punct_start: int) -> bool:
    match = re.search(r"([A-Za-z][A-Za-z.]*)$", text[:punct_start])
    return bool(match) and match.group(1).lower() in _ABBREVIATIONS


def _split_sentences(text: str) -> list[tuple[int, int]]:
    """Return (start, end) spans of sentences, stripped of surrounding whitespace."""
    cuts = [0]
    for match in _SENTENCE_BOUNDARY_RE.finditer(text):
        if match.group().startswith(".") and _ends_with_abbreviation(text, match.start()):
            continue
        cuts.append(match.end())
    cuts.append(len(text))
    spans = []
    for a, b in zip(cuts, cuts[1:]):
        chunk = text[a:b]
        stripped = chunk.strip()
        if stripped:
            lead = len(chunk) - len(chunk.lstrip())
            spans.append((a + lead, a + lead + len(stripped)))
    return spans


def _split_enumerations(line: str) -> list[tuple[int, int]]:
    parts, last = [], 0
    for match in _INLINE_ENUM_RE.finditer(line):
        parts.append((last, match.start()))
        last = match.end()
    parts.append((last, len(line)))
    return parts


def segment(cleaned: str, source_field: str = "raw_content") -> list[Segment]:
    """Line-first segmentation: each line, then inline enumerations, then sentences."""
    segments: list[Segment] = []
    position = 0
    for line in cleaned.split("\n"):
        line_start = position
        position += len(line) + 1
        if not line.strip():
            continue
        for part_start, part_end in _split_enumerations(line):
            part = line[part_start:part_end]
            marker_match = _MARKER_RE.match(part)
            offset = marker_match.end() if marker_match else 0
            marker = marker_match.group().strip() if marker_match else None
            body = part[offset:]
            for i, (s, e) in enumerate(_split_sentences(body)):
                absolute = line_start + part_start + offset + s
                segments.append(
                    Segment(
                        index=len(segments),
                        source_field=source_field,
                        text=body[s:e],
                        start=absolute,
                        end=absolute + (e - s),
                        is_list_item=marker is not None and i == 0,
                        marker=marker if i == 0 else None,
                    )
                )
    return segments


# ============================================================
# 3. HELPERS
# ============================================================


def _clean_optional(value: Optional[str]) -> Optional[str]:
    """Hints are optional; treat blank strings as absent."""
    cleaned = clean_text(value) if value else ""
    return cleaned or None


# ============================================================
# 4. PUBLIC STAGE FUNCTION
# ============================================================


@stage_guard("prepare", "build_prepared_document")
def prepare(raw: RawExperience) -> PreparedData:
    """Validate the raw input, clean it, and split it into traceable segments."""
    if not raw.experience_id or not raw.experience_id.strip():
        raise ValueError("experience_id is empty")
    if raw.text is None or not raw.text.strip():
        raise ValueError("experience text is empty")
    cleaned = clean_text(raw.text)
    if not cleaned:
        raise ValueError("experience text is empty after cleaning")
    segments = segment(cleaned)
    log_event("prepared", experience_id=raw.experience_id, segments=len(segments))
    return PreparedData(
        experience_id=raw.experience_id,
        original_text=raw.text,
        cleaned_text=cleaned,
        segments=segments,
        company_hint=_clean_optional(raw.company_hint),
        role_hint=_clean_optional(raw.role_hint),
        interview_date=raw.interview_date,
    )