from __future__ import annotations

import unittest

from app.context.config import (
    ContextBudgetConfig,
    ContextConfig,
    ConversationConfig,
    MemoryConfig,
    RetrievalConfig,
)
from app.context.manager import ContextManager
from app.context.models import DocumentChunk, ModelConfig, StudentMemory
from app.context.store import SQLiteContextStore
from app.context.tokenization import ApproximateTokenCounter


def make_config() -> ContextConfig:
    return ContextConfig(
        budget=ContextBudgetConfig(
            max_context_tokens=2_400,
            reserve_output_tokens=500,
            system_tokens=300,
            recent_chat_tokens=450,
            summary_tokens=300,
            memory_tokens=300,
            knowledge_tokens=650,
            syllabus_tokens=300,
            episode_tokens=300,
            artifact_tokens=200,
            working_memory_tokens=250,
        ),
        retrieval=RetrievalConfig(
            candidate_limit=20,
            dense_limit=10,
            sparse_limit=10,
            fused_limit=8,
            rerank_limit=5,
            memory_limit=4,
            episode_limit=4,
            artifact_limit=2,
            minimum_relevance=0.01,
        ),
        conversation=ConversationConfig(
            recent_message_count=4,
            retrieved_message_count=2,
            summary_message_threshold=6,
            summary_token_threshold=500,
        ),
        memory=MemoryConfig(mastery_evidence_threshold=2),
    )


class ContextFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.store = SQLiteContextStore()
        self.manager = ContextManager(make_config(), store=self.store)
        self.counter = ApproximateTokenCounter()

    async def asyncTearDown(self) -> None:
        self.store.close()

    def add_chunk(
        self,
        chunk_id: str,
        content: str,
        *,
        subject: str,
        document_type: str = "textbook",
        topic: str | None = None,
        chapter: str | None = None,
    ) -> None:
        self.store.add_chunks(
            [
                DocumentChunk(
                    id=chunk_id,
                    document_id=f"doc-{chunk_id}",
                    title=f"{subject.title()} Notes",
                    content=content,
                    subject=subject,
                    document_type=document_type,
                    topic=topic,
                    chapter=chapter,
                    page=3,
                    token_count=self.counter.count(content),
                )
            ]
        )

    async def test_biology_explanation_retrieves_source_and_misconception_only(self) -> None:
        self.add_chunk(
            "bio-respiration",
            "Oxidative phosphorylation uses a proton gradient and electron transport chain to produce substantially more ATP than glycolysis.",
            subject="biology",
            topic="cellular_respiration",
        )
        self.add_chunk(
            "chem-unrelated",
            "Activation energy and reaction enthalpy describe different chemical energy quantities.",
            subject="chemistry",
            topic="kinetics",
        )
        self.store.upsert_memory(
            StudentMemory(
                id="memory-1",
                student_id="student",
                memory_type="misconception",
                subject="biology",
                topic="cellular_respiration",
                content="Student confuses glycolysis with the Krebs cycle.",
                confidence=0.9,
                importance=0.9,
                evidence=["quiz-1", "quiz-2"],
                evidence_count=2,
            )
        )
        compiled = await self.manager.build_context(
            student_id="student",
            conversation_id="thread",
            user_message="Why does oxidative phosphorylation produce more ATP than glycolysis?",
            model_config=ModelConfig(model="test"),
        )
        self.assertEqual([item.id for item in compiled.retrieved_knowledge], ["bio-respiration"])
        self.assertIn("Known", compiled.prompt_messages[0]["content"])
        self.assertNotIn("Activation energy", compiled.prompt_messages[0]["content"])
        self.assertLessEqual(compiled.total_tokens, 1_900)

    async def test_progress_review_uses_episode_without_documents(self) -> None:
        self.add_chunk(
            "biology-textbook",
            "A long generic biology textbook explanation.",
            subject="biology",
        )
        self.manager.record_event(
            student_id="student",
            event={
                "event_type": "exam_result",
                "subject": "biology",
                "topic": "meiosis",
                "content": "Scored 2/5 on meiosis and confused homologous chromosomes with chromatids.",
                "importance": 0.9,
            },
        )
        compiled = await self.manager.build_context(
            student_id="student",
            conversation_id="thread",
            user_message="What did I struggle with in the last biology exam?",
            model_config=ModelConfig(model="test"),
        )
        self.assertEqual(compiled.retrieved_knowledge, [])
        self.assertEqual(len(compiled.episodic_context), 1)
        self.assertIn("2/5", compiled.episodic_context[0].content)

    async def test_mock_exam_prefers_syllabus_and_selected_chapters(self) -> None:
        self.add_chunk(
            "syllabus",
            "Teacher syllabus chapters 3 4 5: meiosis, inheritance and cellular respiration objectives.",
            subject="biology",
            document_type="syllabus",
            chapter="3-5",
        )
        self.add_chunk(
            "chapter-four",
            "Chapter 4 explains meiosis and reduction of chromosome number.",
            subject="biology",
            chapter="4",
        )
        compiled = await self.manager.build_context(
            student_id="student",
            conversation_id="thread",
            subject="biology",
            user_message="Generate a mock exam using chapters 3-5 and my teacher's syllabus.",
            model_config=ModelConfig(model="test"),
        )
        self.assertTrue(compiled.syllabus_context)
        self.assertEqual(compiled.syllabus_context[0].id, "syllabus")
        self.assertTrue(compiled.retrieved_knowledge)

    async def test_long_conversation_compacts_without_deleting_originals(self) -> None:
        for index in range(12):
            self.manager.conversations.append(
                student_id="student",
                conversation_id="long-thread",
                role="user" if index % 2 == 0 else "assistant",
                content=f"Message {index} about meiosis chromosome separation and the unresolved learning task.",
            )
        summary = await self.manager.conversations.compact_if_needed("student", "long-thread")
        self.assertIsNotNone(summary)
        self.assertEqual(len(self.store.list_messages("student", "long-thread")), 12)
        items, debug = self.manager.conversations.retrieve(
            "student", "long-thread", "meiosis chromosome"
        )
        self.assertEqual(debug["recent_messages"], 4)
        self.assertEqual(debug["conversation_summaries"], 1)
        self.assertTrue(any(item.metadata.get("kind") == "summary" for item in items))


if __name__ == "__main__":
    unittest.main()
