"""Fast checks for the request-scoped adapter and migration security invariants."""

from __future__ import annotations

import unittest
from pathlib import Path

from app.context.models import DocumentChunk
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
