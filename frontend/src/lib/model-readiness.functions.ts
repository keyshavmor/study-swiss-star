/**
 * Authenticated server functions for model readiness.
 *
 * The browser never talks to the local backend directly. Identity comes from
 * the verified Supabase session (bearer token attached by `src/start.ts`), and
 * the runtime policy is read from production Supabase, not from the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_AI_RUNTIME_POLICY,
  type AiRuntimePolicy,
  type ModelPreparationStatus,
} from "@/lib/model-readiness.types";

/**
 * Reads the caller's verified Supabase access token from the request the
 * authenticated middleware already validated. The token is the authorization
 * boundary for the local backend; it is never logged or returned to the client.
 */
function callerAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

const prepareInput = z.object({ modelId: z.string().min(1).max(200) });
const pollInput = z.object({
  modelId: z.string().min(1).max(200),
  operationId: z.string().min(1).max(200),
});

type SupabaseLike = {
  rpc: (name: "get_ai_runtime_policy") => Promise<{ data: unknown; error: unknown }>;
};

/** Reads the canonical policy from Supabase; falls back to documented defaults. */
async function readPolicy(supabase: SupabaseLike): Promise<AiRuntimePolicy> {
  try {
    const { data, error } = await supabase.rpc("get_ai_runtime_policy");
    if (error) return DEFAULT_AI_RUNTIME_POLICY;
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row) return DEFAULT_AI_RUNTIME_POLICY;
    const pick = (key: keyof AiRuntimePolicy, fallback: number) =>
      typeof row[key] === "number" ? (row[key] as number) : fallback;
    const flag = (key: keyof AiRuntimePolicy, fallback: boolean) =>
      typeof row[key] === "boolean" ? (row[key] as boolean) : fallback;
    return {
      preflight_gpu_free_percent: pick("preflight_gpu_free_percent", 50),
      preflight_ram_free_percent: pick("preflight_ram_free_percent", 50),
      preflight_storage_free_percent: pick("preflight_storage_free_percent", 50),
      ready_gpu_free_percent: pick("ready_gpu_free_percent", 30),
      ready_ram_free_percent: pick("ready_ram_free_percent", 25),
      ready_storage_free_percent: pick("ready_storage_free_percent", 30),
      check_active_users: flag("check_active_users", true),
      deduplicate_model_downloads: flag("deduplicate_model_downloads", true),
      allow_parallel_per_user_model_processes: flag(
        "allow_parallel_per_user_model_processes",
        true,
      ),
    };
  } catch {
    return DEFAULT_AI_RUNTIME_POLICY;
  }
}

export const prepareModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => prepareInput.parse(data))
  .handler(async ({ data, context }): Promise<ModelPreparationStatus> => {
    const { prepareModelOnBackend } = await import("@/lib/model-backend.server");
    const policy = await readPolicy(context.supabase as unknown as SupabaseLike);
    return prepareModelOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      modelId: data.modelId,
      policy,
    });
  });

export const pollModelOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => pollInput.parse(data))
  .handler(async ({ data, context }): Promise<ModelPreparationStatus> => {
    const { pollModelOperationOnBackend } = await import("@/lib/model-backend.server");
    const policy = await readPolicy(context.supabase as unknown as SupabaseLike);
    return pollModelOperationOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      modelId: data.modelId,
      operationId: data.operationId,
      policy,
    });
  });
