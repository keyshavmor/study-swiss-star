/** Authenticated browser-to-server boundary for local data deletion. */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LocalPrivacyPurgeResult } from "@/lib/privacy-backend.server";

function callerAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

const input = z
  .object({
    mode: z.enum(["range", "all_content", "delete_account"]),
    start_at: z.string().max(64).optional(),
    end_at: z.string().max(64).optional(),
    delete_peer_messages: z.boolean().optional(),
    delete_ai_messages: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.mode !== "range") return;
    const start = value.start_at ? Date.parse(value.start_at) : Number.NaN;
    const end = value.end_at ? Date.parse(value.end_at) : Number.NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      context.addIssue({ code: "custom", message: "A valid deletion range is required" });
    }
  });

export const purgeMyLocalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }): Promise<LocalPrivacyPurgeResult> => {
    const { purgeLocalDataOnBackend } = await import("@/lib/privacy-backend.server");
    return purgeLocalDataOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      mode: data.mode,
      ...(data.start_at === undefined ? {} : { start_at: data.start_at }),
      ...(data.end_at === undefined ? {} : { end_at: data.end_at }),
      ...(data.delete_peer_messages === undefined
        ? {}
        : { delete_peer_messages: data.delete_peer_messages }),
      ...(data.delete_ai_messages === undefined
        ? {}
        : { delete_ai_messages: data.delete_ai_messages }),
    });
  });
