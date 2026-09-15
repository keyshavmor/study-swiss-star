import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-storage-cleanup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
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
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getNamedKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? null;
  const secretKey = getNamedKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
  if (!supabaseUrl || !secretKey) return json({ error: "server_configuration" }, 500);

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Two trusted invocation modes:
  // 1) scheduled internal invocation with a Vault-held secret;
  // 2) an authenticated user pressing the manual cleanup control.
  let authorized = false;
  const internalSecret = req.headers.get("x-storage-cleanup-secret") ?? "";
  if (internalSecret) {
    const { data, error } = await admin.rpc("verify_storage_capacity_cleanup_secret", { p_secret: internalSecret });
    authorized = !error && data === true;
  }

  if (!authorized) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!publishableKey || !authHeader.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await userClient.auth.getUser();
    authorized = !error && Boolean(data.user);
  }

  if (!authorized) return json({ error: "unauthorized" }, 401);

  let runToken: string | null = null;
  let freedBytes = 0;
  let deletedCount = 0;
  let metadataDeleted = 0;

  try {
    const { data: beginRows, error: beginError } = await admin.rpc("begin_emergency_storage_cleanup");
    if (beginError) throw beginError;
    const begin = Array.isArray(beginRows) ? beginRows[0] : null;
    if (!begin) {
      return json({ ok: true, action: "none", reason: "below_90_percent_or_cleanup_already_running" });
    }

    runToken = begin.run_token as string;
    const targetBytes = Number(begin.target_delete_bytes ?? 0);
    const { data: candidates, error: candidatesError } = await admin.rpc("get_emergency_cleanup_candidates", { p_target_bytes: targetBytes });
    if (candidatesError) throw candidatesError;

    const rows = (candidates ?? []) as Array<{ bucket_id: string; object_path: string; size_bytes: number | string; created_at: string }>;
    const byBucket = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byBucket.get(row.bucket_id) ?? [];
      list.push(row);
      byBucket.set(row.bucket_id, list);
    }

    for (const [bucket, bucketRows] of byBucket.entries()) {
      for (let i = 0; i < bucketRows.length; i += 1000) {
        const chunk = bucketRows.slice(i, i + 1000);
        const paths = chunk.map((row) => row.object_path);
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) {
          console.error("storage cleanup remove failed", bucket, removeError.message);
          continue;
        }

        for (const row of chunk) {
          const bytes = Number(row.size_bytes ?? 0);
          freedBytes += Number.isFinite(bytes) ? Math.max(bytes, 0) : 0;
          deletedCount += 1;
        }

        // Delete associated DB records, not storage.objects directly. The documents
        // FK cascades derived document_chunks. Attachment FKs safely SET NULL where configured.
        if (bucket === "chat-attachments") {
          const { data, error } = await admin
            .from("assistant_attachments")
            .delete()
            .eq("storage_bucket", bucket)
            .in("object_path", paths)
            .select("id");
          if (error) console.error("attachment metadata cleanup failed", error.message);
          else metadataDeleted += data?.length ?? 0;
        } else if (bucket === "user-materials") {
          const { data, error } = await admin
            .from("documents")
            .delete()
            .eq("storage_bucket", bucket)
            .in("object_path", paths)
            .select("id");
          if (error) console.error("document metadata cleanup failed", error.message);
          else metadataDeleted += data?.length ?? 0;
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
      policy: { trigger_used_percent: 90, target_used_percent: 80 },
      target_bytes: targetBytes,
      freed_bytes: freedBytes,
      deleted_storage_objects: deletedCount,
      deleted_database_records: metadataDeleted,
    });
  } catch (error) {
    console.error("storage capacity cleanup failed", error);
    if (runToken) {
      await admin.rpc("finish_emergency_storage_cleanup", { p_run_token: runToken, p_freed_bytes: freedBytes });
    }
    return json({ error: "cleanup_failed" }, 500);
  }
});
