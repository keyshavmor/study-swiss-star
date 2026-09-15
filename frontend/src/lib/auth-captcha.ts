/** Public configuration for the production Auth CAPTCHA widget. */
export type AuthCaptchaProvider = "hcaptcha";

export interface AuthCaptchaConfig {
  provider: AuthCaptchaProvider;
  siteKey: string;
}

export interface CaptchaAuthOptions {
  captchaToken: string;
}

export function resolveAuthCaptchaConfig(values: {
  provider?: string;
  siteKey?: string;
}): AuthCaptchaConfig | null {
  const provider = values.provider?.trim().toLowerCase();
  const siteKey = values.siteKey?.trim();
  if (provider !== "hcaptcha" || !siteKey) return null;
  return { provider, siteKey };
}

export function getAuthCaptchaConfig(): AuthCaptchaConfig | null {
  return resolveAuthCaptchaConfig({
    provider: import.meta.env["VITE_AUTH_CAPTCHA_PROVIDER"],
    siteKey: import.meta.env["VITE_AUTH_CAPTCHA_SITE_KEY"],
  });
}

/** Password Auth requests are rejected by production unless this token is present. */
export function requireAuthCaptchaToken(token: string | null): string {
  if (!token) throw new Error("captcha_required");
  return token;
}

export function captchaAuthOptions(token: string | null): CaptchaAuthOptions {
  return { captchaToken: requireAuthCaptchaToken(token) };
}
