import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPECTED_SECRET_SHA256 =
  "1ac957453836a8aa3a948afcad4fc4cdbb12256100e82ad318408d3418d4702c";

function corsHeaders() {
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  const supplied = req.headers.get("x-retention-secret") ?? "";
  if (!supplied || (await sha256Hex(supplied)) !== EXPECTED_SECRET_SHA256) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "server_configuration" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();

  const { data: rows, error: queueError } = await supabase
    .from("media_retention_queue")
    .select(
      "id,user_id,storage_bucket,object_path,descriptor_bucket,descriptor_path",
    )
    .eq("status", "ready")
    .lte("delete_after", now)
    .order("delete_after", { ascending: true })
    .limit(100);

  if (queueError) {
    return new Response(JSON.stringify({ error: "queue_read_failed" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  let deleted = 0;
  let deferred = 0;

  for (const row of rows ?? []) {
    const ownerPrefix = `${row.user_id}/`;
    if (
      !row.object_path.startsWith(ownerPrefix) ||
      !row.descriptor_path.startsWith(ownerPrefix)
    ) {
      await supabase
        .from("media_retention_queue")
        .update({ error_code: "PATH_OWNER_MISMATCH" })
        .eq("id", row.id);
      deferred += 1;
      continue;
    }

    // Never delete an original unless its textual descriptor is already durable.
    if (
      row.descriptor_bucket !== "assistant-descriptors" ||
      !row.descriptor_path
    ) {
      await supabase
        .from("media_retention_queue")
        .update({ error_code: "DESCRIPTOR_PATH_INVALID" })
        .eq("id", row.id);
      deferred += 1;
      continue;
    }

    const { error: descriptorError } = await supabase.storage
      .from(row.descriptor_bucket)
      .download(row.descriptor_path);
    if (descriptorError) {
      await supabase
        .from("media_retention_queue")
        .update({ error_code: "DESCRIPTOR_MISSING" })
        .eq("id", row.id);
      deferred += 1;
      continue;
    }

    const { error: removeError } = await supabase.storage
      .from(row.storage_bucket)
      .remove([row.object_path]);
    if (removeError) {
      await supabase
        .from("media_retention_queue")
        .update({ error_code: "STORAGE_DELETE_FAILED" })
        .eq("id", row.id);
      deferred += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("media_retention_queue")
      .update({ status: "deleted", deleted_at: now, error_code: null })
      .eq("id", row.id);

    if (updateError) {
      deferred += 1;
    } else {
      deleted += 1;
    }
  }

  return new Response(
    JSON.stringify({ scanned: (rows ?? []).length, deleted, deferred }),
    {
      status: 200,
      headers: corsHeaders(),
    },
  );
});
