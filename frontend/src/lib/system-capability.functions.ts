/**
 * Authenticated server function for the FUTURE local system capability probe.
 * The browser never talks to the local backend directly; the caller's verified
 * Supabase bearer token is the authorization boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SystemCapabilityReport } from "@/lib/system-capability.types";

/** Verified caller token; never logged, persisted or returned to the client. */
function callerAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

export const probeSystemCapability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ preferredModelId: z.string().max(200).nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<SystemCapabilityReport> => {
    const { probeSystemCapabilityOnBackend } = await import("@/lib/system-capability.server");

    // CURRENT SUPABASE: the enabled catalogue is read as the signed-in user
    // (RLS applies) and forwarded so the backend recommendation stays inside
    // it. A failed read degrades to an empty list and never implies readiness.
    let modelCatalog: string[] = [];
    try {
      const { data: rows } = await context.supabase
        .from("ai_model_catalog")
        .select("model_id, enabled, sort_order")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      modelCatalog = (rows ?? [])
        .map((row) => row.model_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
    } catch {
      modelCatalog = [];
    }

    return probeSystemCapabilityOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      preferredModelId: data.preferredModelId ?? null,
      modelCatalog,
    });
  });
