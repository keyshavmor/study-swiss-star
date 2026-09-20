import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getNamedKey(envName: string): string | null {
  const raw = Deno.env.get(envName);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0] ?? null;
  } catch {
    return raw;
  }
}

type DeleteMode = "range" | "all_content" | "delete_account";
type StoredObject = { bucket: string; path: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    getNamedKey("SUPABASE_PUBLISHABLE_KEYS") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    null;
  const secretKey =
    getNamedKey("SUPABASE_SECRET_KEYS") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    null;
  if (!supabaseUrl || !publishableKey || !secretKey)
    return json({ error: "server_configuration" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer "))
    return json({ error: "authentication_required" }, 401);
  const token = authHeader.slice("Bearer ".length);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const userId = userData.user?.id;
  if (userError || !userId) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const mode = body.mode as DeleteMode;
  if (!(["range", "all_content", "delete_account"] as string[]).includes(mode))
    return json({ error: "invalid_mode" }, 400);

  const removeObjects = async (objects: StoredObject[]) => {
    const byBucket = new Map<string, string[]>();
    for (const object of objects) {
      if (!object.bucket || !object.path) continue;
      const list = byBucket.get(object.bucket) ?? [];
      list.push(object.path);
      byBucket.set(object.bucket, list);
    }
    let removed = 0;
    for (const [bucket, paths] of byBucket.entries()) {
      for (let i = 0; i < paths.length; i += 1000) {
        const chunk = paths.slice(i, i + 1000);
        const { error } = await admin.storage.from(bucket).remove(chunk);
        if (error) throw new Error(`storage_remove_failed:${bucket}`);
        removed += chunk.length;
      }
    }
    return removed;
  };

  const listPrefixRecursive = async (
    bucket: string,
    prefix: string,
  ): Promise<string[]> => {
    const found: string[] = [];
    const walk = async (path: string) => {
      let offset = 0;
      for (;;) {
        const { data, error } = await admin.storage
          .from(bucket)
          .list(path, { limit: 1000, offset });
        if (error) throw new Error(`storage_list_failed:${bucket}`);
        const rows = data ?? [];
        for (const row of rows) {
          const full = path ? `${path}/${row.name}` : row.name;
          // Folders returned by Storage do not have an object id/metadata payload.
          if (row.id) found.push(full);
          else await walk(full);
        }
        if (rows.length < 1000) break;
        offset += rows.length;
      }
    };
    await walk(prefix);
    return found;
  };

  try {
    const storageObjects: StoredObject[] = [];

    if (mode === "range") {
      const startAt = typeof body.start_at === "string" ? body.start_at : "";
      const endAt = typeof body.end_at === "string" ? body.end_at : "";
      const start = new Date(startAt);
      const end = new Date(endAt);
      if (
        !startAt ||
        !endAt ||
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        start >= end
      ) {
        return json({ error: "invalid_range" }, 400);
      }
      const deletePeer = body.delete_peer_messages !== false;
      const deleteAi = body.delete_ai_messages !== false;

      if (deletePeer) {
        const { data, error } = await admin
          .from("peer_message_attachments")
          .select("storage_bucket,object_path")
          .eq("owner_user_id", userId)
          .gte("created_at", start.toISOString())
          .lt("created_at", end.toISOString());
        if (error) throw error;
        for (const row of data ?? [])
          storageObjects.push({
            bucket: row.storage_bucket,
            path: row.object_path,
          });
      }
      if (deleteAi) {
        const { data, error } = await admin
          .from("assistant_attachments")
          .select("storage_bucket,object_path")
          .eq("user_id", userId)
          .gte("created_at", start.toISOString())
          .lt("created_at", end.toISOString());
        if (error) throw error;
        for (const row of data ?? [])
          storageObjects.push({
            bucket: row.storage_bucket,
            path: row.object_path,
          });
      }

      const removedStorageObjects = await removeObjects(storageObjects);
      const { data: dbResult, error: dbError } = await admin.rpc(
        "service_delete_user_range",
        {
          p_user_id: userId,
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_delete_peer_messages: deletePeer,
          p_delete_ai_messages: deleteAi,
        },
      );
      if (dbError) throw dbError;
      return json({
        ok: true,
        mode,
        removed_storage_objects: removedStorageObjects,
        database: dbResult,
      });
    }

    // all_content and delete_account: remove known metadata-backed content first.
    for (const table of [
      { name: "peer_message_attachments", owner: "owner_user_id" },
      { name: "assistant_attachments", owner: "user_id" },
      { name: "documents", owner: "user_id" },
    ]) {
      const { data, error } = await admin
        .from(table.name)
        .select("storage_bucket,object_path")
        .eq(table.owner, userId);
      if (error) throw error;
      for (const row of data ?? [])
        if (row.storage_bucket && row.object_path)
          storageObjects.push({
            bucket: row.storage_bucket,
            path: row.object_path,
          });
    }

    // User-scoped textual mirrors and descriptors use first-folder user ids.
    for (const bucket of [
      "feedback-messages",
      "activity-logs",
      "assistant-descriptors",
    ]) {
      for (const path of await listPrefixRecursive(bucket, userId))
        storageObjects.push({ bucket, path });
    }
    if (mode === "delete_account") {
      for (const path of await listPrefixRecursive("profile-avatars", userId))
        storageObjects.push({ bucket: "profile-avatars", path });
    }

    const removedStorageObjects = await removeObjects(storageObjects);
    const { data: dbResult, error: dbError } = await admin.rpc(
      "service_delete_all_user_content",
      { p_user_id: userId },
    );
    if (dbError) throw dbError;

    if (mode === "delete_account") {
      const { error: deleteUserError } =
        await admin.auth.admin.deleteUser(userId);
      if (deleteUserError) throw deleteUserError;
      return json({
        ok: true,
        mode,
        account_deleted: true,
        removed_storage_objects: removedStorageObjects,
        database: dbResult,
      });
    }

    return json({
      ok: true,
      mode,
      account_deleted: false,
      removed_storage_objects: removedStorageObjects,
      database: dbResult,
    });
  } catch (error) {
    console.error(
      "delete-my-data failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json({ error: "delete_failed" }, 500);
  }
});
