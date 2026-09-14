/** Alim application component for study, planning, profile, or navigation workflows. */
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/lib/store/app-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

/** Button that turns the optional example content on. */
export function DemoModeButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const { demoMode, setDemoMode } = useAppData();
  if (demoMode) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        setDemoMode(true);
        toast.success(t("misc.demo.onToast"), {
          description: t("misc.demo.onToastDescription"),
        });
      }}
    >
      <Sparkles className="h-4 w-4" />
      {t("misc.demo.viewButton")}
    </Button>
  );
}

/** Persistent banner shown across the app while Demo Mode is active. */
export function DemoModeBanner({ className }: { className?: string }) {
  const { t } = useI18n();
  const { demoMode, setDemoMode } = useAppData();
  if (!demoMode) return null;
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border-strong bg-surface-2 px-4 py-3",
        className,
      )}
    >
      <p className="text-[14px] text-muted-foreground">
        <span className="font-medium text-foreground">{t("misc.demo.bannerTitle")}</span>{" "}
        {t("misc.demo.bannerBody")}
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setDemoMode(false);
          toast.success(t("misc.demo.offToast"), {
            description: t("misc.demo.offToastDescription"),
          });
        }}
      >
        <X className="h-4 w-4" />
        {t("misc.demo.exitButton")}
      </Button>
    </div>
  );
}
