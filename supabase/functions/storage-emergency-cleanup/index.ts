import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const authHeader = req.headers.get("Authorization");
  const publishableKey =
    getNamedKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? null;
  const secretKey =
    getNamedKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;

  if (!supabaseUrl || !publishableKey || !secretKey || !authHeader) {
    return json({ error: "Function authentication is not configured" }, 500);
  }

  // verify_jwt is enabled at the platform boundary; this second check makes sure
  // the caller is an actual signed-in user rather than an anonymous API-key request.
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let runToken: string | null = null;
  let freedBytes = 0;

  try {
    const { data: beginRows, error: beginError } = await admin.rpc(
      "begin_emergency_storage_cleanup",
    );
    if (beginError) throw beginError;

    const begin = Array.isArray(beginRows) ? beginRows[0] : null;
    if (!begin) {
      return json({
        ok: true,
        action: "none",
        reason: "Storage is above the emergency threshold or another cleanup is already running.",
      });
    }

    runToken = begin.run_token as string;
    const targetBytes = Number(begin.target_delete_bytes ?? 0);

    const { data: candidates, error: candidatesError } = await admin.rpc(
      "get_emergency_cleanup_candidates",
      { p_target_bytes: targetBytes },
    );
    if (candidatesError) throw candidatesError;

    const rows = (candidates ?? []) as Array<{
      bucket_id: string;
      object_path: string;
      size_bytes: number | string;
      created_at: string;
    }>;

    const byBucket = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byBucket.get(row.bucket_id) ?? [];
      list.push(row);
      byBucket.set(row.bucket_id, list);
    }

    const deleted: Array<{ bucket: string; path: string; bytes: number }> = [];

    for (const [bucket, bucketRows] of byBucket.entries()) {
      for (let i = 0; i < bucketRows.length; i += 1000) {
        const chunk = bucketRows.slice(i, i + 1000);
        const paths = chunk.map((row) => row.object_path);
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) {
          console.error("Storage cleanup remove failed", bucket, removeError.message);
          continue;
        }

        for (const row of chunk) {
          const bytes = Number(row.size_bytes ?? 0);
          freedBytes += Number.isFinite(bytes) ? Math.max(bytes, 0) : 0;
          deleted.push({ bucket, path: row.object_path, bytes });
        }

        if (bucket === "chat-attachments") {
          const { error } = await admin
            .from("assistant_attachments")
            .update({ deleted_at: new Date().toISOString() })
            .eq("storage_bucket", bucket)
            .in("object_path", paths);
          if (error) console.error("Attachment metadata cleanup failed", error.message);
        } else if (bucket === "user-materials") {
          const { error } = await admin
            .from("documents")
            .update({
              storage_bucket: null,
              object_path: null,
              status: "Deleted by emergency storage cleanup",
              archived: true,
              updated_at: new Date().toISOString(),
            })
            .eq("storage_bucket", bucket)
            .in("object_path", paths);
          if (error) console.error("Document metadata cleanup failed", error.message);
        }
      }
    }

    const { error: finishError } = await admin.rpc("finish_emergency_storage_cleanup", {
      p_run_token: runToken,
      p_freed_bytes: freedBytes,
    });
    if (finishError) throw finishError;

    return json({
      ok: true,
      action: "cleanup",
      target_bytes: targetBytes,
      freed_bytes: freedBytes,
      deleted_count: deleted.length,
    });
  } catch (error) {
    console.error("Emergency storage cleanup failed", error);
    if (runToken) {
      await admin.rpc("finish_emergency_storage_cleanup", {
        p_run_token: runToken,
        p_freed_bytes: freedBytes,
      });
    }
    return json(
      { error: error instanceof Error ? error.message : "Emergency cleanup failed" },
      500,
    );
  }
});
