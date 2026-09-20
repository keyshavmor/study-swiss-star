/** Reject privileged Supabase credentials at every publishable-key boundary. */
export function assertPublishableSupabaseKey(value: string): void {
  if (value.startsWith("sb_secret_")) {
    throw new Error("A Supabase secret key cannot be used as a publishable key");
  }

  const parts = value.split(".");
  if (parts.length !== 3) return;
  try {
    const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as Record<string, unknown>;
    if (claims["role"] === "service_role") {
      throw new Error("A Supabase service-role JWT cannot be used as a publishable key");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("service-role JWT")) throw error;
    // An opaque/legacy non-decodable value is left for the Supabase client to
    // validate. Never include credential material in the error message.
  }
}
