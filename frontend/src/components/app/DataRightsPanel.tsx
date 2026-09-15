/** Data-deletion controls: range, all-content and account deletion. */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n/provider";
import {
  requestMyDataDeletion,
  type DeleteMyDataMode,
} from "@/lib/system-health";
import { clearAdmissionSession } from "@/lib/admission-session";
import { clearAiSession } from "@/lib/ai-session";
import { clearMessagingSessionState } from "@/lib/messaging-session";
import { invalidateStartupCache } from "@/lib/startup-flow";
import { signOutCompletely } from "@/lib/sign-out";
import { track, trackFailure } from "@/lib/telemetry";

const CONFIRM_WORD = "DELETE";

export function DataRightsPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [includePeer, setIncludePeer] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);

  const [pendingMode, setPendingMode] = useState<DeleteMyDataMode | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"done" | "failed" | null>(null);

  const openConfirm = (mode: DeleteMyDataMode) => {
    setPendingMode(mode);
    setConfirmText("");
    setResult(null);
  };

  const runDeletion = async () => {
    if (!pendingMode) return;
    setBusy(true);
    setResult(null);
    try {
      const outcome = await requestMyDataDeletion(
        pendingMode === "range"
          ? {
              mode: "range",
              startAt: start ? new Date(start).toISOString() : undefined,
              endAt: end ? new Date(end).toISOString() : undefined,
              includePeer,
              includeAi,
            }
          : { mode: pendingMode },
      );
      track({ event_name: "data_rights_deletion_completed", feature: "data_rights" });
      setResult("done");
      setPendingMode(null);
      if (outcome.account_deleted) {
        clearAiSession();
        clearAdmissionSession();
        clearMessagingSessionState();
        invalidateStartupCache();
        await signOutCompletely();
        await navigate({ to: "/", replace: true });
      }
    } catch (err) {
      trackFailure("data_rights_deletion_failed", err, { feature: "data_rights" });
      setResult("failed");
    } finally {
      setBusy(false);
    }
  };

  const rangeValid = (includePeer || includeAi) && start && end;

  return (
    <div className="space-y-5">
      <section className="app-card space-y-4 p-5 sm:p-6">
        <header className="space-y-1">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{t("dataRights.title")}</h2>
          <p className="text-[14px] text-muted-foreground">{t("dataRights.subtitle")}</p>
        </header>

        <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-3">
          <p className="text-[15px] font-medium">{t("dataRights.range.title")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rangeStart">{t("dataRights.range.start")}</Label>
              <Input
                id="rangeStart"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rangeEnd">{t("dataRights.range.end")}</Label>
              <Input
                id="rangeEnd"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-[14px]">
              <Switch checked={includePeer} onCheckedChange={setIncludePeer} />
              {t("dataRights.range.includePeer")}
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <Switch checked={includeAi} onCheckedChange={setIncludeAi} />
              {t("dataRights.range.includeAi")}
            </label>
          </div>
          {!rangeValid && (
            <p className="text-[13px] text-muted-foreground">{t("dataRights.range.needsSelection")}</p>
          )}
          <Button variant="outline" disabled={!rangeValid} onClick={() => openConfirm("range")}>
            {t("dataRights.range.action")}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-2">
          <p className="text-[15px] font-medium">{t("dataRights.allContent.title")}</p>
          <p className="text-[13px] text-muted-foreground">{t("dataRights.allContent.body")}</p>
          <Button variant="outline" onClick={() => openConfirm("all_content")}>
            {t("dataRights.allContent.action")}
          </Button>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="text-[15px] font-medium text-destructive">{t("dataRights.account.title")}</p>
          <p className="text-[13px] text-muted-foreground">{t("dataRights.account.body")}</p>
          <Button variant="destructive" onClick={() => openConfirm("delete_account")}>
            {t("dataRights.account.action")}
          </Button>
        </div>

        {result === "done" && <p className="text-[13px] text-success">{t("dataRights.done")}</p>}
        {result === "failed" && <p className="text-[13px] text-destructive">{t("dataRights.failed")}</p>}

        <p className="text-[12px] text-muted-foreground">{t("dataRights.retentionNote")}</p>
        <div className="flex flex-wrap gap-3 text-[13px]">
          <Link to="/legal/terms" className="text-primary underline">
            {t("dataRights.legalLinks")}
          </Link>
        </div>
      </section>

      <AlertDialog open={pendingMode !== null} onOpenChange={(open) => !open && setPendingMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dataRights.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dataRights.confirm.typeToConfirm", { word: t("dataRights.confirm.word") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("dataRights.confirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText.trim() !== CONFIRM_WORD || busy}
              onClick={(e) => {
                e.preventDefault();
                void runDeletion();
              }}
            >
              {busy ? t("dataRights.working") : t("dataRights.confirm.proceed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
