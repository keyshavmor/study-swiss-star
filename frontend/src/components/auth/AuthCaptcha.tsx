import { useEffect, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { getAuthCaptchaConfig } from "@/lib/auth-captcha";
import { useI18n } from "@/lib/i18n/provider";

const AUTH_CAPTCHA_CONFIG = getAuthCaptchaConfig();

export function AuthCaptcha({
  onToken,
  resetNonce,
}: {
  onToken: (token: string | null) => void;
  resetNonce: number;
}) {
  const { t } = useI18n();
  const captchaRef = useRef<HCaptcha>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    onTokenRef.current(null);
    captchaRef.current?.resetCaptcha();
  }, [resetNonce]);

  if (!AUTH_CAPTCHA_CONFIG || AUTH_CAPTCHA_CONFIG.provider !== "hcaptcha") {
    return (
      <p role="alert" className="text-[13px] text-destructive">
        {t("auth.captchaUnavailable")}
      </p>
    );
  }

  return (
    <div className="min-h-[65px] overflow-hidden">
      <HCaptcha
        ref={captchaRef}
        sitekey={AUTH_CAPTCHA_CONFIG.siteKey}
        size="compact"
        reCaptchaCompat={false}
        sentry={false}
        onVerify={(token) => onTokenRef.current(token)}
        onExpire={() => onTokenRef.current(null)}
        onChalExpired={() => onTokenRef.current(null)}
        onError={() => onTokenRef.current(null)}
      />
    </div>
  );
}
