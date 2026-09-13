from __future__ import annotations

import unittest
from unittest.mock import patch

from app.context.artifacts import ArtifactManager
from app.context.budget import ContextBudgeter
from app.context.config import ContextBudgetConfig, MemoryConfig
from app.context.intent import HeuristicQueryAnalyzer
from app.context.memory import StudentMemoryManager
from app.context.models import ContextItem, ContextPriority, ContextType, ModelConfig
from app.context.retrieval.dense import OpenAICompatibleEmbedder
from app.context.retrieval.hybrid import deduplicate_items, reciprocal_rank_fusion
from app.context.store import SQLiteContextStore
from app.context.tokenization import ApproximateTokenCounter


class BudgetTests(unittest.TestCase):
    def test_trims_low_priority_before_high_priority(self) -> None:
        config = ContextBudgetConfig(
            max_context_tokens=500,
            reserve_output_tokens=100,
            knowledge_tokens=500,
            memory_tokens=500,
            recent_chat_tokens=500,
        )
        items = [
            ContextItem(
                id="critical",
                type=ContextType.WORKING_MEMORY,
                content="critical",
                token_count=80,
                priority=ContextPriority.P0,
            ),
            ContextItem(
                id="high",
                type=ContextType.KNOWLEDGE,
                content="high",
                token_count=140,
                priority=ContextPriority.P1,
                relevance_score=0.9,
            ),
            ContextItem(
                id="low",
                type=ContextType.CONVERSATION,
                content="low",
                token_count=140,
                priority=ContextPriority.P3,
                relevance_score=0.2,
            ),
        ]
        result = ContextBudgeter(config).apply(
            items, fixed_tokens=100, model_config=ModelConfig(model="test")
        )
        self.assertEqual({item.id for item in result.kept}, {"critical", "high"})
        self.assertEqual([item.id for item in result.removed], ["low"])
        self.assertLessEqual(result.used_tokens, result.input_limit)


class RetrievalTests(unittest.TestCase):
    @staticmethod
    def item(item_id: str, content: str) -> ContextItem:
        return ContextItem(
            id=item_id,
            type=ContextType.KNOWLEDGE,
            content=content,
            token_count=5,
        )

    def test_reciprocal_rank_fusion_rewards_items_in_both_lists(self) -> None:
        a, b, c = self.item("a", "a"), self.item("b", "b"), self.item("c", "c")
        result = reciprocal_rank_fusion([[a, b], [c, b]], k=10, limit=3)
        self.assertEqual(result[0].id, "b")

    def test_deduplicates_by_id_and_overlapping_document_content(self) -> None:
        first = self.item("one", "oxidative phosphorylation creates ATP using a proton gradient")
        first.metadata["document_id"] = "doc-1"
        repeated = self.item("two", "oxidative phosphorylation creates ATP using a proton gradient")
        repeated.metadata["document_id"] = "doc-1"
        distinct = self.item("three", "glycolysis occurs in the cytosol")
        distinct.metadata["document_id"] = "doc-1"
        self.assertEqual(
            [item.id for item in deduplicate_items([first, repeated, distinct])], ["one", "three"]
        )

    def test_openai_compatible_embedding_adapter_parses_vector(self) -> None:
        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            @staticmethod
            def read() -> bytes:
                return b'{"data":[{"embedding":[0.25,-0.5,0.75]}]}'

        embedder = OpenAICompatibleEmbedder(
            base_url="http://127.0.0.1:11434/v1", model="local-embedding"
        )
        with patch("app.context.retrieval.dense.urllib.request.urlopen", return_value=Response()):
            vector = embedder._embed_sync("oxidative phosphorylation")
        self.assertEqual(vector, [0.25, -0.5, 0.75])


class IntentTests(unittest.TestCase):
    def test_biology_explanation(self) -> None:
        query = HeuristicQueryAnalyzer().analyze(
            "Why does oxidative phosphorylation produce more ATP than glycolysis?"
        )
        self.assertEqual(query.intent, "concept_explanation")
        self.assertEqual(query.subject, "biology")
        self.assertIn("cellular_respiration", query.topics)
        self.assertTrue(query.requires_documents)

    def test_progress_review_avoids_textbook_retrieval(self) -> None:
        query = HeuristicQueryAnalyzer().analyze(
            "What did I struggle with in the last biology exam?"
        )
        self.assertEqual(query.intent, "progress_review")
        self.assertFalse(query.requires_documents)
        self.assertTrue(query.requires_episode_memory)


class MemoryAndArtifactTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = SQLiteContextStore()
        self.counter = ApproximateTokenCounter()

    def tearDown(self) -> None:
        self.store.close()

    def test_controlled_memory_writer_rejects_casual_and_weak_evidence(self) -> None:
        manager = StudentMemoryManager(
            self.store,
            self.counter,
            MemoryConfig(
                minimum_confidence=0.65,
                minimum_importance=0.4,
                mastery_evidence_threshold=2,
            ),
        )
        casual = manager.process_interaction(
            student_id="s1", user_message="Thanks!", subject="biology", topic="meiosis"
        )
        weak = manager.process_interaction(
            student_id="s1",
            user_message="I guessed this answer",
            subject="biology",
            topic="meiosis",
            metadata={
                "memory_candidates": [
                    {
                        "memory_type": "mastery",
                        "content": "Student mastered meiosis",
                        "confidence": 0.9,
                        "importance": 0.8,
                        "evidence_count": 1,
                    }
                ]
            },
        )
        explicit = manager.process_interaction(
            student_id="s1",
            user_message="I prefer diagrams before equations",
            subject="biology",
            topic=None,
        )
        self.assertEqual(casual, [])
        self.assertEqual(weak, [])
        self.assertEqual(len(explicit), 1)
        self.assertEqual(explicit[0].memory_type, "learning_preference")

    def test_artifact_stores_full_content_but_retrieves_summary(self) -> None:
        manager = ArtifactManager(self.store, self.counter)
        artifact = manager.create(
            artifact_type="exam_analysis",
            title="Biology exam analysis",
            summary="42 relevant questions across 17 objectives.",
            content="meiosis question details " * 100,
            student_id="s1",
        )
        items = manager.retrieve("s1", "meiosis exam questions", limit=2)
        self.assertEqual(items[0].id, artifact.id)
        self.assertNotIn("question details question details", items[0].content)
        self.assertGreater(artifact.token_count, items[0].token_count)


if __name__ == "__main__":
    unittest.main()
