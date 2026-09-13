/** Frontend utility or server adapter used by the local Alim application. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

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
  message: z.unknown(),
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
    return (data ?? []).map((thread) => ({ ...thread, subject: thread.subject ?? "" }));
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => ThreadInput.parse(input))
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

    if (error || !row) throw new Error(error?.message ?? "Thread not found");
    return { ...row, subject: row.subject ?? "" };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => ThreadIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("threads")
      .select("id, title, subject, updated_at")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .single();

    if (error || !row) throw new Error(error?.message ?? "Thread not found");
    return { ...row, subject: row.subject ?? "" };
  });

export const updateThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => UpdateThreadInput.parse(input))
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

    if (error || !row) throw new Error(error?.message ?? "Thread not found");
    return { ...row, subject: row.subject ?? "" };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => ThreadIdInput.parse(input))
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
  .validator((input) => ThreadIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("messages")
      .select("id, role, content, parts, created_at")
      .eq("thread_id", data.threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      parts: (row.parts ?? []) as Json[],
    }));
  });

export const saveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => SaveMessageInput.parse(input))
  .handler(async ({ data, context }) => {
    const message = data.message as {
      id: string;
      role: string;
      content: string;
      parts: unknown[];
    };
    const { error } = await context.supabase.from("messages").insert({
      thread_id: data.threadId,
      user_id: context.userId,
      id: message.id,
      role: message.role,
      content: message.content,
      parts: message.parts as Json[],
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });
