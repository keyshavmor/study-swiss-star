/**
 * Authenticated server functions for content safety and peer-message delivery.
 *
 * FAIL CLOSED: when the local safety backend is unavailable, the verdict is
 * `safety_unavailable` and nothing is sent or generated. The browser never
 * inserts `peer_messages` directly — production RLS forbids it by design.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PEER_ATTACHMENT_MAX_BYTES } from "@/lib/attachment-processing";
import type { PeerSendResult, SafetyDecision } from "@/lib/safety.types";

function callerAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

const attachmentSchema = z.object({
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(120),
  byte_size: z.number().int().positive().max(PEER_ATTACHMENT_MAX_BYTES),
  data_base64: z.string().min(1),
});

export const moderateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        surface: z.enum(["peer_message", "ai_prompt", "attachment"]),
        text: z.string().max(20_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<SafetyDecision> => {
    const { moderateContentOnBackend } = await import("@/lib/safety-backend.server");
    return moderateContentOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      surface: data.surface,
      text: data.text,
    });
  });

export const sendPeerMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        body: z.string().max(8_000),
        attachments: z.array(attachmentSchema).max(5).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<PeerSendResult> => {
    const { sendPeerMessageOnBackend } = await import("@/lib/safety-backend.server");
    return sendPeerMessageOnBackend({
      accessToken: callerAccessToken(),
      studentId: context.userId,
      conversationId: data.conversationId,
      body: data.body,
      attachments: data.attachments,
    });
  });
