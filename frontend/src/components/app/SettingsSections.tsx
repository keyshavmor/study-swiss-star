/**
 * Settings sections: account/profile, local model choice, storage management
 * and study preferences. All values are stored in Supabase (profiles,
 * user_preferences, Storage) under the signed-in user's own session.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Trash2, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ModelReadinessPanel } from "@/components/app/ModelReadinessPanel";
import { useAiAvailability } from "@/lib/ai-availability";
import {
  DEFAULT_PREFERENCES,
  avatarSignedUrl,
  fetchAccountProfile,
  fetchPreferences,
  removeAvatar,
  savePreferences,
  updateAccountProfile,
  uploadAvatar,
  type AccountProfile,
  type UserPreferences,
} from "@/lib/account-data";
import {
  deleteStorageItems,
  fetchStorageUsage,
  formatBytes,
  invokeEmergencyCleanup,
  listStorageItems,
  type StorageItem,
  type StorageItemKind,
} from "@/lib/storage-management";
import type { StorageUsageStatus } from "@/integrations/supabase/types";
import {
  getMessagingPreferences,
  saveMessagingPreferences,
  type MessagingPreferences,
} from "@/lib/messaging-preferences";
import { fetchLocalBackendHealth } from "@/lib/system.functions";
import { fetchAccountCompliance, fetchLegalConsents } from "@/lib/compliance";
import { toast } from "sonner";
import { track, trackFailure } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { speechSupported } from "@/lib/speech";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card space-y-5 p-5 sm:p-6">
      <header className="space-y-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description && <p className="text-[14px] text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------- account --- */

export function AccountSection() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [{ data: userData }, loaded] = await Promise.all([
        supabase.auth.getUser(),
        fetchAccountProfile(),
      ]);
      setEmail(userData.user?.email ?? "");
      setProfile(loaded);
      setAvatarUrl(loaded?.photoPath ? await avatarSignedUrl(loaded.photoPath) : "");
    } catch (err) {
      toast.error(t("settings.account.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (next: Partial<AccountProfile>) =>
    setProfile((current) => (current ? { ...current, ...next } : current));

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateAccountProfile({
        username: profile.username,
        fullName: profile.fullName,
        preferredName: profile.preferredName,
        nationality: profile.nationality,
        contactPhone: profile.contactPhone,
        contactDetails: profile.contactDetails,
      });
      track({ event_name: "settings_profile_saved", feature: "settings" });
      toast.success(t("settings.account.profileSaved"));
    } catch (err) {
      trackFailure("settings_profile_save_failed", err, { feature: "settings" });
      toast.error(t("settings.account.profileSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      const path = await uploadAvatar(file);
      patch({ photoPath: path });
      setAvatarUrl(await avatarSignedUrl(path));
      track({ event_name: "settings_avatar_updated", feature: "settings" });
      toast.success(t("settings.account.avatarUpdated"));
    } catch (err) {
      trackFailure("settings_avatar_update_failed", err, { feature: "settings" });
      toast.error(t("settings.account.avatarUpdateError"));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar();
      patch({ photoPath: "" });
      setAvatarUrl("");
      track({ event_name: "settings_avatar_removed", feature: "settings" });
      toast.success(t("settings.account.avatarRemoved"));
    } catch (err) {
      trackFailure("settings_avatar_remove_failed", err, { feature: "settings" });
      toast.error(t("settings.account.avatarRemoveError"));
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      trackFailure("settings_email_change_failed", error, { feature: "settings" });
      console.error("account update failed", error);
      toast.error(t("settings.account.updateError"));
      return;
    }
    track({ event_name: "settings_email_change_requested", feature: "settings" });
    setNewEmail("");
    toast.success(t("settings.account.email.sent"));
  };

  const handlePasswordChange = async () => {
    if (password !== confirmPassword) {
      toast.error(t("settings.account.password.mismatch"));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      trackFailure("settings_password_change_failed", error, { feature: "settings" });
      console.error("account update failed", error);
      toast.error(t("settings.account.updateError"));
      return;
    }
    track({ event_name: "settings_password_changed", feature: "settings" });
    setPassword("");
    setConfirmPassword("");
    toast.success(t("settings.account.password.updated"));
  };

  if (loading) {
    return (
      <SectionCard title={t("settings.account.title")}>
        <p className="text-[14px] text-muted-foreground">{t("settings.account.loading")}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={t("settings.account.title")}
      description={t("settings.account.description")}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-muted-foreground">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t("settings.account.pictureAlt")}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-6 w-6" />
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleAvatar(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            {t("settings.account.changePicture")}
          </Button>
          {profile?.photoPath && (
            <Button variant="ghost" onClick={() => void handleRemoveAvatar()}>
              {t("settings.account.removePicture")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">{t("settings.account.pictureHint")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">{t("settings.account.usernameLabel")}</Label>
          <Input
            id="username"
            value={profile?.username ?? ""}
            onChange={(e) => patch({ username: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("settings.account.fullNameLabel")}</Label>
          <Input
            id="fullName"
            value={profile?.fullName ?? ""}
            onChange={(e) => patch({ fullName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">{t("settings.account.nationalityLabel")}</Label>
          <Input
            id="nationality"
            value={profile?.nationality ?? ""}
            onChange={(e) => patch({ nationality: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("settings.account.phoneLabel")}</Label>
          <Input
            id="phone"
            type="tel"
            value={profile?.contactPhone ?? ""}
            onChange={(e) => patch({ contactPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">{t("settings.account.addressLabel")}</Label>
          <Input
            id="address"
            value={profile?.contactDetails["address"] ?? ""}
            onChange={(e) =>
              patch({
                contactDetails: { ...(profile?.contactDetails ?? {}), address: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardian">{t("settings.account.guardianLabel")}</Label>
          <Input
            id="guardian"
            value={profile?.contactDetails["guardian"] ?? ""}
            onChange={(e) =>
              patch({
                contactDetails: { ...(profile?.contactDetails ?? {}), guardian: e.target.value },
              })
            }
          />
        </div>
      </div>
      <Button onClick={() => void handleSaveProfile()} disabled={saving}>
        {saving ? t("settings.account.saving") : t("settings.account.saveProfile")}
      </Button>

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-[15px] font-semibold">{t("settings.account.email.title")}</h3>
        <p className="text-[14px] text-muted-foreground">
          {t("settings.account.email.description", {
            email: email || t("settings.account.email.unknown"),
          })}
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="newEmail">{t("settings.account.email.newLabel")}</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => void handleEmailChange()} disabled={!newEmail}>
            {t("settings.account.email.update")}
          </Button>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-[15px] font-semibold">{t("settings.account.password.title")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("settings.account.password.newLabel")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">{t("settings.account.password.repeatLabel")}</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
            />
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => void handlePasswordChange()}
          disabled={password.length < 6}
        >
          {t("settings.account.password.update")}
        </Button>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------- preferences + model --- */

export function PreferencesSections() {
  const { t } = useI18n();
  const ai = useAiAvailability();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const audioSupported = useMemo(() => speechSupported(), []);
  const [modelHealth, setModelHealth] = useState<{
    available: boolean;
    assignedModelId: string | null;
    recommendedModelId: string | null;
  } | null>(null);

  useEffect(() => {
    fetchPreferences()
      .then(setPrefs)
      .catch((err: unknown) => toast.error(t("settings.preferences.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    fetchLocalBackendHealth({ data: undefined })
      .then((health) =>
        setModelHealth({
          available: health.available,
          assignedModelId: health.my_assigned_model_id,
          recommendedModelId: health.recommended_model_id,
        }),
      )
      .catch(() => setModelHealth(null));
  }, []);

  const update = async (next: Partial<UserPreferences>) => {
    const previous = prefs;
    setPrefs({ ...prefs, ...next });
    try {
      const saved = await savePreferences(next);
      setPrefs(saved);
      // Only the preference key is logged — never the stored value.
      track({
        event_name: "settings_preference_saved",
        feature: "settings",
        properties: { preference: Object.keys(next)[0] ?? "" },
      });
    } catch (err) {
      setPrefs(previous);
      trackFailure("settings_preference_save_failed", err, {
        feature: "settings",
        properties: { preference: Object.keys(next)[0] ?? "" },
      });
      toast.error(t("settings.preferences.saveError"));
    }
  };

  const switches: { key: keyof UserPreferences; label: string; hint?: string }[] = [
    { key: "exam_reminders", label: t("settings.preferences.examReminders") },
    { key: "daily_study_summary", label: t("settings.preferences.dailyStudySummary") },
    { key: "sound_effects", label: t("settings.preferences.soundEffects") },
  ];

  return (
    <>
      <SectionCard
        title={t("settings.localModel.title")}
        description={t("settings.localModel.description")}
      >
        {!loading && (
          <ModelReadinessPanel
            initialModelId={prefs.selected_qwen_model}
            onPreparing={ai.setPreparing}
            onReady={(modelId) => {
              ai.setReady(modelId);
              setPrefs((current) => ({ ...current, selected_qwen_model: modelId }));
            }}
            onUnavailable={() => ai.setUnavailable()}
          />
        )}
        {!loading && modelHealth?.available && (
          <div className="space-y-1.5 rounded-xl border border-border bg-surface-2 p-4 text-[14px]">
            <p>
              <span className="font-medium">{t("settings.model.preferred")}:</span>{" "}
              {prefs.selected_qwen_model}
            </p>
            {modelHealth.assignedModelId && (
              <p>
                <span className="font-medium">{t("settings.model.assigned")}:</span>{" "}
                {modelHealth.assignedModelId}
              </p>
            )}
            {modelHealth.recommendedModelId && (
              <p className="text-muted-foreground">
                {t("settings.model.recommendation", { model: modelHealth.recommendedModelId })}
              </p>
            )}
            {modelHealth.assignedModelId &&
              modelHealth.assignedModelId !== prefs.selected_qwen_model && (
                <p className="text-muted-foreground">{t("settings.model.assignedDiffers")}</p>
              )}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={t("settings.preferences.title")}
        description={t("settings.preferences.description")}
      >
        <div className="divide-y divide-border">
          {switches.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5"
            >
              <div>
                <span className="text-[15px] font-medium">{item.label}</span>
                {item.hint && <p className="mt-1 text-[13px] text-muted-foreground">{item.hint}</p>}
              </div>
              <Switch
                checked={Boolean(prefs[item.key])}
                disabled={loading}
                onCheckedChange={(checked) =>
                  void update({ [item.key]: checked } as Partial<UserPreferences>)
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("settings.audio.title")} description={t("settings.audio.description")}>
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5">
            <div>
              <span className="text-[15px] font-medium">{t("settings.audio.enabled.label")}</span>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("settings.audio.enabled.hint")}
              </p>
            </div>
            <Switch
              checked={Boolean(prefs.assistant_audio_enabled)}
              disabled={loading}
              onCheckedChange={(checked) => void update({ assistant_audio_enabled: checked })}
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5",
              !prefs.assistant_audio_enabled && "opacity-50",
            )}
          >
            <div>
              <span className="text-[15px] font-medium">{t("settings.audio.autoplay.label")}</span>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("settings.audio.autoplay.hint")}
              </p>
            </div>
            <Switch
              checked={Boolean(prefs.assistant_audio_autoplay)}
              disabled={loading || !prefs.assistant_audio_enabled}
              onCheckedChange={(checked) => void update({ assistant_audio_autoplay: checked })}
            />
          </div>
        </div>
        {!audioSupported && (
          <p className="text-[13px] text-muted-foreground">{t("settings.audio.unsupported")}</p>
        )}
      </SectionCard>
    </>
  );
}

/* -------------------------------------------------------------- storage --- */

export function StorageSection() {
  const { t, formatDate } = useI18n();
  const [usage, setUsage] = useState<StorageUsageStatus | null>(null);
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<StorageItemKind | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const KIND_FILTERS: { value: StorageItemKind | "all"; label: string }[] = [
    { value: "all", label: t("settings.storage.filter.all") },
    { value: "image", label: t("settings.storage.filter.image") },
    { value: "audio", label: t("settings.storage.filter.audio") },
    { value: "video", label: t("settings.storage.filter.video") },
    { value: "document", label: t("settings.storage.filter.document") },
    { value: "other", label: t("settings.storage.filter.other") },
  ];

  const load = useCallback(async () => {
    try {
      const [status, list] = await Promise.all([fetchStorageUsage(), listStorageItems()]);
      setUsage(status);
      setItems(list);
      return status;
    } catch (err) {
      toast.error(t("settings.storage.loadError"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Capacity cleanup is platform-wide and runs on a schedule. Opening Settings
  // must never trigger a global cleanup.
  useEffect(() => {
    void load();
  }, [load]);

  const handleManualCleanup = async () => {
    setBusy(true);
    try {
      await invokeEmergencyCleanup();
      toast.success(t("settings.storage.cleanupDone"));
      await load();
    } catch (err) {
      toast.error(t("settings.storage.cleanupError"));
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (kind !== "all" && item.kind !== kind) return false;
        const date = item.createdAt.slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      }),
    [items, kind, from, to],
  );

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDelete = async () => {
    const targets = filtered.filter((item) => selected.has(item.id));
    if (!targets.length) return;
    const confirmMessage =
      targets.length === 1
        ? t("settings.storage.confirmDeleteOne", { count: targets.length })
        : t("settings.storage.confirmDeleteOther", { count: targets.length });
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    try {
      await deleteStorageItems(targets);
      setSelected(new Set());
      await load();
      toast.success(t("settings.storage.deleted"));
    } catch (err) {
      toast.error(t("settings.storage.deleteError"));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remainingPercent = usage?.remaining_percent ?? 100;
  const usedPercent = Math.min(100, Math.max(0, usage?.used_percent ?? 0));
  const low = remainingPercent <= 10;

  return (
    <SectionCard
      title={t("settings.storage.title")}
      description={t("settings.storage.description")}
    >
      {loading ? (
        <p className="text-[14px] text-muted-foreground">{t("settings.storage.loading")}</p>
      ) : (
        <>
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
              <span className="text-[15px] font-medium">
                {t("settings.storage.usedOf", {
                  used: formatBytes(usage?.used_bytes ?? 0),
                  total: formatBytes(usage?.quota_bytes ?? 0),
                })}
              </span>
              <span className="text-[14px] text-muted-foreground">
                {t("settings.storage.remaining", { percent: remainingPercent.toFixed(1) })}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("h-full rounded-full", low ? "bg-warning" : "bg-primary")}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>

          {low && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-warning" />
              <div className="text-[14px]">
                <p className="font-semibold text-warning">
                  {t("settings.storage.capacity.warning", { percent: usedPercent.toFixed(1) })}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {t("settings.storage.capacity.warningBody")}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface-2 p-4 text-[14px]">
            <p className="font-semibold">{t("settings.storage.capacity.title")}</p>
            <p className="mt-1 text-muted-foreground">{t("settings.storage.capacity.body")}</p>
            <p className="mt-1 text-muted-foreground">{t("settings.storage.capacity.excluded")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={busy} onClick={() => void handleManualCleanup()}>
                {t("settings.storage.capacity.manual")}
              </Button>
              <span className="text-[12px] text-muted-foreground">
                {t("settings.storage.capacity.manualHint")}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="kindFilter">{t("settings.storage.typeLabel")}</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
                <SelectTrigger id="kindFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromDate">{t("settings.storage.fromLabel")}</Label>
              <Input
                id="fromDate"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">{t("settings.storage.toLabel")}</Label>
              <Input id="toDate" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <p className="text-[14px] text-muted-foreground">
              {filtered.length === 1
                ? t("settings.storage.fileCountOne", { count: filtered.length })
                : t("settings.storage.fileCountOther", { count: filtered.length })}
              {selected.size > 0
                ? t("settings.storage.selectedCount", { count: selected.size })
                : ""}
            </p>
            <Button
              variant="outline"
              className="gap-2"
              disabled={selected.size === 0 || busy}
              onClick={() => void handleDelete()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("settings.storage.deleteSelected")}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-[14px] text-muted-foreground">
              {t("settings.storage.emptyFiltered")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3.5"
                >
                  <input
                    type="checkbox"
                    aria-label={t("settings.storage.selectItem", { name: item.name })}
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">{item.name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {item.source} · {item.kind} ·{" "}
                      {item.createdAt
                        ? formatDate(item.createdAt)
                        : t("settings.storage.unknownDate")}
                    </p>
                  </div>
                  <span className="text-[13px] text-muted-foreground">
                    {formatBytes(item.byteSize)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </SectionCard>
  );
}
