import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

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
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
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
          data?: { threadId?: string };
        };

        const messages = body.messages ?? [];
        const threadId = body.threadId ?? body.data?.threadId;

        if (!threadId) {
          return new Response("Thread ID is required", { status: 400 });
        }

        const { data: thread, error: threadError } = await supabase
          .from("threads")
          .select("id")
          .eq("id", threadId)
          .eq("user_id", userId)
          .single();

        if (threadError || !thread) {
          return new Response("Thread not found", { status: 404 });
        }

        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "user") {
          const { error: insertError } = await supabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            id: lastMessage.id,
            role: lastMessage.role,
            content: lastMessage.parts
              .map((part) => (part.type === "text" ? part.text : ""))
              .join(""),
            parts: lastMessage.parts as unknown[],
          });

          if (insertError) {
            console.error("Failed to save user message", insertError);
          }
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("Missing AI configuration", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("openai/gpt-5.6-sol"),
          messages: await convertToModelMessages(messages),
          providerOptions: { lovable: { reasoningEffort: "none" } },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ response }) => {
            const assistant = response.messages.find((m) => m.role === "assistant");
            if (!assistant) return;
            const content = assistant.content
              .map((part) => (part.type === "text" ? part.text : ""))
              .join("");
            const { error } = await supabase.from("messages").insert({
              thread_id: threadId,
              user_id: userId,
              id: assistant.id,
              role: "assistant",
              content,
              parts: assistant.content as unknown[],
            });
            if (error) {
              console.error("Failed to save assistant message", error);
            }
          },
        });
      },
    },
  },
});
