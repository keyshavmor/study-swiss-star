/** Server-only, fail-closed adapter for caller-owned local data deletion. */
import {
  PRIVACY_ENDPOINTS,
  localBackendBaseUrl,
  localBackendTimeoutMs,
} from "@/lib/local-backend-endpoints";

export interface LocalPrivacyPurgeInput {
  accessToken: string;
  studentId: string;
  mode: "range" | "all_content" | "delete_account";
  start_at?: string;
  end_at?: string;
  delete_peer_messages?: boolean;
  delete_ai_messages?: boolean;
}

export interface LocalPrivacyPurgeResult {
  ok: true;
  mode: LocalPrivacyPurgeInput["mode"];
  deleted_local_records: number;
  removed_runtime_references: number;
}

export async function purgeLocalDataOnBackend(
  input: LocalPrivacyPurgeInput,
): Promise<LocalPrivacyPurgeResult> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    localBackendTimeoutMs("ALIM_PRIVACY_BACKEND_TIMEOUT_MS", 30_000),
  );
  try {
    const response = await fetch(`${localBackendBaseUrl()}${PRIVACY_ENDPOINTS.purgeLocal}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
        "X-Student-Id": input.studentId,
      },
      body: JSON.stringify({
        mode: input.mode,
        ...(input.start_at ? { start_at: input.start_at } : {}),
        ...(input.end_at ? { end_at: input.end_at } : {}),
        ...(input.delete_peer_messages === undefined
          ? {}
          : { delete_peer_messages: input.delete_peer_messages }),
        ...(input.delete_ai_messages === undefined
          ? {}
          : { delete_ai_messages: input.delete_ai_messages }),
      }),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !response.ok ||
      payload?.["ok"] !== true ||
      payload["mode"] !== input.mode ||
      typeof payload["deleted_local_records"] !== "number" ||
      typeof payload["removed_runtime_references"] !== "number"
    ) {
      throw new Error("Local data deletion could not be completed");
    }
    return payload as unknown as LocalPrivacyPurgeResult;
  } catch (error) {
    if (error instanceof Error && error.message === "Local data deletion could not be completed") {
      throw error;
    }
    throw new Error("Local data deletion could not be completed", { cause: error });
  } finally {
    clearTimeout(timer);
  }
}
