from __future__ import annotations

from collections import defaultdict

from .models import CompiledContext, ContextItem, ContextType, QueryContext
from .tokenization import TokenCounter

BASE_SYSTEM_CONTEXT = """You are Alim, a careful tutor for a Swiss Gymnasium student.
Teach at the student's level and in the requested language. Use retrieved course material when it
is available, distinguish it from general knowledge, and never invent a source. Address known
misconceptions constructively without exposing private internal metadata. Follow the current task
and safety instructions above all optional context."""


class ContextCompiler:
    def __init__(self, counter: TokenCounter, system_context: str = BASE_SYSTEM_CONTEXT) -> None:
        self.counter = counter
        self.system_context = system_context

    def compile(
        self,
        *,
        query_context: QueryContext,
        user_message: str,
        items: list[ContextItem],
        debug: dict,
    ) -> CompiledContext:
        grouped: dict[ContextType, list[ContextItem]] = defaultdict(list)
        for item in items:
            grouped[item.type].append(item)

        student_context = self._student_context(query_context, grouped[ContextType.STUDENT_MEMORY])
        conversation_context = self._plain_block(grouped[ContextType.CONVERSATION])
        syllabus_context = grouped[ContextType.SYLLABUS]
        knowledge_context = grouped[ContextType.KNOWLEDGE]
        episodes = grouped[ContextType.EPISODE]
        artifacts = grouped[ContextType.ARTIFACT]
        working = grouped[ContextType.WORKING_MEMORY]

        blocks = [
            self._section("STUDENT STATE", student_context),
            self._section("CONVERSATION MEMORY", conversation_context),
            self._section("RELEVANT LEARNING EVENTS", self._plain_block(episodes)),
            self._section("CURRENT SYLLABUS", self._source_block(syllabus_context)),
            self._section("RELEVANT COURSE MATERIAL", self._source_block(knowledge_context)),
            self._section("RELEVANT ARTIFACTS", self._plain_block(artifacts)),
            self._section("ACTIVE TASK STATE", self._plain_block(working)),
        ]
        supplemental = "\n\n".join(block for block in blocks if block)
        system_prompt = self.system_context + ("\n\n" + supplemental if supplemental else "")
        prompt_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        total = sum(self.counter.count(message["content"]) for message in prompt_messages)
        debug["compiled_total_tokens"] = total
        return CompiledContext(
            system_context=self.system_context,
            student_context=student_context,
            conversation_context=conversation_context,
            retrieved_knowledge=knowledge_context,
            episodic_context=episodes,
            working_context=working,
            syllabus_context=syllabus_context,
            artifact_context=artifacts,
            total_tokens=total,
            retrieval_debug=debug,
            prompt_messages=prompt_messages,
        )

    @staticmethod
    def _student_context(query: QueryContext, memories: list[ContextItem]) -> str:
        lines = []
        if query.subject:
            lines.append(f"Current subject: {query.subject}")
        if query.topics:
            lines.append(f"Current topic(s): {', '.join(query.topics)}")
        if query.language:
            language = {"de": "German", "en": "English", "fr": "simple French (CEFR B1)"}.get(
                query.language, query.language
            )
            lines.append(f"Response language: {language}")
        for memory in memories:
            label = str(memory.metadata.get("memory_type", "student memory")).replace("_", " ")
            if label == "misconception":
                label = "known misconception"
            lines.append(f"{label.title()}: {memory.content}")
        return "\n".join(lines)

    @staticmethod
    def _plain_block(items: list[ContextItem]) -> str:
        return "\n".join(f"- {item.content}" for item in items)

    @staticmethod
    def _source_block(items: list[ContextItem]) -> str:
        entries: list[str] = []
        for index, item in enumerate(items, start=1):
            provenance = item.metadata
            labels = [
                str(provenance[key])
                for key in ("title", "chapter", "section")
                if provenance.get(key)
            ]
            if provenance.get("page") is not None:
                labels.append(f"page {provenance['page']}")
            source = ", ".join(labels) or item.source or "source metadata unavailable"
            entries.append(f"[Source {index}: {source}]\n{item.content}")
        return "\n\n".join(entries)

    @staticmethod
    def _section(title: str, content: str) -> str:
        return f"{title}\n{content}" if content else ""
