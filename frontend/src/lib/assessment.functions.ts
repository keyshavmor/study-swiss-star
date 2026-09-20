/** Authenticated TanStack boundary for every production assessment operation. */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AssessmentApiResult,
  GenerationJob,
  GenerationStatus,
  GradingStatus,
} from "./assessment/api";
import type { AssessmentConfig, AssessmentResult } from "./assessment/types";

function callerAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

const ownedId = z.string().min(1).max(200);

export const createAssessmentGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        config: z.custom<AssessmentConfig>((value) => Boolean(value && typeof value === "object")),
        modelId: z.string().min(1).max(200),
        idempotencyKey: z.string().min(8).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<AssessmentApiResult<GenerationJob>> => {
    const { createGenerationOnBackend } = await import("@/lib/assessment-backend.server");
    return createGenerationOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      ...data,
    });
  });

export const fetchAssessmentGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ jobId: ownedId }).parse(data))
  .handler(async ({ data, context }): Promise<AssessmentApiResult<GenerationStatus>> => {
    const { generationStatusOnBackend } = await import("@/lib/assessment-backend.server");
    return generationStatusOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      jobId: data.jobId,
    });
  });

export const cancelAssessmentGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ jobId: ownedId }).parse(data))
  .handler(async ({ data, context }) => {
    const { cancelGenerationOnBackend } = await import("@/lib/assessment-backend.server");
    return cancelGenerationOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      jobId: data.jobId,
    });
  });

export const beginAssessmentAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ attemptId: ownedId }).parse(data))
  .handler(async ({ data, context }) => {
    const { beginAssessmentOnBackend } = await import("@/lib/assessment-backend.server");
    return beginAssessmentOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      attemptId: data.attemptId,
    });
  });

export const heartbeatAssessmentAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ attemptId: ownedId }).parse(data))
  .handler(async ({ data, context }) => {
    const { heartbeatAssessmentOnBackend } = await import("@/lib/assessment-backend.server");
    return heartbeatAssessmentOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      attemptId: data.attemptId,
    });
  });

export const submitAssessmentAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        payload: z.custom<Record<string, unknown>>((value) =>
          Boolean(value && typeof value === "object"),
        ),
        idempotencyKey: z.string().min(8).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { submitAssessmentOnBackend } = await import("@/lib/assessment-backend.server");
    return submitAssessmentOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      payload: data.payload as never,
      idempotencyKey: data.idempotencyKey,
    });
  });

export const abandonAssessmentAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ jobId: ownedId.optional(), attemptId: ownedId.optional() })
      .refine((value) => Boolean(value.jobId || value.attemptId))
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { abandonAssessmentOnBackend } = await import("@/lib/assessment-backend.server");
    return abandonAssessmentOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      ...data,
    });
  });

export const fetchAssessmentGrading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ attemptId: ownedId }).parse(data))
  .handler(async ({ data, context }): Promise<AssessmentApiResult<GradingStatus>> => {
    const { gradingStatusOnBackend } = await import("@/lib/assessment-backend.server");
    return gradingStatusOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      attemptId: data.attemptId,
    });
  });

export const fetchAssessmentResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ attemptId: ownedId }).parse(data))
  .handler(async ({ data, context }): Promise<AssessmentApiResult<AssessmentResult>> => {
    const { assessmentResultOnBackend } = await import("@/lib/assessment-backend.server");
    return assessmentResultOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      attemptId: data.attemptId,
    });
  });
