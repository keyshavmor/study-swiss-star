"""Focused unit tests for budgeting, retrieval, intent, memory, and artifacts."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.context.artifacts import ArtifactManager
from app.context.budget import ContextBudgeter
from app.context.config import ContextBudgetConfig, MemoryConfig, WebConfig
from app.context.intent import HeuristicQueryAnalyzer
from app.context.memory import StudentMemoryManager
from app.context.models import ContextItem, ContextPriority, ContextType, ModelConfig
from app.context.retrieval.dense import OpenAICompatibleEmbedder
from app.context.retrieval.hybrid import deduplicate_items, reciprocal_rank_fusion
from app.context.store import SQLiteContextStore
from app.context.tokenization import ApproximateTokenCounter
from app.context.web import (
    LocalCorpusSearchClient,
    LocalFirstSearchClient,
    WebResult,
    WikipediaSearchClient,
    compact_web_query,
    create_web_search_client,
)


class BudgetTests(unittest.TestCase):
    """Verify strict priority and global input-limit behavior."""

    def test_trims_low_priority_before_high_priority(self) -> None:
        """Global trimming removes P3 context before higher-priority items."""

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
    """Verify fusion, deduplication, and embedding adapters."""

    @staticmethod
    def item(item_id: str, content: str) -> ContextItem:
        """Build a minimal knowledge item for ranking tests."""

        return ContextItem(
            id=item_id,
            type=ContextType.KNOWLEDGE,
            content=content,
            token_count=5,
        )

    def test_reciprocal_rank_fusion_rewards_items_in_both_lists(self) -> None:
        """An item present in both rankings receives the highest fused score."""

        a, b, c = self.item("a", "a"), self.item("b", "b"), self.item("c", "c")
        result = reciprocal_rank_fusion([[a, b], [c, b]], k=10, limit=3)
        self.assertEqual(result[0].id, "b")

    def test_web_search_removes_prompt_filler_and_keeps_topic(self) -> None:
        """Web searches retain the named topic instead of UI instructions."""

        query = (
            "Browse the internet and explain the current educational role of "
            "Large Hadron Collider in one sentence"
        )
        self.assertEqual(compact_web_query(query), "Large Hadron Collider")

    def test_deduplicates_by_id_and_overlapping_document_content(self) -> None:
        """Overlapping chunks from one document are collapsed deterministically."""

        first = self.item(
            "one", "oxidative phosphorylation creates ATP using a proton gradient"
        )
        first.metadata["document_id"] = "doc-1"
        repeated = self.item(
            "two", "oxidative phosphorylation creates ATP using a proton gradient"
        )
        repeated.metadata["document_id"] = "doc-1"
        distinct = self.item("three", "glycolysis occurs in the cytosol")
        distinct.metadata["document_id"] = "doc-1"
        self.assertEqual(
            [item.id for item in deduplicate_items([first, repeated, distinct])],
            ["one", "three"],
        )

    def test_openai_compatible_embedding_adapter_parses_vector(self) -> None:
        """The local embedding adapter validates and returns numeric vectors."""

        class Response:
            """Provide the context-manager surface returned by urlopen."""

            def __enter__(self):
                """Return this fake response when entering the request context."""

                return self

            def __exit__(self, *_args):
                """Do not suppress exceptions from the request context."""

                return False

            @staticmethod
            def read() -> bytes:
                """Return a minimal OpenAI-compatible embedding payload."""

                return b'{"data":[{"embedding":[0.25,-0.5,0.75]}]}'

        embedder = OpenAICompatibleEmbedder(
            base_url="http://127.0.0.1:8000/v1", model="local-embedding"
        )
        with patch(
            "app.context.retrieval.dense.urllib.request.urlopen",
            return_value=Response(),
        ):
            vector = embedder._embed_sync("oxidative phosphorylation")
        self.assertEqual(vector, [0.25, -0.5, 0.75])


class LocalReferenceTests(unittest.IsolatedAsyncioTestCase):
    """Verify local-only and automatic local-first reference behavior."""

    async def test_local_corpus_searches_markdown_and_html_without_network(
        self,
    ) -> None:
        """Relevant offline snapshots produce provenance-labelled local results."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "biology.md").write_text(
                "# Cellular respiration\nATP synthase uses a proton gradient to create ATP.",
                encoding="utf-8",
            )
            (root / "history.html").write_text(
                "<html><style>ignore me</style><body>Industrial revolution overview</body></html>",
                encoding="utf-8",
            )
            config = WebConfig(provider="local", local_corpus_path=root, max_results=2)
            client = create_web_search_client(config)
            self.assertIsInstance(client, LocalCorpusSearchClient)
            with patch(
                "app.context.web.urllib.request.urlopen",
                side_effect=AssertionError("local provider must not open the network"),
            ):
                results = await client.search("Explain ATP synthase", limit=2)
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].title, "Cellular respiration")
            self.assertEqual(results[0].url, "local://biology.md")
            self.assertEqual(results[0].provider, "Local corpus")

    def test_unknown_reference_provider_fails_closed(self) -> None:
        """A misspelled provider must not silently fall back to an internet service."""

        with tempfile.TemporaryDirectory() as directory:
            config = WebConfig(provider="unknown", local_corpus_path=Path(directory))
            with self.assertRaisesRegex(ValueError, "Unsupported ALIM_WEB_PROVIDER"):
                create_web_search_client(config)

    async def test_auto_provider_uses_local_match_without_network(self) -> None:
        """Automatic mode must not disclose a query when local evidence is available."""

        with tempfile.TemporaryDirectory() as directory:
            corpus = Path(directory)
            (corpus / "biology.md").write_text(
                "ATP powers cellular work.", encoding="utf-8"
            )
            client = LocalFirstSearchClient(
                WebConfig(provider="auto", local_corpus_path=corpus)
            )
            with patch.object(
                WikipediaSearchClient,
                "search",
                side_effect=AssertionError("network fallback must not run"),
            ):
                results = await client.search("ATP", limit=2)
            self.assertEqual(results[0].provider, "Local corpus")

    async def test_auto_provider_falls_back_when_local_material_is_missing(
        self,
    ) -> None:
        """Automatic mode fetches remote evidence only after an empty local search."""

        remote = WebResult(
            title="Remote ATP",
            url="https://example.test/atp",
            content="Current ATP reference",
            provider="Test internet",
            fetched_at="2026-09-14T00:00:00+00:00",
        )
        with tempfile.TemporaryDirectory() as directory:
            client = LocalFirstSearchClient(
                WebConfig(provider="auto", local_corpus_path=Path(directory))
            )
            with patch.object(
                WikipediaSearchClient, "search", return_value=[remote]
            ) as remote_search:
                results = await client.search("ATP", limit=2)
            remote_search.assert_awaited_once_with("ATP", limit=2)
            self.assertEqual(results, [remote])


class IntentTests(unittest.TestCase):
    """Verify representative tutoring intents select the expected context sources."""

    def test_biology_explanation(self) -> None:
        """A biology why-question requests relevant course documents."""

        query = HeuristicQueryAnalyzer().analyze(
            "Why does oxidative phosphorylation produce more ATP than glycolysis?"
        )
        self.assertEqual(query.intent, "concept_explanation")
        self.assertEqual(query.subject, "biology")
        self.assertIn("cellular_respiration", query.topics)
        self.assertTrue(query.requires_documents)

    def test_progress_review_avoids_textbook_retrieval(self) -> None:
        """A progress review uses learner history without textbook retrieval."""

        query = HeuristicQueryAnalyzer().analyze(
            "What did I struggle with in the last biology exam?"
        )
        self.assertEqual(query.intent, "progress_review")
        self.assertFalse(query.requires_documents)
        self.assertTrue(query.requires_episode_memory)


class MemoryAndArtifactTests(unittest.TestCase):
    """Verify evidence gates and compact artifact injection."""

    def setUp(self) -> None:
        """Create isolated in-memory storage for each memory test."""

        self.store = SQLiteContextStore()
        self.counter = ApproximateTokenCounter()

    def tearDown(self) -> None:
        """Close isolated storage after each memory test."""

        self.store.close()

    def test_controlled_memory_writer_rejects_casual_and_weak_evidence(self) -> None:
        """Only explicit or adequately supported facts become durable memory."""

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
        """Full artifacts persist while only bounded summaries enter context."""

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
