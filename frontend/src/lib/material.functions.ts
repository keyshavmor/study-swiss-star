/** Authenticated bridge from a private Storage object to local document indexing. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IngestMaterialInput = z.object({
  documentId: z.string().uuid(),
  storagePath: z.string().min(3),
  originalFilename: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  subject: z.string().min(1).max(120),
  documentType: z.string().min(1).max(80),
  section: z.string().max(120).optional(),
  notes: z.string().max(4_000).optional(),
});

export const ingestMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => IngestMaterialInput.parse(input))
  .handler(async ({ data, context }) => {
    const baseUrl = (process.env["ALIM_CONTEXT_BACKEND_URL"] ?? "http://127.0.0.1:8001").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${baseUrl}/api/context/documents/storage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${context.accessToken}`,
      },
      body: JSON.stringify({
        document_id: data.documentId,
        storage_path: data.storagePath,
        original_filename: data.originalFilename,
        title: data.title,
        subject: data.subject,
        document_type: data.documentType,
        section: data.section,
        metadata: { notes: data.notes },
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { document_id: string; chunks_indexed: number; token_count: number }
      | { error?: { message?: string } }
      | null;
    if (!response.ok) {
      const message = payload && "error" in payload ? payload.error?.message : undefined;
      throw new Error(message ?? `Local material indexer returned HTTP ${response.status}`);
    }
    return payload;
  });
