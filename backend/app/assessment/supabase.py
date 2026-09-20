"""Caller-JWT Supabase persistence for public assessment records."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from typing import Any, Protocol

from ..context.store_supabase import SupabaseStoreError


def _same_instant(left: Any, right: Any) -> bool:
    """Compare ISO timestamps after normalizing equivalent UTC spellings."""

    try:
        return datetime.fromisoformat(str(left)) == datetime.fromisoformat(str(right))
    except ValueError:
        return False


class AssessmentPublicStore(Protocol):
    """Public sanitized persistence; private keys never cross this interface."""

    def save_generated(self, *, job: dict[str, Any], questions: list[dict[str, Any]]) -> None: ...

    def begin_attempt(self, *, job: dict[str, Any], started_at: str) -> None: ...

    def save_result(
        self,
        *,
        job: dict[str, Any],
        answers: list[dict[str, Any]],
        result: dict[str, Any],
    ) -> None: ...

    def delete_generated(self, *, job: dict[str, Any]) -> None: ...


class NullAssessmentPublicStore:
    """Explicit test/local fixture store; never presented as durable Supabase success."""

    def save_generated(self, *, job: dict[str, Any], questions: list[dict[str, Any]]) -> None:
        del job, questions

    def begin_attempt(self, *, job: dict[str, Any], started_at: str) -> None:
        del job, started_at

    def save_result(
        self,
        *,
        job: dict[str, Any],
        answers: list[dict[str, Any]],
        result: dict[str, Any],
    ) -> None:
        del job, answers, result

    def delete_generated(self, *, job: dict[str, Any]) -> None:
        del job


class SupabaseAssessmentStore:
    """Persist with the verified caller token so grants and RLS remain authoritative."""

    def __init__(self, url: str, publishable_key: str, access_token: str, user_id: str) -> None:
        if not url or not publishable_key or not access_token or not user_id:
            raise SupabaseStoreError("Supabase assessment persistence is not configured")
        if publishable_key.startswith("sb_secret_"):
            raise SupabaseStoreError("Assessment persistence requires a publishable key")
        self.url = url.rstrip("/")
        self.key = publishable_key
        self.token = access_token
        self.user_id = user_id

    @classmethod
    def from_env(cls, access_token: str, user_id: str) -> SupabaseAssessmentStore:
        return cls(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
            access_token,
            user_id,
        )

    def _request(
        self,
        method: str,
        table: str,
        *,
        query: dict[str, str] | None = None,
        body: Any = None,
        prefer: str | None = None,
    ) -> Any:
        encoded = urllib.parse.urlencode(query or {}, safe="(),.*")
        endpoint = f"{self.url}/rest/v1/{table}" + (f"?{encoded}" if encoded else "")
        data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        }
        if data is not None:
            headers["Content-Type"] = "application/json"
        if prefer:
            headers["Prefer"] = prefer
        request = urllib.request.Request(endpoint, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read()
        except urllib.error.HTTPError as error:
            raise SupabaseStoreError(
                f"Supabase assessment {method} failed with HTTP {error.code}"
            ) from error
        except (urllib.error.URLError, TimeoutError) as error:
            raise SupabaseStoreError("Supabase assessment persistence is unavailable") from error
        return json.loads(payload) if payload else None

    def _assert_owner(self, job: dict[str, Any]) -> None:
        if job["user_id"] != self.user_id:
            raise PermissionError("Assessment does not belong to the verified user")

    def save_generated(self, *, job: dict[str, Any], questions: list[dict[str, Any]]) -> None:
        self._assert_owner(job)
        config = job["config"]
        is_exam = config["kind"] == "mock_exam"
        table = "mock_exams" if is_exam else "quizzes"
        selected_ids = []
        for value in config.get("selectedMaterialIds", []):
            try:
                selected_ids.append(str(uuid.UUID(value)))
            except (TypeError, ValueError, AttributeError):
                continue
        row = {
            "id": job["id"],
            "user_id": self.user_id,
            "subject": config["subjectName"],
            "component": config.get("component"),
            "topic": config.get("topic"),
            "academic_year": config.get("academicYear"),
            "source_document_ids": selected_ids,
            "questions": questions,
            "model_used": job.get("model_used") or job["model_id"],
            "metadata": {
                "kind": config["kind"],
                "difficulty": config["difficulty"],
                "language": config["language"],
                "prompt_version": "assessment-generation-v1",
                "requested_material_ids": config.get("selectedMaterialIds", []),
            },
        }
        if is_exam:
            row["duration_minutes"] = config.get("timeLimitMinutes")
        self._request(
            "POST",
            table,
            query={"on_conflict": "id"},
            body=[row],
            prefer="resolution=ignore-duplicates,return=minimal",
        )
        persisted = (
            self._request(
                "GET",
                table,
                query={
                    "select": "id,questions,model_used",
                    "id": f"eq.{job['id']}",
                    "user_id": f"eq.{self.user_id}",
                    "limit": "1",
                },
            )
            or []
        )
        if (
            len(persisted) != 1
            or persisted[0].get("questions") != questions
            or persisted[0].get("model_used") != row["model_used"]
        ):
            raise SupabaseStoreError("Generated assessment was not durably persisted")

    def begin_attempt(self, *, job: dict[str, Any], started_at: str) -> None:
        self._assert_owner(job)
        config = job["config"]
        is_exam = config["kind"] == "mock_exam"
        table = "mock_exam_attempts" if is_exam else "quiz_attempts"
        foreign_key = "mock_exam_id" if is_exam else "quiz_id"
        self._request(
            "POST",
            table,
            query={"on_conflict": "id"},
            body=[
                {
                    "id": job["attempt_id"],
                    foreign_key: job["id"],
                    "user_id": self.user_id,
                    "attempt_number": 1,
                    "answers": [],
                    "started_at": started_at,
                }
            ],
            prefer="resolution=ignore-duplicates,return=minimal",
        )
        persisted = (
            self._request(
                "GET",
                table,
                query={
                    "select": "id,started_at",
                    "id": f"eq.{job['attempt_id']}",
                    "user_id": f"eq.{self.user_id}",
                    "limit": "1",
                },
            )
            or []
        )
        if len(persisted) != 1 or not _same_instant(persisted[0].get("started_at"), started_at):
            raise SupabaseStoreError("Assessment start was not durably persisted")

    def save_result(
        self,
        *,
        job: dict[str, Any],
        answers: list[dict[str, Any]],
        result: dict[str, Any],
    ) -> None:
        self._assert_owner(job)
        config = job["config"]
        is_exam = config["kind"] == "mock_exam"
        attempt_table = "mock_exam_attempts" if is_exam else "quiz_attempts"
        updated = self._request(
            "PATCH",
            attempt_table,
            query={"id": f"eq.{job['attempt_id']}", "user_id": f"eq.{self.user_id}"},
            body={
                "answers": answers,
                "score": result["percentage"],
                "points": result["awardedPoints"],
                "max_points": result["maxPoints"],
                "swiss_grade": result["swissGrade"],
                "grading_feedback": result,
                "completed_at": result["submittedAt"],
            },
            prefer="return=representation",
        )
        if not isinstance(updated, list) or len(updated) != 1:
            raise SupabaseStoreError("Assessment attempt update was denied or not persisted")
        grading_id = job["attempt_id"]
        self._request(
            "POST",
            "grading_results",
            query={"on_conflict": "id"},
            body=[
                {
                    "id": grading_id,
                    "user_id": self.user_id,
                    "subject": config["subjectName"],
                    "component": config.get("component"),
                    "academic_year": config.get("academicYear"),
                    "source_type": "mock_exam" if is_exam else "quiz",
                    "source_id": job["id"],
                    "user_answers": answers,
                    "feedback": result,
                    "points": result["awardedPoints"],
                    "max_points": result["maxPoints"],
                    "swiss_grade": result["swissGrade"],
                    "model_used": job.get("model_used") or job["model_id"],
                    "metadata": {
                        "attempt_id": job["attempt_id"],
                        "grading_version": "assessment-grading-v1",
                        "include_in_stats": config["includeInStats"],
                    },
                }
            ],
            prefer="resolution=ignore-duplicates,return=minimal",
        )
        persisted = (
            self._request(
                "GET",
                "grading_results",
                query={
                    "select": "id,feedback,points,max_points,model_used",
                    "id": f"eq.{grading_id}",
                    "user_id": f"eq.{self.user_id}",
                    "limit": "1",
                },
            )
            or []
        )
        if (
            len(persisted) != 1
            or persisted[0].get("feedback") != result
            or persisted[0].get("model_used") != (job.get("model_used") or job["model_id"])
        ):
            raise SupabaseStoreError("Grading result was not durably persisted")

    def delete_generated(self, *, job: dict[str, Any]) -> None:
        self._assert_owner(job)
        table = "mock_exams" if job["config"]["kind"] == "mock_exam" else "quizzes"
        self._request(
            "DELETE",
            table,
            query={"id": f"eq.{job['id']}", "user_id": f"eq.{self.user_id}"},
            prefer="return=minimal",
        )
        remaining = (
            self._request(
                "GET",
                table,
                query={
                    "select": "id",
                    "id": f"eq.{job['id']}",
                    "user_id": f"eq.{self.user_id}",
                    "limit": "1",
                },
            )
            or []
        )
        if remaining:
            raise SupabaseStoreError("Ephemeral assessment cleanup did not complete")
