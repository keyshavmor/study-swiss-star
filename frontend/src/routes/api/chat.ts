/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import {
  ContextBackendError,
  requestContextAnswer,
  type ContextResponseMetadata,
} from "@/lib/context-backend.server";
import type { Database, Json } from "@/integrations/supabase/types";

type AlimUIMessage = UIMessage<never, { "context-metadata": ContextResponseMetadata }>;

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

async function getUserClient(request: Request) {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Response("Supabase not configured", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return { supabase, userId: data.claims.sub };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabase, userId } = await getUserClient(request);
        const body = (await request.json()) as {
          messages?: UIMessage[];
          threadId?: string;
          academicYear?: string;
          gradeLevel?: number;
          data?: { threadId?: string; academicYear?: string; gradeLevel?: number };
        };

        const messages = body.messages ?? [];
        const threadId = body.threadId ?? body.data?.threadId;

        if (!threadId) {
          return new Response("Thread ID is required", { status: 400 });
        }

        const { data: thread, error: threadError } = await supabase
          .from("threads")
          .select("id, subject")
          .eq("id", threadId)
          .eq("user_id", userId)
          .single();

        if (threadError || !thread) {
          return new Response("Thread not found", { status: 404 });
        }

        const lastMessage = messages[messages.length - 1];
        const question =
          lastMessage?.role === "user"
            ? lastMessage.parts.map((part) => (part.type === "text" ? part.text : "")).join("")
            : "";
        // CONTENT SAFETY GATE (fail closed). Every AI prompt needs an explicit
        // allow verdict from the local safety backend before it is stored or
        // sent for generation. BACKEND TODO FOR CODEX: until that backend
        // exists this returns `safety_unavailable`, so nothing is processed.
        if (lastMessage?.role === "user" && question.trim()) {
          const { moderateContentOnBackend } = await import("@/lib/safety-backend.server");
          const decision = await moderateContentOnBackend({
            accessToken: request.headers.get("authorization")?.replace("Bearer ", "") ?? "",
            studentId: userId,
            surface: "ai_prompt",
            text: question,
          });
          if (decision.verdict !== "allow") {
            // Bounded machine-readable code only — never the offending content.
            return new Response(`safety:${decision.verdict}`, {
              status: decision.verdict === "safety_unavailable" ? 503 : 403,
              headers: { "X-Safety-Verdict": decision.verdict },
            });
          }
        }

        if (lastMessage && lastMessage.role === "user") {

          const { error: insertError } = await supabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            id: lastMessage.id,
            role: lastMessage.role,
            content: lastMessage.parts
              .map((part) => (part.type === "text" ? part.text : ""))
              .join(""),
            parts: lastMessage.parts as Json[],
          });

          if (insertError) {
            console.error("Failed to save user message", insertError);
          }
        }

        if (!lastMessage || lastMessage.role !== "user" || !question.trim()) {
          return new Response("A current user message is required", { status: 400 });
        }

        let contextResponse;
        try {
          const academicYear = body.academicYear ?? body.data?.academicYear;
          const gradeLevel = body.gradeLevel ?? body.data?.gradeLevel;
          contextResponse = await requestContextAnswer({
            studentId: userId,
            threadId,
            userMessageId: lastMessage.id,
            question,
            ...(thread.subject ? { subject: thread.subject } : {}),
            ...(academicYear ? { academicYear } : {}),
            ...(gradeLevel !== undefined ? { gradeLevel } : {}),
          });
        } catch (error) {
          const contextError = error instanceof ContextBackendError ? error : null;
          return new Response(contextError?.message ?? "Local Qwen backend unavailable", {
            status: contextError?.status ?? 503,
          });
        }

        const stream = createUIMessageStream<AlimUIMessage>({
          originalMessages: messages as AlimUIMessage[],
          execute: ({ writer }) => {
            const textId = `text-${contextResponse.message_id}`;
            writer.write({ type: "text-start", id: textId });
            writer.write({ type: "text-delta", id: textId, delta: contextResponse.answer });
            writer.write({ type: "text-end", id: textId });
            writer.write({
              type: "data-context-metadata",
              data: {
                sources: contextResponse.sources,
                examTip: contextResponse.exam_tip,
                usedModel: contextResponse.used_model,
                retrievalSummary: contextResponse.retrieval_summary,
              },
            });
          },
          onFinish: async ({ responseMessage }) => {
            const content = responseMessage.parts
              .map((part) => (part.type === "text" ? part.text : ""))
              .join("");
            const { error } = await supabase.from("messages").insert({
              thread_id: threadId,
              user_id: userId,
              id: responseMessage.id,
              role: "assistant",
              content,
              parts: responseMessage.parts as Json[],
            });
            if (error) console.error("Failed to save assistant message", error);
          },
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
