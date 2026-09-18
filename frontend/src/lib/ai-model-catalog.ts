/**
 * Selectable local models.
 *
 * CURRENT SUPABASE: `public.ai_model_catalog` is authoritative and read-only
 * for authenticated users. The hard-coded Qwen list is a defensive fallback
 * only, used when the table cannot be read (offline, RLS failure, empty table).
 */
import { supabase } from "@/integrations/supabase/client";
import { QWEN_MODELS } from "@/lib/account-data";

export interface ModelChoice {
  modelId: string;
  displayName: string;
}

export const FALLBACK_MODEL_CHOICES: ModelChoice[] = QWEN_MODELS.map((modelId) => ({
  modelId,
  displayName: modelId,
}));

export interface ModelCatalogResult {
  choices: ModelChoice[];
  /** True when the local fallback list was used instead of Supabase. */
  usedFallback: boolean;
}

export async function fetchModelCatalog(): Promise<ModelCatalogResult> {
  try {
    const { data, error } = await supabase
      .from("ai_model_catalog")
      .select("model_id, display_name, enabled, sort_order")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return { choices: FALLBACK_MODEL_CHOICES, usedFallback: true };
    const choices = data
      .filter((row) => typeof row.model_id === "string" && row.model_id.length > 0)
      .map((row) => ({
        modelId: row.model_id,
        displayName: row.display_name || row.model_id,
      }));
    return choices.length
      ? { choices, usedFallback: false }
      : { choices: FALLBACK_MODEL_CHOICES, usedFallback: true };
  } catch {
    return { choices: FALLBACK_MODEL_CHOICES, usedFallback: true };
  }
}
