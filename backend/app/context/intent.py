from __future__ import annotations

import re

from .models import QueryContext
from .text import unique_preserving_order

SUBJECT_ALIASES: dict[str, tuple[str, ...]] = {
    "mathematics": ("mathematics", "math", "mathe", "mathematik", "algebra", "calculus"),
    "physics": ("physics", "physik", "mechanics", "kinematics"),
    "english": ("english", "englisch"),
    "history": ("history", "geschichte", "cold war"),
    "french": ("french", "français", "francais", "französisch"),
    "german": ("german", "deutsch"),
    "biology": (
        "biology",
        "biologie",
        "meiosis",
        "mitosis",
        "cellular respiration",
        "glycolysis",
        "glykolyse",
        "oxidative phosphorylation",
        "oxidative phosphorylierung",
    ),
    "chemistry": ("chemistry", "chemie", "enthalpy", "reaktionsenthalpie"),
    "spf": ("spf biology", "spf chemistry", "spf biologie", "spf chemie"),
    "philosophy": ("philosophy", "philosophie"),
    "political_education": ("political education", "politische bildung"),
    "pedagogics_psychology": ("pedagogics", "psychology", "pädagogik", "psychologie"),
    "economics": ("economics", "wirtschaft"),
    "art": ("art", "kunst"),
    "sport": ("sport",),
}

TOPIC_PATTERNS: dict[str, tuple[str, ...]] = {
    "cellular_respiration": (
        "cellular respiration",
        "zellatmung",
        "glycolysis",
        "glykolyse",
        "krebs cycle",
        "citratzyklus",
        "oxidative phosphorylation",
        "oxidative phosphorylierung",
        "atp",
    ),
    "meiosis": ("meiosis", "meiose", "homologous chromosome", "chromosome number"),
    "mitosis": ("mitosis", "mitose"),
    "kinetics": ("kinetics", "kinetik", "activation energy", "aktivierungsenergie"),
    "cold_war": ("cold war", "kalter krieg"),
    "integrals": ("integral", "integration by parts", "partielle integration"),
}


class HeuristicQueryAnalyzer:
    def analyze(
        self,
        message: str,
        *,
        subject_hint: str | None = None,
        language_hint: str | None = None,
    ) -> QueryContext:
        normalized = message.casefold()
        subject = subject_hint or self._match_alias(normalized, SUBJECT_ALIASES)
        topics = unique_preserving_order(
            topic
            for topic, aliases in TOPIC_PATTERNS.items()
            if any(alias in normalized for alias in aliases)
        )

        intent = "concept_explanation"
        output: str | None = "explanation"
        if re.search(r"\b(mock exam|probeprüfung|examen blanc)\b", normalized):
            intent, output = "exam_generation", "mock_exam"
        elif re.search(r"\b(grade|mark|bewerte|korrigiere|corrige)\b", normalized):
            intent, output = "exam_grading", "grading"
        elif re.search(r"\b(quiz|questions? me|teste mich)\b", normalized):
            intent, output = "quiz_generation", "quiz"
        elif re.search(r"\b(study plan|study schedule|lernplan|révision)\b", normalized):
            intent, output = "study_planning", "study_plan"
        elif re.search(
            r"\b(progress|strengths?|weaknesses?|struggle|fortschritt|schwächen)\b", normalized
        ):
            intent, output = "progress_review", "progress_summary"
        elif re.search(
            r"\b(document|notes?|textbook|syllabus|chapter|section|page|skript|lehrplan)\b",
            normalized,
        ):
            intent, output = "document_question", "answer"
        elif re.search(r"\b(homework|hausaufgabe|exercise|aufgabe)\b", normalized):
            intent, output = "homework_help", "guided_solution"
        elif re.search(r"^(what|when|where|who|define|was|wann|wo|qui|que)\b", normalized):
            intent, output = "factual_lookup", "short_answer"
        elif re.search(r"^(and |but |what about|also |und |aber )", normalized):
            intent, output = "follow_up", "answer"
        elif re.search(
            r"\b(hello|hi|hey|thanks|thank you|hallo|danke|bonjour|merci)\b", normalized
        ):
            intent, output = "general_chat", None

        requires_documents = intent in {
            "concept_explanation",
            "factual_lookup",
            "document_question",
            "homework_help",
            "quiz_generation",
            "exam_generation",
            "exam_grading",
            "follow_up",
        }
        requires_student = intent in {
            "concept_explanation",
            "homework_help",
            "quiz_generation",
            "exam_generation",
            "exam_grading",
            "study_planning",
            "progress_review",
            "follow_up",
        }
        requires_episodes = intent in {"exam_grading", "study_planning", "progress_review"}
        requires_syllabus = intent in {
            "document_question",
            "quiz_generation",
            "exam_generation",
            "study_planning",
        } and bool(
            re.search(r"syllabus|lehrplan|learning goal|lernziel|chapter|kapitel", normalized)
            or intent in {"exam_generation", "study_planning"}
        )
        language = language_hint or self._language_for_subject(subject)
        return QueryContext(
            intent=intent,
            subject=subject,
            topics=topics,
            language=language,
            requires_documents=requires_documents,
            requires_student_memory=requires_student,
            requires_episode_memory=requires_episodes,
            requires_conversation_history=intent != "general_chat",
            requires_syllabus=requires_syllabus,
            desired_output_type=output,
        )

    @staticmethod
    def _match_alias(text: str, aliases_by_key: dict[str, tuple[str, ...]]) -> str | None:
        matches = [
            (len(alias), key)
            for key, aliases in aliases_by_key.items()
            for alias in aliases
            if alias in text
        ]
        return max(matches, default=(0, None))[1]

    @staticmethod
    def _language_for_subject(subject: str | None) -> str | None:
        if subject in {"mathematics", "physics", "english", "history"}:
            return "en"
        if subject == "french":
            return "fr"
        if subject:
            return "de"
        return None
