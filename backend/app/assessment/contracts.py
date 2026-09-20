"""Strict public and private contracts for AI-generated assessments."""

from __future__ import annotations

import json
import math
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

AssessmentKind = Literal["quick_check", "practice", "quiz", "mock_exam"]
Difficulty = Literal["easy", "medium", "advanced", "very_advanced"]
QuestionType = Literal[
    "multiple_choice", "true_false", "short_answer", "matching", "essay", "calculation"
]
SourceScope = Literal["materials", "web", "both"]
QUESTION_TYPES = (
    "multiple_choice",
    "true_false",
    "short_answer",
    "matching",
    "essay",
    "calculation",
)
PRIVATE_QUESTION_FIELDS = {
    "answerKey",
    "answer_key",
    "correctOptionIds",
    "correctBoolean",
    "correctPairs",
    "canonicalValue",
    "tolerance",
    "rubric",
    "modelAnswer",
}


class StrictModel(BaseModel):
    """Reject unknown client fields and accept documented camelCase aliases."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class QuestionMix(StrictModel):
    """Exact supported question counts."""

    multiple_choice: int = Field(alias="multiple_choice", ge=0, le=30)
    true_false: int = Field(alias="true_false", ge=0, le=30)
    short_answer: int = Field(alias="short_answer", ge=0, le=30)
    matching: int = Field(ge=0, le=30)
    essay: int = Field(ge=0, le=30)
    calculation: int = Field(ge=0, le=30)

    def total(self) -> int:
        return sum(getattr(self, kind) for kind in QUESTION_TYPES)


class AssessmentConfig(StrictModel):
    """Authoritative frontend setup fields, revalidated by the backend."""

    kind: AssessmentKind
    subject_slug: str = Field(alias="subjectSlug", min_length=1, max_length=120)
    subject_name: str = Field(alias="subjectName", min_length=1, max_length=160)
    component: str | None = Field(default=None, max_length=160)
    topic: str | None = Field(default=None, max_length=240)
    learning_goal_ids: list[str] = Field(alias="learningGoalIds", max_length=100)
    difficulty: Difficulty
    source_scope: SourceScope = Field(alias="sourceScope")
    selected_material_ids: list[str] = Field(alias="selectedMaterialIds", max_length=100)
    question_mix: QuestionMix = Field(alias="questionMix")
    time_limit_minutes: int | None = Field(alias="timeLimitMinutes", default=None, ge=1, le=120)
    feedback_mode: Literal["immediate", "deferred"] = Field(alias="feedbackMode")
    school_level: str | None = Field(alias="schoolLevel", default=None, max_length=120)
    academic_year: str | None = Field(alias="academicYear", default=None, max_length=40)
    language: str = Field(min_length=2, max_length=40)
    include_in_stats: bool = Field(alias="includeInStats")

    @model_validator(mode="after")
    def validate_setup(self) -> AssessmentConfig:
        """Mirror frontend invariants and reject unsupported combinations."""

        if self.question_mix.total() < 1 or self.question_mix.total() > 60:
            raise ValueError("question count must be between 1 and 60")
        if self.kind == "mock_exam" and self.time_limit_minutes is None:
            raise ValueError("mock exams require a time limit")
        if self.kind == "quick_check" and self.question_mix.total() > 10:
            raise ValueError("quick checks are limited to 10 questions")
        if len(set(self.learning_goal_ids)) != len(self.learning_goal_ids):
            raise ValueError("learning goal IDs must be unique")
        if len(set(self.selected_material_ids)) != len(self.selected_material_ids):
            raise ValueError("material IDs must be unique")
        return self

    def public_dict(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, mode="json")


class CreateGenerationRequest(StrictModel):
    """One idempotent generation request using an actually ready local model."""

    config: AssessmentConfig
    idempotency_key: str = Field(min_length=8, max_length=200)
    model_id: str = Field(min_length=1, max_length=200)


class SubmitPayload(StrictModel):
    """Browser snapshot; all authoritative values are recomputed server-side."""

    attempt_id: str = Field(alias="attemptId", min_length=1, max_length=200)
    config: AssessmentConfig
    questions: list[dict[str, Any]] = Field(max_length=60)
    answers: list[dict[str, Any]] = Field(max_length=60)
    started_at: str = Field(alias="startedAt", min_length=1, max_length=80)
    submitted_at: str = Field(alias="submittedAt", min_length=1, max_length=80)
    time_taken_seconds: int | None = Field(alias="timeTakenSeconds", default=None, ge=0)
    auto_submitted: bool = Field(alias="autoSubmitted")


class SubmitAssessmentRequest(StrictModel):
    """Idempotent submission envelope."""

    payload: SubmitPayload
    idempotency_key: str = Field(min_length=8, max_length=200)


class AbandonRequest(StrictModel):
    """One caller-owned ephemeral job or attempt reference."""

    job_id: str | None = Field(alias="jobId", default=None, max_length=200)
    attempt_id: str | None = Field(alias="attemptId", default=None, max_length=200)

    @model_validator(mode="after")
    def require_reference(self) -> AbandonRequest:
        if not self.job_id and not self.attempt_id:
            raise ValueError("a job or attempt ID is required")
        return self


def canonical_json(value: Any) -> str:
    """Stable JSON used for fingerprints and exact snapshot comparisons."""

    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def parse_model_json(content: str) -> dict[str, Any]:
    """Accept only a single JSON object; markdown fences and trailing prose fail."""

    if len(content.encode("utf-8")) > 2_000_000:
        raise ValueError("model output exceeds the assessment limit")
    value = json.loads(content)
    if not isinstance(value, dict):
        raise TypeError("model output must be an object")
    return value


def _bounded_string(value: Any, name: str, *, maximum: int = 10_000) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError(f"{name} must be a bounded non-empty string")
    return value


def _optional_string(value: Any, name: str, *, maximum: int = 10_000) -> str | None:
    if value is None:
        return None
    return _bounded_string(value, name, maximum=maximum)


def validate_rich_content(value: Any, *, allow_empty: bool = False) -> list[dict[str, Any]]:
    """Validate the renderer's restricted rich-content block vocabulary."""

    if not isinstance(value, list) or (not value and not allow_empty) or len(value) > 40:
        raise ValueError("rich content must contain between 1 and 40 blocks")
    allowed: dict[str, set[str]] = {
        "prose": {"kind", "text", "style"},
        "math": {"kind", "latex", "display"},
        "chemistry": {"kind", "latex", "display"},
        "table": {"kind", "caption", "header", "rows"},
        "code": {"kind", "language", "source"},
        "quotation": {"kind", "text", "attribution", "style"},
        "poetry": {"kind", "stanzas", "style"},
    }
    result: list[dict[str, Any]] = []
    for raw in value:
        if not isinstance(raw, dict) or raw.get("kind") not in allowed:
            raise ValueError("unsupported rich-content block")
        kind = str(raw["kind"])
        if set(raw) - allowed[kind]:
            raise ValueError("unknown rich-content field")
        if kind in {"prose", "quotation"}:
            _bounded_string(raw.get("text"), "text")
        elif kind in {"math", "chemistry"}:
            _bounded_string(raw.get("latex"), "latex", maximum=4_000)
        elif kind == "code":
            _bounded_string(raw.get("source"), "source")
        elif kind == "table":
            header, rows = raw.get("header"), raw.get("rows")
            if not isinstance(header, list) or not isinstance(rows, list) or len(header) > 20:
                raise ValueError("invalid table")
            if len(rows) > 100 or any(
                not isinstance(row, list) or len(row) != len(header) for row in rows
            ):
                raise ValueError("invalid table rows")
        elif kind == "poetry":
            stanzas = raw.get("stanzas")
            if not isinstance(stanzas, list) or len(stanzas) > 20:
                raise ValueError("invalid poetry block")
        if len(canonical_json(raw)) > 50_000:
            raise ValueError("rich-content block is too large")
        result.append(raw)
    return result


def _source_list(value: Any, allowed_sources: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    if not isinstance(value, list) or not value or len(value) > 12:
        raise ValueError("every generated question requires a bounded source list")
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in value:
        if not isinstance(raw, dict):
            raise TypeError("invalid source reference")
        source_id = _bounded_string(raw.get("id"), "source ID", maximum=200)
        if source_id in seen or source_id not in allowed_sources:
            raise ValueError("question cites an unavailable source")
        seen.add(source_id)
        result.append(allowed_sources[source_id])
    return result


def validate_generation_payload(
    raw: dict[str, Any],
    config: AssessmentConfig,
    allowed_sources: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Validate public questions and separate private keys from local-model JSON."""

    if set(raw) != {"questions", "answer_keys"}:
        raise ValueError("generation output must contain only questions and answer_keys")
    questions_raw, keys_raw = raw["questions"], raw["answer_keys"]
    if not isinstance(questions_raw, list) or not isinstance(keys_raw, list):
        raise TypeError("questions and answer_keys must be lists")
    if len(questions_raw) != config.question_mix.total() or len(keys_raw) != len(questions_raw):
        raise ValueError("generated question count does not match the request")
    expected_types = [
        kind for kind in QUESTION_TYPES for _ in range(getattr(config.question_mix, kind))
    ]
    questions: list[dict[str, Any]] = []
    question_by_id: dict[str, dict[str, Any]] = {}
    for index, (question, expected_type) in enumerate(
        zip(questions_raw, expected_types, strict=True)
    ):
        if not isinstance(question, dict) or PRIVATE_QUESTION_FIELDS.intersection(question):
            raise ValueError("public question contains private or invalid data")
        qid = _bounded_string(question.get("id"), "question ID", maximum=200)
        if qid in question_by_id:
            raise ValueError("question IDs must be unique")
        qtype = question.get("type")
        if qtype != expected_type:
            raise ValueError("question types do not match the requested mix")
        points = question.get("points")
        if (
            not isinstance(points, (int, float))
            or isinstance(points, bool)
            or not 0 < points <= 100
        ):
            raise ValueError("question points are invalid")
        public: dict[str, Any] = {
            "id": qid,
            "type": qtype,
            "subject": config.subject_name,
            "learningGoalIds": list(question.get("learningGoalIds") or []),
            "difficulty": config.difficulty,
            "points": float(points),
            "prompt": validate_rich_content(question.get("prompt")),
            "media": [],
            "sources": _source_list(question.get("sources"), allowed_sources),
        }
        if question.get("topic") is not None:
            public["topic"] = _bounded_string(question["topic"], "topic", maximum=240)
        demand = question.get("cognitiveDemand")
        if demand is not None:
            if demand not in {"recall", "understanding", "application", "analysis", "synthesis"}:
                raise ValueError("invalid cognitive demand")
            public["cognitiveDemand"] = demand
        if question.get("stimulus") is not None:
            public["stimulus"] = validate_rich_content(question["stimulus"])
        if qtype == "multiple_choice":
            selection = question.get("selection")
            options = question.get("options")
            if (
                selection not in {"single", "multiple"}
                or not isinstance(options, list)
                or not 2 <= len(options) <= 10
            ):
                raise ValueError("invalid multiple-choice options")
            parsed_options, option_ids = [], set()
            for option in options:
                if not isinstance(option, dict) or set(option) != {"id", "content"}:
                    raise ValueError("invalid option")
                option_id = _bounded_string(option["id"], "option ID", maximum=100)
                if option_id in option_ids:
                    raise ValueError("option IDs must be unique")
                option_ids.add(option_id)
                parsed_options.append(
                    {
                        "id": option_id,
                        "content": validate_rich_content(option["content"], allow_empty=True),
                    }
                )
            public.update({"selection": selection, "options": parsed_options})
        elif qtype == "true_false":
            pass
        elif qtype == "short_answer":
            length = question.get("expectedLength", "phrase")
            if length not in {"word", "phrase", "sentence"}:
                raise ValueError("invalid expected length")
            public["expectedLength"] = length
        elif qtype == "matching":
            for side in ("left", "right"):
                entries = question.get(side)
                if not isinstance(entries, list) or not 2 <= len(entries) <= 20:
                    raise ValueError("invalid matching entries")
                ids: set[str] = set()
                parsed = []
                for entry in entries:
                    if not isinstance(entry, dict) or set(entry) != {"id", "content"}:
                        raise ValueError("invalid matching entry")
                    entry_id = _bounded_string(entry["id"], "matching ID", maximum=100)
                    if entry_id in ids:
                        raise ValueError("matching IDs must be unique")
                    ids.add(entry_id)
                    parsed.append(
                        {
                            "id": entry_id,
                            "content": validate_rich_content(entry["content"], allow_empty=True),
                        }
                    )
                public[side] = parsed
        elif qtype == "essay":
            words = question.get("suggestedWords")
            if words is not None:
                if not isinstance(words, int) or not 1 <= words <= 5_000:
                    raise ValueError("invalid suggested word count")
                public["suggestedWords"] = words
        elif qtype == "calculation":
            public["allowWorkings"] = bool(question.get("allowWorkings", True))
            if question.get("unitHint") is not None:
                public["unitHint"] = _bounded_string(question["unitHint"], "unit hint", maximum=80)
        question_by_id[qid] = public
        questions.append(public)

    keys: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for key in keys_raw:
        if not isinstance(key, dict):
            raise TypeError("invalid answer key")
        qid = _bounded_string(key.get("questionId"), "answer-key question ID", maximum=200)
        if qid in seen_keys or qid not in question_by_id:
            raise ValueError("answer key does not match a unique question")
        seen_keys.add(qid)
        question = question_by_id[qid]
        private: dict[str, Any] = {"questionId": qid}
        qtype = question["type"]
        if qtype == "multiple_choice":
            correct = key.get("correctOptionIds")
            valid = {option["id"] for option in question["options"]}
            if (
                not isinstance(correct, list)
                or not correct
                or len(set(correct)) != len(correct)
                or not set(correct) <= valid
            ):
                raise ValueError("invalid multiple-choice answer key")
            if question["selection"] == "single" and len(correct) != 1:
                raise ValueError("single-choice answer key must contain one option")
            private["correctOptionIds"] = correct
        elif qtype == "true_false":
            if not isinstance(key.get("correctBoolean"), bool):
                raise ValueError("invalid true/false answer key")
            private["correctBoolean"] = key["correctBoolean"]
        elif qtype == "matching":
            pairs = key.get("correctPairs")
            left = {item["id"] for item in question["left"]}
            right = {item["id"] for item in question["right"]}
            if not isinstance(pairs, list) or len(pairs) != len(left):
                raise ValueError("invalid matching answer key")
            normalized = {
                (pair.get("leftId"), pair.get("rightId"))
                for pair in pairs
                if isinstance(pair, dict)
            }
            if (
                len(normalized) != len(left)
                or {pair[0] for pair in normalized} != left
                or not {pair[1] for pair in normalized} <= right
            ):
                raise ValueError("invalid matching pairs")
            private["correctPairs"] = pairs
        elif qtype in {"short_answer", "calculation"}:
            private["canonicalValue"] = _bounded_string(
                key.get("canonicalValue"), "canonical value", maximum=4_000
            )
            if qtype == "calculation":
                tolerance = key.get("tolerance", 0)
                if (
                    not isinstance(tolerance, (int, float))
                    or isinstance(tolerance, bool)
                    or not math.isfinite(float(tolerance))
                    or tolerance < 0
                ):
                    raise ValueError("invalid calculation tolerance")
                private["tolerance"] = float(tolerance)
                private["unit"] = _optional_string(key.get("unit"), "unit", maximum=80)
        elif qtype == "essay":
            rubric = key.get("rubric")
            if not isinstance(rubric, dict) or set(rubric) - {"criteria", "notes"}:
                raise ValueError("invalid essay rubric")
            criteria = rubric.get("criteria")
            if not isinstance(criteria, list) or not criteria or len(criteria) > 20:
                raise ValueError("invalid essay rubric criteria")
            total = 0.0
            parsed_criteria = []
            for criterion in criteria:
                if not isinstance(criterion, dict) or set(criterion) != {
                    "id",
                    "description",
                    "maxPoints",
                }:
                    raise ValueError("invalid rubric criterion")
                maximum = criterion["maxPoints"]
                if (
                    not isinstance(maximum, (int, float))
                    or isinstance(maximum, bool)
                    or maximum <= 0
                ):
                    raise ValueError("invalid rubric points")
                total += float(maximum)
                parsed_criteria.append(criterion)
            if abs(total - float(question["points"])) > 0.001:
                raise ValueError("rubric points must equal question points")
            private["rubric"] = {"criteria": parsed_criteria, "notes": rubric.get("notes")}
        if key.get("modelAnswer") is not None:
            private["modelAnswer"] = validate_rich_content(key["modelAnswer"])
        keys.append(private)
    if seen_keys != set(question_by_id):
        raise ValueError("every question requires one private answer key")
    if sum(float(question["points"]) for question in questions) > 500:
        raise ValueError("assessment total points exceed the limit")
    return questions, keys


def validate_student_answers(
    answers: list[dict[str, Any]], questions: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Validate answer IDs, types, option membership, size, and uniqueness."""

    question_by_id = {question["id"]: question for question in questions}
    parsed: list[dict[str, Any]] = []
    seen: set[str] = set()
    for answer in answers:
        if not isinstance(answer, dict):
            raise TypeError("invalid answer")
        qid = _bounded_string(answer.get("questionId"), "answer question ID", maximum=200)
        if qid in seen or qid not in question_by_id:
            raise ValueError("answer does not match a unique question")
        seen.add(qid)
        question = question_by_id[qid]
        if answer.get("type") != question["type"] or len(canonical_json(answer)) > 50_000:
            raise ValueError("answer type or size is invalid")
        qtype = question["type"]
        if qtype == "multiple_choice":
            selected = answer.get("selectedOptionIds")
            eliminated = answer.get("eliminatedOptionIds", [])
            valid = {option["id"] for option in question["options"]}
            if (
                not isinstance(selected, list)
                or not isinstance(eliminated, list)
                or len(set(selected)) != len(selected)
                or not set(selected) <= valid
                or not set(eliminated) <= valid
            ):
                raise ValueError("invalid multiple-choice answer")
            if question["selection"] == "single" and len(selected) > 1:
                raise ValueError("single-choice answer contains multiple options")
        elif qtype == "true_false" and answer.get("value") not in {True, False, None}:
            raise ValueError("invalid true/false answer")
        elif qtype in {"short_answer", "essay"}:
            if not isinstance(answer.get("text"), str) or len(answer["text"]) > 20_000:
                raise ValueError("invalid text answer")
        elif qtype == "matching":
            pairs = answer.get("pairs")
            if not isinstance(pairs, list) or len(pairs) > len(question["left"]):
                raise ValueError("invalid matching answer")
        elif qtype == "calculation":
            if not isinstance(answer.get("latex"), str) or len(answer["latex"]) > 4_000:
                raise ValueError("invalid calculation answer")
        parsed.append(answer)
    return parsed
