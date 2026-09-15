/**
 * Authenticated server functions for system admission, health and runtime
 * release. The browser never reaches the local backend directly; the caller's
 * verified Supabase bearer token is the authorization boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_SYSTEM_ADMISSION_POLICY,
  type AdmissionStatus,
  type LocalBackendHealth,
} from "@/lib/system-admission.types";
import type { SystemAdmissionPolicyRow } from "@/integrations/supabase/types";

/** Verified caller token; never logged, persisted or returned to the client. */
function callerAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

type SupabaseLike = {
  rpc: (name: "get_system_admission_policy") => Promise<{ data: unknown; error: unknown }>;
};

/** CURRENT SUPABASE policy read with documented fallback defaults. */
async function readAdmissionPolicy(supabase: SupabaseLike): Promise<SystemAdmissionPolicyRow> {
  try {
    const { data, error } = await supabase.rpc("get_system_admission_policy");
    if (error) return DEFAULT_SYSTEM_ADMISSION_POLICY;
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!row) return DEFAULT_SYSTEM_ADMISSION_POLICY;
    const merged: SystemAdmissionPolicyRow = { ...DEFAULT_SYSTEM_ADMISSION_POLICY };
    for (const key of Object.keys(DEFAULT_SYSTEM_ADMISSION_POLICY) as (keyof SystemAdmissionPolicyRow)[]) {
      const value = row[key];
      const fallback = DEFAULT_SYSTEM_ADMISSION_POLICY[key];
      if (typeof value === typeof fallback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged as any)[key] = value;
      }
    }
    return merged;
  } catch {
    return DEFAULT_SYSTEM_ADMISSION_POLICY;
  }
}

export const checkSystemAdmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ preferredModelId: z.string().max(200).nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdmissionStatus> => {
    const { checkAdmissionOnBackend } = await import("@/lib/system-backend.server");
    const policy = await readAdmissionPolicy(context.supabase as unknown as SupabaseLike);
    return checkAdmissionOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      preferredModelId: data.preferredModelId ?? null,
      policy,
    });
  });

export const fetchLocalBackendHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LocalBackendHealth> => {
    const { fetchLocalHealthOnBackend } = await import("@/lib/system-backend.server");
    const policy = await readAdmissionPolicy(context.supabase as unknown as SupabaseLike);
    return fetchLocalHealthOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      policy,
    });
  });

export const releaseMyRuntime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ leaseId: z.string().max(200).nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ released: boolean; message_code: string }> => {
    const { releaseRuntimeOnBackend } = await import("@/lib/system-backend.server");
    return releaseRuntimeOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      leaseId: data.leaseId ?? null,
    });
  });

export const heartbeatMySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ leaseId: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data, context }): Promise<{ alive: boolean }> => {
    const { heartbeatOnBackend } = await import("@/lib/system-backend.server");
    return heartbeatOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      leaseId: data.leaseId,
    });
  });
