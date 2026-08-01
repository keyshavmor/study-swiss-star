import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { UIMessage } from "ai";

const ThreadInput = z.object({
  title: z.string().min(1).max(140),
  subject: z.string().min(1).max(80),
});

const ThreadIdInput = z.object({
  threadId: z.string().uuid(),
});

const UpdateThreadInput = z.object({
  threadId: z.string().uuid(),
  title: z.string().min(1).max(140).optional(),
  subject: z.string().min(1).max(80).optional(),
});

const SaveMessageInput = z.object({
  threadId: z.string().uuid(),
  message: z.custom<UIMessage>((val) => {
    if (typeof val !== "object" || val === null) return false;
    const obj = val as Record<string, unknown>;
    return (
      typeof obj.id === "string" &&
      (obj.role === "user" || obj.role === "assistant" || obj.role === "system" || obj.role === "data") &&
      (typeof obj.content === "string" || Array.isArray(obj.content)) &&
      Array.isArray(obj.parts)
    );
  }),
});

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id, title, subject, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThreadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("threads")
      .insert({
        user_id: context.userId,
        title: data.title,
        subject: data.subject,
      })
      .select("id, title, subject, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThreadIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("threads")
      .select("id, title, subject, updated_at")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const updateThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateThreadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("threads")
      .update({
        ...(data.title ? { title: data.title } : {}),
        ...(data.subject ? { subject: data.subject } : {}),
      })
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .select("id, title, subject, updated_at")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThreadIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .delete()
      .eq("id", data.threadId)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThreadIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data, error } = await context.supabase
      .from("messages")
      .select("id, role, content, parts, created_at")
      .eq("thread_id", data.threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      role: row.role as "user" | "assistant" | "system" | "data",
      content: row.content as string,
      parts: (row.parts ?? []) as UIMessage["parts"],
    }));
  });

export const saveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SaveMessageInput.parse(input))
  .handler(async ({ data, context }) => {
    const { message } = data;
    const { error } = await context.supabase.from("messages").insert({
      thread_id: data.threadId,
      user_id: context.userId,
      id: message.id,
      role: message.role,
      content: message.content,
      parts: message.parts,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });
