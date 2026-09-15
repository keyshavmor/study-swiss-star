import { useEffect, useRef } from "react";
import { getAuthCaptchaConfig, type AuthCaptchaProvider } from "@/lib/auth-captcha";
import { useI18n } from "@/lib/i18n/provider";

interface CaptchaApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme: "auto";
    },
  ) => string | number;
  remove?: (widgetId: string | number) => void;
}

declare global {
  interface Window {
    turnstile?: CaptchaApi;
    hcaptcha?: CaptchaApi;
  }
}

const SCRIPT_IDS: Record<AuthCaptchaProvider, string> = {
  turnstile: "alim-auth-turnstile",
  hcaptcha: "alim-auth-hcaptcha",
};

const SCRIPT_URLS: Record<AuthCaptchaProvider, string> = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit",
};

function providerApi(provider: AuthCaptchaProvider): CaptchaApi | undefined {
  return provider === "turnstile" ? window.turnstile : window.hcaptcha;
}

export function AuthCaptcha({
  onToken,
  resetNonce,
}: {
  onToken: (token: string | null) => void;
  resetNonce: number;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const config = getAuthCaptchaConfig();

  onTokenRef.current = onToken;

  useEffect(() => {
    onTokenRef.current(null);
    if (!config || !containerRef.current) return;

    let disposed = false;
    let widgetId: string | number | undefined;
    const render = () => {
      const api = providerApi(config.provider);
      const container = containerRef.current;
      if (disposed || !api || !container) return;
      container.replaceChildren();
      widgetId = api.render(container, {
        sitekey: config.siteKey,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
        theme: "auto",
      });
    };

    const scriptId = SCRIPT_IDS[config.provider];
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (providerApi(config.provider)) render();
    else if (existing) existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = SCRIPT_URLS[config.provider];
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      const api = providerApi(config.provider);
      if (widgetId !== undefined) api?.remove?.(widgetId);
      existing?.removeEventListener("load", render);
    };
  }, [config?.provider, config?.siteKey, resetNonce]);

  if (!config) {
    return (
      <p role="alert" className="text-[13px] text-destructive">
        {t("auth.captchaUnavailable")}
      </p>
    );
  }

  return <div ref={containerRef} className="min-h-[65px] overflow-hidden" />;
}
