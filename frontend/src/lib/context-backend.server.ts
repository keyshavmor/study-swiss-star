/** Frontend utility or server adapter used by the local Alim application. */
import type { ContextChatResponse } from "@/lib/context-backend.types";

export type { ContextResponseMetadata } from "@/lib/context-backend.types";

export class ContextBackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ContextBackendError";
  }
}

export async function requestContextAnswer(input: {
  accessToken: string;
  threadId: string;
  userMessageId?: string;
  question: string;
  subject?: string;
  academicYear?: string;
  gradeLevel?: number;
}): Promise<ContextChatResponse> {
  const baseUrl = (process.env["ALIM_CONTEXT_BACKEND_URL"] ?? "http://127.0.0.1:8001").replace(
    /\/$/,
    "",
  );
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env["ALIM_CONTEXT_BACKEND_TIMEOUT_MS"] ?? 90_000),
  );
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: JSON.stringify({
        thread_id: input.threadId,
        user_message_id: input.userMessageId,
        question: input.question,
        subject_id: normalizeSubjectId(input.subject),
        language: languageForSubject(input.subject),
        academic_year: input.academicYear,
        grade_level: input.gradeLevel,
        include_sources: true,
        allow_web: true,
        stream: false,
      }),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as
      ContextChatResponse | { error?: { code?: string; message?: string } } | null;
    if (!response.ok) {
      const error = payload && "error" in payload ? payload.error : undefined;
      throw new ContextBackendError(
        error?.message ?? `Context backend returned HTTP ${response.status}`,
        response.status,
        error?.code ?? "context_backend_error",
      );
    }
    if (!payload || !("answer" in payload) || typeof payload.answer !== "string") {
      throw new ContextBackendError(
        "Context backend returned an invalid response",
        502,
        "invalid_response",
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof ContextBackendError) throw error;
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Context backend request timed out"
        : "Context backend is unavailable";
    throw new ContextBackendError(message, 503, "context_backend_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSubjectId(subject?: string): string | undefined {
  if (!subject || subject === "All subjects") return undefined;
  const known: Record<string, string> = {
    "spf biology & chemistry": "spf",
    "spf biology": "spf-biology",
    "spf chemistry": "spf-chemistry",
    "political education": "political-education",
    "pedagogics and psychology": "pedagogics-psychology",
  };
  const normalized = subject.trim().toLowerCase();
  return known[normalized] ?? normalized.replace(/\s+/g, "-");
}

function languageForSubject(subject?: string): "de" | "en" | "fr" | undefined {
  const normalized = subject?.trim().toLowerCase();
  if (!normalized || normalized === "all subjects") return undefined;
  if (["mathematics", "physics", "english", "history"].includes(normalized)) return "en";
  if (normalized === "french") return "fr";
  return "de";
}
