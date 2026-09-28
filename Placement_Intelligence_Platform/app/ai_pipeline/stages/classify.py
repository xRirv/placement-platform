"""Stage 5 - classify: category / topic / subtopic / difficulty for each question.

Rules first, deterministic, no model needed. The `QuestionClassifier` protocol is
the upgrade seam: an ML or LLM classifier can replace (or back up) the rule
classifier without touching any other stage.
"""
from __future__ import annotations

import re
from datetime import date
from enum import Enum
from typing import NamedTuple, Optional, Protocol

from pydantic import BaseModel, Field

from .. import log_event, stage_guard
from .resolve import Decision, ResolvedData, ResolvedEntity

# ============================================================
# 1. INPUT / OUTPUT MODELS
# ============================================================


class Category(str, Enum):
    DSA = "DSA"
    SQL = "SQL"
    DBMS = "DBMS"
    OPERATING_SYSTEMS = "OPERATING_SYSTEMS"
    COMPUTER_NETWORKS = "COMPUTER_NETWORKS"
    OOP = "OOP"
    PROGRAMMING = "PROGRAMMING"
    SYSTEM_DESIGN = "SYSTEM_DESIGN"
    APTITUDE = "APTITUDE"
    LOGICAL_REASONING = "LOGICAL_REASONING"
    BEHAVIORAL = "BEHAVIORAL"
    HR = "HR"
    OTHER = "OTHER"


class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    UNKNOWN = "UNKNOWN"


class Classification(BaseModel):
    category: Category
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    difficulty: Difficulty = Difficulty.UNKNOWN
    category_confidence: float = 0.0
    difficulty_confidence: float = 0.0
    signals: list[str] = Field(default_factory=list)
    source: str = "rules"  # rules | existing | llm | ml


class QuestionClassifier(Protocol):
    """Swap-in point for ML/LLM classifiers. `context` is the source sentence, useful for explicit difficulty words."""

    def classify(self, text: str, context: str = "") -> Classification: ...


class ClassifiedQuestion(BaseModel):
    resolved: ResolvedEntity
    classification: Classification


class ClassifiedData(BaseModel):
    experience_id: str
    interview_date: Optional[date] = None
    companies: list[ResolvedEntity] = Field(default_factory=list)
    roles: list[ResolvedEntity] = Field(default_factory=list)
    rounds: list[ResolvedEntity] = Field(default_factory=list)
    questions: list[ClassifiedQuestion] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ============================================================
# 2. CORE PROCESSING
# ============================================================


class Rule(NamedTuple):
    category: Category
    topic: str
    subtopic: Optional[str]
    pattern: re.Pattern[str]
    weight: int


def _r(cat: Category, topic: str, pattern: str, weight: int = 1, sub: Optional[str] = None) -> Rule:
    return Rule(cat, topic, sub, re.compile(pattern, re.I), weight)


C = Category
# Weight 2 marks phrases that are strong on their own; weight 1 marks common words
# that are only suggestive. Add rules here; nothing else needs to change.
RULES: list[Rule] = [
    _r(C.DSA, "Arrays", r"\barrays?\b|subarray|second largest|largest element|kadane|missing number|\btwo sum\b|three sum|duplicates?\b"),
    _r(C.DSA, "Strings", r"\bstrings?\b|palindrom|anagram|substring|longest common prefix"),
    _r(C.DSA, "Linked List", r"linked list|singly|doubly|floyd", 2),
    _r(C.DSA, "Trees", r"binary (?:search )?tree|\bbst\b|inorder|preorder|postorder|level order|lowest common ancestor|\blca\b|tree traversal|\btrees?\b", 2),
    _r(C.DSA, "Graphs", r"\bgraphs?\b|\bbfs\b|\bdfs\b|shortest path|minimum spanning|union[- ]find|connected components|number of islands", 2),
    _r(C.DSA, "Graphs", r"dijkstra", 2, "Shortest Path"),
    _r(C.DSA, "Graphs", r"topological", 2, "Topological Sort"),
    _r(C.DSA, "Dynamic Programming", r"dynamic programming|\bdp\b|memoi[sz]ation|edit distance|fibonacci", 2),
    _r(C.DSA, "Dynamic Programming", r"knapsack", 2, "Knapsack"),
    _r(C.DSA, "Dynamic Programming", r"longest (?:increasing|common) subsequence|\blis\b|\blcs\b", 2, "Subsequence"),
    _r(C.DSA, "Dynamic Programming", r"coin change", 2, "Coin Change"),
    _r(C.DSA, "Sorting & Searching", r"\bsort(?:ing|ed)?\b|binary search|merge sort|quick ?sort|bubble sort"),
    _r(C.DSA, "Stacks & Queues", r"\bstacks?\b|\bqueues?\b|monotonic|next greater|valid parenthes|balanced (?:brackets|parenthes)"),
    _r(C.DSA, "Hashing", r"hash ?(?:map|table|set)|\bhashing\b"),
    _r(C.DSA, "Heaps", r"\bheaps?\b|priority queue|top k|kth (?:largest|smallest)", 2),
    _r(C.DSA, "Recursion & Backtracking", r"recursion|backtrack|n-?queens?|permutations? of|subsets? of|sudoku|combination sum", 2),
    _r(C.DSA, "Math", r"\bprime\b|\bgcd\b|factorial|bit ?manipulation|power of two|armstrong|swap (?:two )?numbers?|fizz ?buzz|sum of (?:two )?numbers"),
    _r(C.DSA, "Data Structure Design", r"\b(?:lru|lfu) cache\b|design (?:a )?(?:data structure|hash ?map|stack|queue)", 2),
    _r(C.DSA, "Complexity", r"time complexity|space complexity|big ?o\b"),
    _r(C.SQL, "Queries", r"\bselect\b|\bsql\b|write a (?:sql )?query|nth highest|second highest salary|group by|\bhaving\b", 2),
    _r(C.SQL, "Joins", r"\bjoins?\b|inner join|left join|outer join", 2),
    _r(C.SQL, "Advanced SQL", r"subquer|window function|\bunion\b|\bcte\b", 2),
    _r(C.DBMS, "Normalization", r"normali[sz]ation|\b[1-3]nf\b|\bbcnf\b|denormali", 2),
    _r(C.DBMS, "Transactions", r"\bacid\b|transactions?\b|isolation level", 2),
    _r(C.DBMS, "Keys & Indexing", r"primary key|foreign key|candidate key|\bindex(?:es|ing)?\b", 2),
    _r(C.DBMS, "General", r"\bdbms\b|\brdbms\b|\bnosql\b|er diagram|cap theorem"),
    _r(C.OPERATING_SYSTEMS, "Concurrency", r"deadlock|semaphore|mutex|race condition|starvation|\bthreads?\b|banker", 2),
    _r(C.OPERATING_SYSTEMS, "Scheduling", r"scheduling|round robin|\bfcfs\b|context switch", 2),
    _r(C.OPERATING_SYSTEMS, "Memory", r"\bpaging\b|segmentation|virtual memory|page replacement|thrashing", 2),
    _r(C.OPERATING_SYSTEMS, "General", r"operating systems?|\bkernel\b|\bipc\b|\bos\b|process(?:es)? (?:vs|and|versus)"),
    _r(C.COMPUTER_NETWORKS, "Protocols", r"\btcp\b|\budp\b|\bhttps?\b|\bdns\b|\bdhcp\b|\barp\b|three[- ]way handshake|\bssl\b|\btls\b", 2),
    _r(C.COMPUTER_NETWORKS, "Models & Layers", r"\bosi\b|network layer|transport layer|tcp/ip", 2),
    _r(C.COMPUTER_NETWORKS, "Addressing", r"ip address|subnet|\bnat\b|routing|\blan\b|\bwan\b|computer networks?", 2),
    _r(C.OOP, "Pillars", r"polymorphism|inheritance|encapsulation|abstraction", 2),
    _r(C.OOP, "General", r"\boops?\b|object[- ]oriented|abstract class|interface|constructor|overloading|overriding|virtual function|access modifier|friend function"),
    _r(C.OOP, "Design Patterns", r"design patterns?|singleton|\bsolid\b", 2),
    _r(C.PROGRAMMING, "Language Concepts", r"\bjava\b|\bpython\b|c\+\+|\bjavascript\b|\bpointers?\b|garbage collection|\bjvm\b|memory leak|exception handling|multithreading|\bstatic\b|\bfinal\b|\blambda\b|decorator|\bgil\b"),
    _r(C.SYSTEM_DESIGN, "Architecture", r"system design|load balanc|scalab|sharding|microservices?|caching|\bcdn\b|high availability|consistent hashing|\bhld\b|\blld\b|low[- ]level design", 2),
    _r(C.SYSTEM_DESIGN, "Design Problems", r"design (?:a |an )?(?:url shortener|twitter|instagram|whatsapp|uber|netflix|chat|rate limiter|cache|parking lot|elevator)", 3),
    _r(C.APTITUDE, "Time, Speed & Distance", r"\btrains?\b|\bspeed\b|\bdistance\b|time and work|pipes? and cisterns?"),
    _r(C.APTITUDE, "Percentages & Profit", r"percentage|profit|\bloss\b|discount|simple interest|compound interest|\bratio\b|proportion"),
    _r(C.APTITUDE, "Probability & Averages", r"probability|\baverage\b|\bages?\b|mixtures?\b"),
    _r(C.APTITUDE, "General", r"aptitude|quantitative|number system", 2),
    _r(C.LOGICAL_REASONING, "Reasoning", r"blood relation|coding[- ]decoding|seating arrangement|number series|letter series|direction sense|syllogism|analogy|odd one out|logical reasoning|venn|data sufficiency", 2),
    _r(C.LOGICAL_REASONING, "Puzzles", r"\bpuzzles?\b|\bclock\b|\bcalendar\b"),
    _r(C.BEHAVIORAL, "Situational", r"tell me about a time|describe a situation|conflict|handled? (?:pressure|failure)|leadership|team ?work|challenge you faced|greatest achievement|disagree", 2),
    _r(C.HR, "Introduction", r"tell me about yourself|introduce yourself", 3),
    _r(C.HR, "Motivation", r"why (?:should we hire you|do you want to join|this company|us)|where do you see yourself|why did you choose", 3),
    _r(C.HR, "Personal", r"\bstrengths?\b|weakness(?:es)?|hobbies|\bfamily\b|gap in|notice period|relocat|\bsalary\b|expected? ctc|\bbond\b|\bshifts?\b", 2),
]

# Difficulty: only well-known problems and explicit statements. Anything else stays
# UNKNOWN rather than guessing. Confidence must reach MIN_DIFFICULTY_CONFIDENCE to be reported.
MIN_DIFFICULTY_CONFIDENCE = 0.5
_KNOWN_EASY = re.compile(r"(?i)reverse (?:a |the )?(?:string|linked list|array)|palindrome|fibonacci|factorial|\btwo sum\b|second largest|\bprime\b|anagram|fizz ?buzz|swap (?:two )?numbers|sum of (?:two )?numbers|valid parenthes|missing number|largest element")
_KNOWN_MEDIUM = re.compile(r"(?i)level order|lowest common ancestor|\blca\b|cycle in|detect (?:a )?cycle|knapsack|longest increasing|coin change|topological|number of islands|kadane|three sum|binary search|merge (?:two )?sorted|next greater|kth (?:largest|smallest)|top k")
_KNOWN_HARD = re.compile(r"(?i)\blru cache\b|median of two sorted|trapping rain water|n-?queens?|word ladder|sudoku|serialize and deserialize|minimum window substring|edit distance|regular expression matching")
_EXPLICIT_DIFFICULTY = re.compile(r"(?i)\b(easy|medium|hard)\b(?:[- ](?:level|question|problem))?")


class RuleBasedClassifier:
    """Keyword-scoring classifier. `fallback` (any QuestionClassifier) is consulted only when rules are unsure."""

    LOW_CONFIDENCE = 0.5

    def __init__(self, fallback: Optional[QuestionClassifier] = None) -> None:
        self.fallback = fallback

    def classify(self, text: str, context: str = "") -> Classification:
        category, topic, subtopic, confidence, signals = self._category(text)
        difficulty, diff_conf, diff_signal = self._difficulty(text, context)
        if diff_signal:
            signals.append(diff_signal)
        result = Classification(category=category, topic=topic, subtopic=subtopic, difficulty=difficulty,
                                category_confidence=confidence, difficulty_confidence=diff_conf, signals=signals)
        if confidence < self.LOW_CONFIDENCE and self.fallback is not None:
            return self.fallback.classify(text, context)
        return result

    @staticmethod
    def _category(text: str) -> tuple[Category, Optional[str], Optional[str], float, list[str]]:
        totals: dict[Category, int] = {}
        best_rule: dict[Category, Rule] = {}
        for rule in RULES:
            if rule.pattern.search(text):
                totals[rule.category] = totals.get(rule.category, 0) + rule.weight
                if rule.category not in best_rule or rule.weight > best_rule[rule.category].weight:
                    best_rule[rule.category] = rule
        if not totals:
            return Category.OTHER, None, None, 0.3, ["no rule matched"]
        ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)
        top_cat, top = ranked[0]
        second = ranked[1][1] if len(ranked) > 1 else 0
        confidence = round(min(0.95, top / (top + second + 0.5)), 2)
        rule = best_rule[top_cat]
        return top_cat, rule.topic, rule.subtopic, confidence, [f"rule:{top_cat.value}/{rule.topic}"]

    @staticmethod
    def _difficulty(text: str, context: str) -> tuple[Difficulty, float, Optional[str]]:
        explicit = _EXPLICIT_DIFFICULTY.search(context)
        if explicit:
            return Difficulty[explicit.group(1).upper()], 0.85, "difficulty:stated in text"
        for pattern, level in ((_KNOWN_HARD, Difficulty.HARD), (_KNOWN_MEDIUM, Difficulty.MEDIUM), (_KNOWN_EASY, Difficulty.EASY)):
            if pattern.search(text):
                return level, 0.7, f"difficulty:known problem ({level.value.lower()})"
        return Difficulty.UNKNOWN, 0.0, None


# ============================================================
# 3. HELPERS
# ============================================================


def _apply_existing(item: ResolvedEntity, fresh: Classification) -> Classification:
    """A question that matched a stored canonical question keeps that question's
    classification, so the same question is never categorized two ways. Difficulty
    is only filled in if the stored one is missing."""
    existing = item.matched
    if existing is None or not existing.category:
        return fresh
    try:
        category = Category(existing.category)
    except ValueError:
        return fresh
    stored = Difficulty(existing.difficulty) if existing.difficulty in Difficulty.__members__ else Difficulty.UNKNOWN
    keep_stored = stored is not Difficulty.UNKNOWN
    return Classification(
        category=category, topic=existing.topic, subtopic=existing.subtopic,
        difficulty=stored if keep_stored else fresh.difficulty,
        category_confidence=0.95, difficulty_confidence=0.95 if keep_stored else fresh.difficulty_confidence,
        signals=["reused stored classification"], source="existing",
    )


# ============================================================
# 4. PUBLIC STAGE FUNCTION
# ============================================================


@stage_guard("classify", "classify_questions")
def classify(resolved: ResolvedData, classifier: Optional[QuestionClassifier] = None) -> ClassifiedData:
    """Classify every resolved question. Pass any QuestionClassifier to override the rules."""
    engine = classifier or RuleBasedClassifier()
    questions = []
    for item in resolved.questions:
        fresh = engine.classify(item.entity.original_value, item.entity.source_text)
        final = _apply_existing(item, fresh) if item.decision is Decision.MATCH_EXISTING else fresh
        if final.difficulty is not Difficulty.UNKNOWN and final.difficulty_confidence < MIN_DIFFICULTY_CONFIDENCE:
            final = final.model_copy(update={"difficulty": Difficulty.UNKNOWN})  # don't pretend to know
        questions.append(ClassifiedQuestion(resolved=item, classification=final))
    log_event("classified", experience_id=resolved.experience_id, questions=len(questions))
    return ClassifiedData(experience_id=resolved.experience_id, interview_date=resolved.interview_date,
                          companies=resolved.companies, roles=resolved.roles, rounds=resolved.rounds,
                          questions=questions, warnings=resolved.warnings)