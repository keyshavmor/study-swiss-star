"""Private, restart-safe SQLite state for assessment jobs and answer keys."""

from __future__ import annotations

import json
import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import RLock
from typing import Any


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _decode(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    result = dict(row)
    for name in (
        "config_json",
        "questions_json",
        "answer_keys_json",
        "answers_json",
        "result_json",
    ):
        if name in result:
            value = result.pop(name)
            result[name.removesuffix("_json")] = json.loads(value) if value else None
    return result


class AssessmentRepository:
    """Keep hidden keys and ephemeral lifecycle state outside exposed Supabase tables."""

    def __init__(self, path: str | Path = ":memory:") -> None:
        database_path: Path | None = None
        if path != ":memory:":
            database_path = Path(path)
            database_path.parent.mkdir(parents=True, exist_ok=True)
            os.chmod(database_path.parent, 0o700)
            path = database_path
        self.connection = sqlite3.connect(str(path), check_same_thread=False)
        if database_path is not None:
            os.chmod(database_path, 0o600)
        self.connection.row_factory = sqlite3.Row
        self.lock = RLock()
        with self.lock:
            self.connection.executescript(
                """
                pragma foreign_keys = on;
                create table if not exists assessment_jobs (
                  id text primary key,
                  user_id text not null,
                  idempotency_key text not null,
                  fingerprint text not null,
                  state text not null,
                  phase text,
                  config_json text not null,
                  questions_json text,
                  answer_keys_json text,
                  attempt_id text not null unique,
                  model_id text not null,
                  model_used text,
                  error_code text,
                  created_at text not null,
                  updated_at text not null,
                  expires_at text not null,
                  unique(user_id, idempotency_key)
                );
                create index if not exists assessment_jobs_owner_state
                  on assessment_jobs(user_id, state, updated_at);
                create table if not exists assessment_attempts (
                  id text primary key,
                  job_id text not null unique references assessment_jobs(id) on delete cascade,
                  user_id text not null,
                  status text not null,
                  started_at text,
                  deadline_at text,
                  last_heartbeat_at text,
                  submitted_at text,
                  answers_json text,
                  result_json text,
                  submission_key text,
                  submission_fingerprint text,
                  error_code text,
                  updated_at text not null
                );
                create index if not exists assessment_attempts_owner_status
                  on assessment_attempts(user_id, status, updated_at);
                """
            )
            self.connection.commit()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        with self.lock:
            try:
                self.connection.execute("begin immediate")
                yield self.connection
                self.connection.commit()
            except Exception:
                self.connection.rollback()
                raise

    def close(self) -> None:
        with self.lock:
            self.connection.close()

    def recover_interrupted(self) -> int:
        """Make interrupted inference explicit; bearer tokens are never persisted for restart."""

        timestamp = now_iso()
        with self.transaction() as connection:
            cursor = connection.execute(
                """
                update assessment_jobs
                   set state = 'failed', phase = null, error_code = 'backend_restarted',
                       updated_at = ?
                 where state in ('generating', 'validating')
                """,
                (timestamp,),
            )
            connection.execute(
                """
                update assessment_attempts
                   set status = 'grading_failed', error_code = 'backend_restarted',
                       updated_at = ?
                 where status = 'grading'
                """,
                (timestamp,),
            )
        return int(cursor.rowcount)

    def create_job(self, row: dict[str, Any]) -> None:
        with self.transaction() as connection:
            connection.execute(
                """
                insert into assessment_jobs (
                  id, user_id, idempotency_key, fingerprint, state, phase,
                  config_json, attempt_id, model_id, created_at, updated_at, expires_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["user_id"],
                    row["idempotency_key"],
                    row["fingerprint"],
                    row["state"],
                    row["phase"],
                    json.dumps(row["config"], ensure_ascii=False),
                    row["attempt_id"],
                    row["model_id"],
                    row["created_at"],
                    row["updated_at"],
                    row["expires_at"],
                ),
            )
            connection.execute(
                """
                insert into assessment_attempts (id, job_id, user_id, status, updated_at)
                values (?, ?, ?, 'ready', ?)
                """,
                (row["attempt_id"], row["id"], row["user_id"], row["updated_at"]),
            )

    def job_for_key(self, user_id: str, key: str) -> dict[str, Any] | None:
        with self.lock:
            row = self.connection.execute(
                "select * from assessment_jobs where user_id = ? and idempotency_key = ?",
                (user_id, key),
            ).fetchone()
        return _decode(row)

    def get_job(self, user_id: str, job_id: str) -> dict[str, Any] | None:
        with self.lock:
            row = self.connection.execute(
                "select * from assessment_jobs where user_id = ? and id = ?",
                (user_id, job_id),
            ).fetchone()
        return _decode(row)

    def get_job_for_attempt(self, user_id: str, attempt_id: str) -> dict[str, Any] | None:
        with self.lock:
            row = self.connection.execute(
                "select * from assessment_jobs where user_id = ? and attempt_id = ?",
                (user_id, attempt_id),
            ).fetchone()
        return _decode(row)

    def update_job(self, user_id: str, job_id: str, **changes: Any) -> None:
        allowed = {"state", "phase", "questions", "answer_keys", "model_used", "error_code"}
        if not changes or set(changes) - allowed:
            raise ValueError("invalid job update")
        columns, values = [], []
        for name, value in changes.items():
            column = f"{name}_json" if name in {"questions", "answer_keys"} else name
            columns.append(f"{column} = ?")
            values.append(
                json.dumps(value, ensure_ascii=False)
                if name in {"questions", "answer_keys"}
                else value
            )
        columns.append("updated_at = ?")
        values.extend([now_iso(), user_id, job_id])
        with self.transaction() as connection:
            cursor = connection.execute(
                f"update assessment_jobs set {', '.join(columns)} where user_id = ? and id = ?",
                values,
            )
            if cursor.rowcount != 1:
                raise KeyError("assessment job not found")

    def get_attempt(self, user_id: str, attempt_id: str) -> dict[str, Any] | None:
        with self.lock:
            row = self.connection.execute(
                "select * from assessment_attempts where user_id = ? and id = ?",
                (user_id, attempt_id),
            ).fetchone()
        return _decode(row)

    def update_attempt(self, user_id: str, attempt_id: str, **changes: Any) -> None:
        allowed = {
            "status",
            "started_at",
            "deadline_at",
            "last_heartbeat_at",
            "submitted_at",
            "answers",
            "result",
            "submission_key",
            "submission_fingerprint",
            "error_code",
        }
        if not changes or set(changes) - allowed:
            raise ValueError("invalid attempt update")
        columns, values = [], []
        for name, value in changes.items():
            column = f"{name}_json" if name in {"answers", "result"} else name
            columns.append(f"{column} = ?")
            values.append(
                json.dumps(value, ensure_ascii=False) if name in {"answers", "result"} else value
            )
        columns.append("updated_at = ?")
        values.extend([now_iso(), user_id, attempt_id])
        with self.transaction() as connection:
            cursor = connection.execute(
                f"update assessment_attempts set {', '.join(columns)} where user_id = ? and id = ?",
                values,
            )
            if cursor.rowcount != 1:
                raise KeyError("assessment attempt not found")

    def delete_ephemeral(self, user_id: str, *, job_id: str | None, attempt_id: str | None) -> bool:
        with self.transaction() as connection:
            row = connection.execute(
                """
                select j.id, a.status from assessment_jobs j
                join assessment_attempts a on a.job_id = j.id
                where j.user_id = ? and (? is null or j.id = ?) and (? is null or a.id = ?)
                limit 1
                """,
                (user_id, job_id, job_id, attempt_id, attempt_id),
            ).fetchone()
            if row is None:
                return True
            if row["status"] in {"submitted", "grading", "graded", "grading_failed"}:
                return False
            connection.execute(
                "delete from assessment_jobs where user_id = ? and id = ?", (user_id, row["id"])
            )
        return True

    def expire_stale(self, now: str) -> int:
        """Expire unsubmitted jobs by their durable deadline without deleting evidence."""

        cutoff = (datetime.fromisoformat(now) - timedelta(minutes=5)).isoformat()
        with self.transaction() as connection:
            cursor = connection.execute(
                """
                update assessment_jobs set state = 'expired', phase = null,
                  questions_json = null, answer_keys_json = null,
                  error_code = 'assessment_expired', updated_at = ?
                where state in ('queued', 'ready') and expires_at <= ?
                """,
                (now, now),
            )
            stale_attempts = connection.execute(
                """
                select job_id from assessment_attempts
                where status = 'in_progress' and last_heartbeat_at <= ?
                """,
                (cutoff,),
            ).fetchall()
            stale_job_ids = [row["job_id"] for row in stale_attempts]
            if stale_job_ids:
                placeholders = ",".join("?" for _ in stale_job_ids)
                connection.execute(
                    f"update assessment_jobs set state = 'expired', questions_json = null, "
                    f"answer_keys_json = null, error_code = 'assessment_expired', updated_at = ? "
                    f"where id in ({placeholders})",
                    (now, *stale_job_ids),
                )
                connection.execute(
                    f"update assessment_attempts set status = 'expired', error_code = "
                    f"'assessment_expired', updated_at = ? where job_id in ({placeholders})",
                    (now, *stale_job_ids),
                )
        return int(cursor.rowcount)
