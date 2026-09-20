"""Prompt 06 assessment lifecycle, isolation, validation, and grading tests."""

from __future__ import annotations

import asyncio
import json
import unittest

from app.assessment import (
    AssessmentRepository,
    AssessmentService,
    NullAssessmentPublicStore,
)
from app.auth import TokenVerificationError
from app.context.config import ContextConfig, WebConfig
from app.context.manager import ContextManager
from app.context.models import DocumentChunk
from app.context.store import SQLiteContextStore
from app.context.store_supabase import SupabaseStoreError
from app.main import create_app
from app.services.llm import LLMResponse
from httpx import ASGITransport, AsyncClient


class TokenVerifier:
    def verify(self, token: str):
        if token == "invalid":
            raise TokenVerificationError("invalid")
        return {"sub": token.removeprefix("token-")}


async def allow(_identity, _text: str) -> str:
    return "allow"


def config(**overrides):
    value = {
        "kind": "quiz",
        "subjectSlug": "biology",
        "subjectName": "Biology",
        "component": None,
        "topic": "cellular respiration",
        "learningGoalIds": ["goal-1"],
        "difficulty": "medium",
        "sourceScope": "materials",
        "selectedMaterialIds": [],
        "questionMix": {
            "multiple_choice": 1,
            "true_false": 0,
            "short_answer": 0,
            "matching": 0,
            "essay": 0,
            "calculation": 0,
        },
        "timeLimitMinutes": 20,
        "feedbackMode": "deferred",
        "schoolLevel": "Gymnasium",
        "academicYear": "2026/27",
        "language": "German",
        "includeInStats": False,
    }
    value.update(overrides)
    return value


def generated_payload(*, leak: bool = False) -> dict:
    question = {
        "id": "question-1",
        "type": "multiple_choice",
        "subject": "Biology",
        "topic": "cellular respiration",
        "learningGoalIds": ["goal-1"],
        "difficulty": "medium",
        "cognitiveDemand": "understanding",
        "points": 2,
        "prompt": [{"kind": "prose", "text": "Which organelle produces most ATP?"}],
        "media": [],
        "sources": [{"id": "chunk-assessment"}],
        "selection": "single",
        "options": [
            {"id": "a", "content": [{"kind": "prose", "text": "Mitochondrion"}]},
            {"id": "b", "content": [{"kind": "prose", "text": "Ribosome"}]},
        ],
    }
    if leak:
        question["correctOptionIds"] = ["a"]
    return {
        "questions": [question],
        "answer_keys": [
            {
                "questionId": "question-1",
                "correctOptionIds": ["a"],
                "modelAnswer": [{"kind": "prose", "text": "Mitochondrion"}],
            }
        ],
    }


def generated_essay_payload() -> dict:
    return {
        "questions": [
            {
                "id": "essay-1",
                "type": "essay",
                "subject": "Biology",
                "topic": "cellular respiration",
                "learningGoalIds": ["goal-1"],
                "difficulty": "medium",
                "cognitiveDemand": "analysis",
                "points": 4,
                "prompt": [{"kind": "prose", "text": "Explain ATP production."}],
                "media": [],
                "sources": [{"id": "chunk-assessment"}],
            }
        ],
        "answer_keys": [
            {
                "questionId": "essay-1",
                "rubric": {
                    "criteria": [
                        {
                            "id": "accuracy",
                            "description": "Scientific accuracy",
                            "maxPoints": 2,
                        },
                        {
                            "id": "reasoning",
                            "description": "Clear reasoning",
                            "maxPoints": 2,
                        },
                    ]
                },
                "modelAnswer": [
                    {"kind": "prose", "text": "A grounded reference answer."}
                ],
            }
        ],
    }


class QueueModel:
    model = "test-local-model"

    def __init__(
        self, outputs: list[str] | None = None, *, reachable: bool = True
    ) -> None:
        self.outputs = outputs or [json.dumps(generated_payload())]
        self.reachable = reachable
        self.calls = 0

    async def status(self):
        return {"reachable": self.reachable, "model": self.model}

    async def complete(self, context):
        self.calls += 1
        self.last_context = context
        output = self.outputs[min(self.calls - 1, len(self.outputs) - 1)]
        return LLMResponse(content=output, model=self.model, latency_ms=1)


class CaptureStore(NullAssessmentPublicStore):
    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.generated: list[dict] = []
        self.begun: list[dict] = []
        self.results: list[dict] = []
        self.deleted: list[dict] = []

    def save_generated(self, *, job, questions):
        if self.fail:
            raise SupabaseStoreError("fixture RLS denial")
        self.generated.append({"job": job, "questions": questions})

    def begin_attempt(self, *, job, started_at):
        if self.fail:
            raise SupabaseStoreError("fixture RLS denial")
        self.begun.append({"job": job, "started_at": started_at})

    def save_result(self, *, job, answers, result):
        if self.fail:
            raise SupabaseStoreError("fixture RLS denial")
        self.results.append({"job": job, "answers": answers, "result": result})

    def delete_generated(self, *, job):
        self.deleted.append(job)


class AssessmentApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.context_store = SQLiteContextStore()
        self.manager = ContextManager(
            ContextConfig(web=WebConfig(enabled=False)), store=self.context_store
        )
        material = "Biology mitochondrion ATP cellular respiration evidence. " * 20
        self.context_store.add_chunks(
            [
                DocumentChunk(
                    id="chunk-assessment",
                    document_id="document-assessment",
                    title="Biology material",
                    content=material,
                    subject="biology",
                    topic="cellular_respiration",
                    document_type="notes",
                    token_count=self.manager.counter.count(material),
                )
            ]
        )
        self.repository = AssessmentRepository()
        self.model = QueueModel()
        self.public_store = CaptureStore()
        self.service = AssessmentService(
            repository=self.repository,
            llm=self.model,
            context_factory=lambda _identity: self.manager,
            public_store_factory=lambda _identity: self.public_store,
            safety_moderator=allow,
            enforce_registry=False,
        )
        app = create_app(
            self.manager,
            self.model,
            auth_verifier=TokenVerifier(),
            safety_moderator=allow,
            assessment_service=self.service,
        )
        self.client = AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        )
        self.headers = {"Authorization": "Bearer token-student-a"}

    async def asyncTearDown(self) -> None:
        await self.service.shutdown()
        await self.client.aclose()
        self.repository.close()
        self.context_store.close()

    async def create_ready(self, *, key: str = "generation-key-0001") -> dict:
        created = await self.client.post(
            "/api/assessments/generation",
            headers=self.headers,
            json={
                "config": config(),
                "idempotency_key": key,
                "model_id": self.model.model,
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        for _ in range(50):
            status = await self.client.get(
                f"/api/assessments/generation/{created.json()['jobId']}",
                headers=self.headers,
            )
            if status.json()["state"] in {"ready", "failed"}:
                return status.json()
            await asyncio.sleep(0)
        self.fail("generation did not reach a terminal state")

    async def test_generation_hides_keys_and_exact_retry_reuses_one_job(self) -> None:
        ready = await self.create_ready()
        self.assertEqual(ready["state"], "ready")
        self.assertNotIn("correctOptionIds", json.dumps(ready["questions"]))
        self.assertEqual(self.model.calls, 1)
        self.assertEqual(self.public_store.generated, [])
        replay = await self.client.post(
            "/api/assessments/generation",
            headers=self.headers,
            json={
                "config": config(),
                "idempotency_key": "generation-key-0001",
                "model_id": self.model.model,
            },
        )
        self.assertEqual(replay.json()["jobId"], ready["jobId"])
        self.assertEqual(self.model.calls, 1)
        conflict = await self.client.post(
            "/api/assessments/generation",
            headers=self.headers,
            json={
                "config": config(topic="meiosis"),
                "idempotency_key": "generation-key-0001",
                "model_id": self.model.model,
            },
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.json()["error"]["code"], "idempotency_conflict")

    async def test_begin_submit_and_score_are_server_owned_and_idempotent(self) -> None:
        ready = await self.create_ready(key="generation-key-score")
        attempt_id = ready["attemptId"]
        begin = await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/begin", headers=self.headers
        )
        self.assertEqual(begin.status_code, 200)
        payload = {
            "attemptId": attempt_id,
            "config": config(),
            "questions": ready["questions"],
            "answers": [
                {
                    "type": "multiple_choice",
                    "questionId": "question-1",
                    "selectedOptionIds": ["a"],
                    "eliminatedOptionIds": [],
                }
            ],
            "startedAt": "2000-01-01T00:00:00Z",
            "submittedAt": "2000-01-01T00:00:01Z",
            "timeTakenSeconds": 1,
            "autoSubmitted": False,
        }
        body = {"payload": payload, "idempotency_key": "submission-key-score"}
        submitted = await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/submit",
            headers=self.headers,
            json=body,
        )
        self.assertEqual(submitted.status_code, 200, submitted.text)
        replay = await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/submit",
            headers=self.headers,
            json=body,
        )
        self.assertEqual(replay.status_code, 200)
        for _ in range(50):
            grading = await self.client.get(
                f"/api/assessments/attempts/{attempt_id}/grading", headers=self.headers
            )
            if grading.json()["status"] == "graded":
                break
            await asyncio.sleep(0)
        result = await self.client.get(
            f"/api/assessments/attempts/{attempt_id}/result", headers=self.headers
        )
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["awardedPoints"], 2)
        self.assertEqual(result.json()["percentage"], 100)
        self.assertEqual(result.json()["timeTakenSeconds"], 0)
        self.assertNotEqual(result.json()["submittedAt"], payload["submittedAt"])
        self.assertIsNone(result.json()["swissGrade"])
        self.assertEqual(len(self.public_store.generated), 1)
        self.assertEqual(len(self.public_store.begun), 1)
        self.assertEqual(len(self.public_store.results), 1)
        self.assertNotIn("correctOptionIds", json.dumps(self.public_store.generated))

    async def test_snapshot_tampering_and_cross_user_access_are_denied(self) -> None:
        ready = await self.create_ready(key="generation-key-isolation")
        foreign = await self.client.get(
            f"/api/assessments/generation/{ready['jobId']}",
            headers={"Authorization": "Bearer token-student-b"},
        )
        self.assertEqual(foreign.status_code, 404)
        attempt_id = ready["attemptId"]
        await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/begin", headers=self.headers
        )
        changed = [dict(ready["questions"][0], points=200)]
        response = await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/submit",
            headers=self.headers,
            json={
                "idempotency_key": "submission-key-tamper",
                "payload": {
                    "attemptId": attempt_id,
                    "config": config(),
                    "questions": changed,
                    "answers": [],
                    "startedAt": "2000-01-01T00:00:00Z",
                    "submittedAt": "2000-01-01T00:00:01Z",
                    "timeTakenSeconds": 1,
                    "autoSubmitted": False,
                },
            },
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.json()["error"]["code"], "assessment_snapshot_mismatch"
        )

    async def test_subjective_grading_is_bounded_by_the_private_rubric(self) -> None:
        self.model.outputs = [
            json.dumps(generated_essay_payload()),
            json.dumps(
                {
                    "grades": [
                        {
                            "questionId": "essay-1",
                            "awardedPoints": 3,
                            "explanation": "Mostly correct.",
                            "improvement": "Explain the proton gradient.",
                            "rubricFeedback": [
                                {"criterionId": "accuracy", "awarded": 2},
                                {"criterionId": "reasoning", "awarded": 1},
                            ],
                        }
                    ]
                }
            ),
        ]
        essay_mix = {
            "multiple_choice": 0,
            "true_false": 0,
            "short_answer": 0,
            "matching": 0,
            "essay": 1,
            "calculation": 0,
        }
        created = await self.client.post(
            "/api/assessments/generation",
            headers=self.headers,
            json={
                "config": config(questionMix=essay_mix),
                "idempotency_key": "generation-key-essay",
                "model_id": self.model.model,
            },
        )
        for _ in range(50):
            ready_response = await self.client.get(
                f"/api/assessments/generation/{created.json()['jobId']}",
                headers=self.headers,
            )
            if ready_response.json()["state"] == "ready":
                break
            await asyncio.sleep(0)
        ready = ready_response.json()
        attempt_id = ready["attemptId"]
        await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/begin", headers=self.headers
        )
        submitted = await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/submit",
            headers=self.headers,
            json={
                "idempotency_key": "submission-key-essay",
                "payload": {
                    "attemptId": attempt_id,
                    "config": config(questionMix=essay_mix),
                    "questions": ready["questions"],
                    "answers": [
                        {
                            "type": "essay",
                            "questionId": "essay-1",
                            "text": "Student answer",
                        }
                    ],
                    "startedAt": "2000-01-01T00:00:00Z",
                    "submittedAt": "2000-01-01T00:00:01Z",
                    "timeTakenSeconds": 1,
                    "autoSubmitted": False,
                },
            },
        )
        self.assertEqual(submitted.status_code, 200, submitted.text)
        for _ in range(50):
            grading = await self.client.get(
                f"/api/assessments/attempts/{attempt_id}/grading", headers=self.headers
            )
            if grading.json()["status"] == "graded":
                break
            await asyncio.sleep(0)
        result = await self.client.get(
            f"/api/assessments/attempts/{attempt_id}/result", headers=self.headers
        )
        self.assertEqual(result.json()["awardedPoints"], 3)
        self.assertEqual(
            result.json()["results"][0]["rubricFeedback"][0]["description"],
            "Scientific accuracy",
        )
        self.assertEqual(self.model.calls, 2)

    async def test_malformed_or_leaking_model_output_exhausts_bounded_retries(
        self,
    ) -> None:
        self.model.outputs = [json.dumps(generated_payload(leak=True))]
        ready = await self.create_ready(key="generation-key-invalid")
        self.assertEqual(ready["state"], "failed")
        self.assertEqual(ready["errorKey"], "model_output_invalid")
        self.assertEqual(self.model.calls, 3)

    async def test_unready_model_and_supabase_failure_are_honest(self) -> None:
        self.model.reachable = False
        offline = await self.create_ready(key="generation-key-offline")
        self.assertEqual(offline["state"], "failed")
        self.assertEqual(offline["errorKey"], "model_unavailable")
        self.assertEqual(self.model.calls, 0)

        self.model.reachable = True
        self.public_store.fail = True
        denied = await self.create_ready(key="generation-key-rls")
        self.assertEqual(denied["state"], "ready")
        attempt_id = denied["attemptId"]
        await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/begin", headers=self.headers
        )
        await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/submit",
            headers=self.headers,
            json={
                "idempotency_key": "submission-key-rls",
                "payload": {
                    "attemptId": attempt_id,
                    "config": config(),
                    "questions": denied["questions"],
                    "answers": [],
                    "startedAt": "2000-01-01T00:00:00Z",
                    "submittedAt": "2000-01-01T00:00:01Z",
                    "timeTakenSeconds": 1,
                    "autoSubmitted": False,
                },
            },
        )
        for _ in range(30):
            grading = await self.client.get(
                f"/api/assessments/attempts/{attempt_id}/grading", headers=self.headers
            )
            if grading.json()["status"] == "grading_failed":
                break
            await asyncio.sleep(0)
        self.assertEqual(grading.json()["errorKey"], "supabase_unavailable")

    async def test_cancel_and_abandon_clean_only_ephemeral_owner_state(self) -> None:
        gate = asyncio.Event()

        async def slow_complete(context):
            self.model.calls += 1
            await gate.wait()
            return LLMResponse(
                content=json.dumps(generated_payload()),
                model=self.model.model,
                latency_ms=1,
            )

        self.model.complete = slow_complete
        created = await self.client.post(
            "/api/assessments/generation",
            headers=self.headers,
            json={
                "config": config(),
                "idempotency_key": "generation-key-cancel",
                "model_id": self.model.model,
            },
        )
        await asyncio.sleep(0)
        cancelled = await self.client.post(
            f"/api/assessments/generation/{created.json()['jobId']}/cancel",
            headers=self.headers,
        )
        self.assertEqual(cancelled.json(), {"cancelled": True})
        cancelled_job = self.repository.get_job("student-a", created.json()["jobId"])
        self.assertIsNone(cancelled_job["questions"])
        self.assertIsNone(cancelled_job["answer_keys"])
        abandoned = await self.client.post(
            "/api/assessments/abandon",
            headers=self.headers,
            json={"jobId": created.json()["jobId"]},
        )
        self.assertEqual(abandoned.json(), {"cleaned": True})

    async def test_safety_unavailable_never_calls_the_model(self) -> None:
        repository = AssessmentRepository()
        model = QueueModel()
        service = AssessmentService(
            repository=repository,
            llm=model,
            context_factory=lambda _identity: self.manager,
            public_store_factory=lambda _identity: NullAssessmentPublicStore(),
            safety_moderator=None,
            enforce_registry=False,
        )
        app = create_app(
            self.manager,
            model,
            auth_verifier=TokenVerifier(),
            assessment_service=service,
        )
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            created = await client.post(
                "/api/assessments/generation",
                headers=self.headers,
                json={
                    "config": config(),
                    "idempotency_key": "generation-key-safety",
                    "model_id": model.model,
                },
            )
            for _ in range(30):
                status = await client.get(
                    f"/api/assessments/generation/{created.json()['jobId']}",
                    headers=self.headers,
                )
                if status.json()["state"] == "failed":
                    break
                await asyncio.sleep(0)
        self.assertEqual(status.json()["errorKey"], "safety_unavailable")
        self.assertEqual(model.calls, 0)
        await service.shutdown()
        repository.close()

    async def test_server_deadline_rejects_a_stale_client_submission(self) -> None:
        ready = await self.create_ready(key="generation-key-deadline")
        attempt_id = ready["attemptId"]
        await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/begin", headers=self.headers
        )
        self.repository.update_attempt(
            "student-a",
            attempt_id,
            deadline_at="2000-01-01T00:00:00+00:00",
        )
        response = await self.client.post(
            f"/api/assessments/attempts/{attempt_id}/submit",
            headers=self.headers,
            json={
                "idempotency_key": "submission-key-expired",
                "payload": {
                    "attemptId": attempt_id,
                    "config": config(),
                    "questions": ready["questions"],
                    "answers": [],
                    "startedAt": "2099-01-01T00:00:00Z",
                    "submittedAt": "2099-01-01T00:00:00Z",
                    "timeTakenSeconds": 0,
                    "autoSubmitted": False,
                },
            },
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn(
            response.json()["error"]["code"], {"attempt_expired", "attempt_not_active"}
        )

    async def test_concurrent_generation_retries_share_one_operation(self) -> None:
        request = {
            "config": config(),
            "idempotency_key": "generation-key-concurrent",
            "model_id": self.model.model,
        }
        first, second = await asyncio.gather(
            self.client.post(
                "/api/assessments/generation", headers=self.headers, json=request
            ),
            self.client.post(
                "/api/assessments/generation", headers=self.headers, json=request
            ),
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["jobId"], second.json()["jobId"])
        for _ in range(50):
            status = await self.client.get(
                f"/api/assessments/generation/{first.json()['jobId']}",
                headers=self.headers,
            )
            if status.json()["state"] == "ready":
                break
            await asyncio.sleep(0)
        self.assertEqual(self.model.calls, 1)


if __name__ == "__main__":
    unittest.main()
