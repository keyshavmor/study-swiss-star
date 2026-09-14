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
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_PREFERENCES,
  QWEN_MODELS,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      toast.error(err instanceof Error ? err.message : "Could not load your account");
    } finally {
      setLoading(false);
    }
  }, []);

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
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile");
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
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the picture");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar();
      patch({ photoPath: "" });
      setAvatarUrl("");
      toast.success("Profile picture removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the picture");
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewEmail("");
    toast.success("Confirmation email sent. The change applies once you verify it.");
  };

  const handlePasswordChange = async () => {
    if (password !== confirmPassword) {
      toast.error("The two passwords do not match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  if (loading) {
    return (
      <SectionCard title="Account">
        <p className="text-[14px] text-muted-foreground">Loading your account…</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Account"
      description="Your profile picture, name and contact details are stored securely in your account."
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-muted-foreground">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Your profile picture" className="h-full w-full object-cover" />
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
            Change picture
          </Button>
          {profile?.photoPath && (
            <Button variant="ghost" onClick={() => void handleRemoveAvatar()}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">Images up to 2 MB, private to your account.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={profile?.username ?? ""}
            onChange={(e) => patch({ username: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={profile?.fullName ?? ""}
            onChange={(e) => patch({ fullName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            value={profile?.nationality ?? ""}
            onChange={(e) => patch({ nationality: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Contact phone</Label>
          <Input
            id="phone"
            type="tel"
            value={profile?.contactPhone ?? ""}
            onChange={(e) => patch({ contactPhone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
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
          <Label htmlFor="guardian">Guardian contact</Label>
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
        {saving ? "Saving…" : "Save profile"}
      </Button>

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-[15px] font-semibold">Email address</h3>
        <p className="text-[14px] text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email || "unknown"}</span>.
          Changing it requires confirming the new address by email.
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="newEmail">New email</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => void handleEmailChange()} disabled={!newEmail}>
            Update email
          </Button>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-[15px] font-semibold">Password</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Repeat new password</Label>
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
          Update password
        </Button>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------- preferences + model --- */

export function PreferencesSections() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences()
      .then(setPrefs)
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Could not load your preferences"),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = async (next: Partial<UserPreferences>) => {
    const previous = prefs;
    setPrefs({ ...prefs, ...next });
    try {
      const saved = await savePreferences(next);
      setPrefs(saved);
    } catch (err) {
      setPrefs(previous);
      toast.error(err instanceof Error ? err.message : "Could not save your preference");
    }
  };

  const switches: { key: keyof UserPreferences; label: string; hint?: string }[] = [
    { key: "exam_reminders", label: "Exam reminders" },
    { key: "daily_study_summary", label: "Daily study summary" },
    { key: "apple_reminders_sync", label: "Apple Reminders sync" },
    { key: "sound_effects", label: "Sound effects" },
    {
      key: "auto_storage_cleanup",
      label: "Automatic cleanup when storage is nearly full",
      hint: "When 1% or less of storage remains, the oldest 5% of eligible study and chat files are removed platform-wide.",
    },
  ];

  return (
    <>
      <SectionCard
        title="Local model"
        description="Choose which local Qwen model the study assistant should use. This selects the model only; the local backend controls how it runs."
      >
        <div className="max-w-md space-y-2">
          <Label htmlFor="qwenModel">Model</Label>
          <Select
            value={prefs.selected_qwen_model}
            onValueChange={(value) => void update({ selected_qwen_model: value })}
            disabled={loading}
          >
            <SelectTrigger id="qwenModel">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {QWEN_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[13px] text-muted-foreground">
            Listed from largest to smallest. Larger models answer better but need more memory.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Preferences" description="Saved to your account, not just this browser.">
        <div className="divide-y divide-border">
          {switches.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5"
            >
              <div>
                <span className="text-[15px] font-medium">{item.label}</span>
                {item.hint && (
                  <p className="mt-1 text-[13px] text-muted-foreground">{item.hint}</p>
                )}
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
    </>
  );
}

/* -------------------------------------------------------------- storage --- */

const KIND_FILTERS: { value: StorageItemKind | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "document", label: "Documents" },
  { value: "other", label: "Other" },
];

export function StorageSection() {
  const [usage, setUsage] = useState<StorageUsageStatus | null>(null);
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<StorageItemKind | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const cleanupAttempted = useRef(false);

  const load = useCallback(async () => {
    try {
      const [status, list] = await Promise.all([fetchStorageUsage(), listStorageItems()]);
      setUsage(status);
      setItems(list);
      return status;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load storage information");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const status = await load();
      if (status?.emergency_cleanup_needed && !cleanupAttempted.current) {
        cleanupAttempted.current = true;
        try {
          await invokeEmergencyCleanup();
          toast.success("Storage was nearly full, so the oldest eligible files were removed.");
          await load();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Automatic storage cleanup could not run",
          );
        }
      }
    })();
  }, [load]);

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
    if (
      !window.confirm(
        `Permanently delete ${targets.length} file${targets.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteStorageItems(targets);
      setSelected(new Set());
      await load();
      toast.success("Files deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the selected files");
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
      title="Storage"
      description="Shared app storage across study materials and assistant attachments."
    >
      {loading ? (
        <p className="text-[14px] text-muted-foreground">Loading storage usage…</p>
      ) : (
        <>
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
              <span className="text-[15px] font-medium">
                {formatBytes(usage?.used_bytes ?? 0)} of {formatBytes(usage?.quota_bytes ?? 0)} used
              </span>
              <span className="text-[14px] text-muted-foreground">
                {remainingPercent.toFixed(1)}% remaining
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
                <p className="font-semibold text-warning">Storage is almost full</p>
                <p className="mt-1 text-muted-foreground">
                  Only {remainingPercent.toFixed(1)}% remains. Delete files you no longer need. If
                  1% or less is left, an automatic cleanup removes the oldest eligible study and
                  chat files across the whole app; profile pictures and account data are never
                  touched.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="kindFilter">Type</Label>
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
              <Label htmlFor="fromDate">From</Label>
              <Input
                id="fromDate"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To</Label>
              <Input id="toDate" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <p className="text-[14px] text-muted-foreground">
              {filtered.length} file{filtered.length === 1 ? "" : "s"}
              {selected.size > 0 ? ` · ${selected.size} selected` : ""}
            </p>
            <Button
              variant="outline"
              className="gap-2"
              disabled={selected.size === 0 || busy}
              onClick={() => void handleDelete()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete selected
            </Button>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-2 p-4 text-[14px] text-muted-foreground">
              No stored files match these filters.
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
                    aria-label={`Select ${item.name}`}
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">{item.name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {item.source} · {item.kind} ·{" "}
                      {item.createdAt ? item.createdAt.slice(0, 10) : "unknown date"}
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
