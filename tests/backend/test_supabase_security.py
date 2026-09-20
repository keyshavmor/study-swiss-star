"""Fast checks for the request-scoped adapter and migration security invariants."""

from __future__ import annotations

import unittest
from pathlib import Path

from app.assessment.supabase import SupabaseAssessmentStore
from app.context.models import ConversationMessage, DocumentChunk
from app.context.store_supabase import SupabaseContextStore

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260914131010_canonical_user_backend.sql"


class CapturingStore(SupabaseContextStore):
    """Capture REST filters without making network requests."""

    def __init__(self, user_id: str) -> None:
        super().__init__("https://project.supabase.co", "publishable", "token", user_id)
        self.requests: list[tuple[str, str, dict | None, object, str | None]] = []

    def _request(self, method, table, *, query=None, body=None, prefer=None):
        self.requests.append((method, table, query, body, prefer))
        return []


class CapturingAssessmentStore(SupabaseAssessmentStore):
    """Capture assessment writes and emulate the required post-write verification read."""

    def __init__(self, user_id: str) -> None:
        super().__init__("https://project.supabase.co", "publishable", "token", user_id)
        self.requests: list[tuple[str, str, dict | None, object, str | None]] = []
        self.persisted: dict[str, object] | None = None

    def _request(self, method, table, *, query=None, body=None, prefer=None):
        self.requests.append((method, table, query, body, prefer))
        if method == "POST" and table in {"quizzes", "mock_exams"}:
            self.persisted = body[0]
            return None
        if method == "GET" and self.persisted:
            return [
                {
                    "id": self.persisted["id"],
                    "questions": self.persisted["questions"],
                    "model_used": self.persisted["model_used"],
                }
            ]
        return []


class SupabaseSecurityTests(unittest.TestCase):
    def test_store_rejects_a_request_for_b_before_rest(self) -> None:
        store = CapturingStore("user-a")
        with self.assertRaises(PermissionError):
            store.list_chunks(student_id="user-b")
        self.assertEqual(store.requests, [])

    def test_every_store_read_adds_the_verified_user_filter(self) -> None:
        store = CapturingStore("user-a")
        store.list_chunks(student_id="user-a")
        store.list_messages("user-a", "thread-a")
        self.assertTrue(store.requests)
        for method, _table, query, _body, _prefer in store.requests:
            if method == "GET":
                self.assertEqual(query["user_id"], "eq.user-a")

    def test_thread_ownership_and_message_upsert_keep_rls_scope_and_parts(self) -> None:
        store = CapturingStore("user-a")
        self.assertFalse(store.conversation_owned("user-a", "thread-a"))
        method, table, query, _body, _prefer = store.requests[-1]
        self.assertEqual((method, table), ("GET", "threads"))
        self.assertEqual(query["user_id"], "eq.user-a")
        self.assertEqual(query["id"], "eq.thread-a")

        store.add_message(
            ConversationMessage(
                id="message-a",
                conversation_id="thread-a",
                student_id="user-a",
                role="assistant",
                content="Grounded answer",
                token_count=3,
            )
        )
        _method, table, _query, body, prefer = store.requests[-1]
        self.assertEqual(table, "messages")
        self.assertEqual(prefer, "resolution=ignore-duplicates,return=minimal")
        self.assertEqual(body[0]["parts"], [{"type": "text", "text": "Grounded answer"}])
        self.assertNotIn("created_at", body[0])

    def test_chunk_upsert_matches_live_jsonb_embedding_contract(self) -> None:
        store = CapturingStore("user-a")
        store.add_chunks(
            [
                DocumentChunk(
                    id="chunk-a",
                    document_id="document-a",
                    content="ATP stores transferable chemical energy.",
                    title="Biology notes",
                    subject="biology",
                    page=1,
                    token_count=7,
                    embedding=[0.125, -0.25, 0.5],
                    metadata={"storage_path": "user-a/biology-notes.pdf"},
                )
            ],
            student_id="user-a",
        )
        by_table = {
            table: body for _method, table, _query, body, _prefer in store.requests
        }
        document = by_table["documents"][0]
        chunk = by_table["document_chunks"][0]
        self.assertEqual(document["user_id"], "user-a")
        self.assertEqual(document["storage_bucket"], "user-materials")
        self.assertEqual(chunk["user_id"], "user-a")
        self.assertEqual(chunk["document_id"], "document-a")
        self.assertEqual(chunk["embedding"], [0.125, -0.25, 0.5])
        self.assertIsInstance(chunk["embedding"], list)

    def test_assessment_public_write_is_owner_scoped_verified_and_key_free(self) -> None:
        store = CapturingAssessmentStore("user-a")
        questions = [
            {
                "id": "question-a",
                "type": "true_false",
                "subject": "Biology",
                "difficulty": "medium",
                "points": 1,
                "prompt": [{"kind": "prose", "text": "Cells contain DNA."}],
                "media": [],
                "sources": [{"id": "source-a", "label": "Notes", "type": "document"}],
            }
        ]
        job = {
            "id": "quiz-a",
            "attempt_id": "attempt-a",
            "user_id": "user-a",
            "model_id": "Qwen/Qwen3.8-27B",
            "model_used": "Qwen/Qwen3.8-27B",
            "answer_keys": [{"questionId": "question-a", "correctBoolean": True}],
            "config": {
                "kind": "quiz",
                "subjectName": "Biology",
                "component": None,
                "topic": None,
                "academicYear": None,
                "selectedMaterialIds": ["not-a-database-uuid"],
                "difficulty": "medium",
                "language": "German",
            },
        }
        store.save_generated(job=job, questions=questions)
        method, table, _query, body, _prefer = store.requests[0]
        self.assertEqual((method, table), ("POST", "quizzes"))
        self.assertEqual(body[0]["user_id"], "user-a")
        self.assertEqual(body[0]["questions"], questions)
        self.assertEqual(body[0]["source_document_ids"], [])
        self.assertNotIn("answer_keys", body[0])
        verify = store.requests[1]
        self.assertEqual(verify[0], "GET")
        self.assertEqual(verify[2]["user_id"], "eq.user-a")

    def test_migration_contains_structural_and_storage_isolation(self) -> None:
        sql = MIGRATION.read_text(encoding="utf-8").casefold()
        self.assertIn("foreign key (thread_id, user_id)", sql)
        self.assertIn("foreign key (document_id, user_id)", sql)
        self.assertIn("(select auth.uid()) = user_id", sql)
        self.assertIn("storage.foldername(name)", sql)
        self.assertIn("bucket_id = 'user-materials'", sql)
        self.assertNotIn("security definer", sql)


if __name__ == "__main__":
    unittest.main()
