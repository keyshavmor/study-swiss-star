/** Alim application component for study, planning, profile, or navigation workflows. */
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { StudentProfile } from "@/lib/store/types";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

const NO_SUBJECT = "__none";
const LANGUAGES = ["English", "German", "French", "Italian"];
const SCHOOL_TYPES = [
  "Gymnasium",
  "Kantonsschule",
  "Fachmittelschule",
  "Sekundarschule",
  "International School",
  "Other",
];

/** Edit the student profile. Nothing is pre-filled with invented data. */
export function EditProfileDialog({ trigger }: { trigger: ReactNode }) {
  const { t } = useI18n();
  const { profile, updateProfile } = useAppData();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StudentProfile>(profile);

  const set = <K extends keyof StudentProfile>(k: K, v: StudentProfile[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(profile);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>{t("profile.editDialog.title")}</DialogTitle>
          <DialogDescription>{t("profile.editDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label={t("profile.editDialog.photoLabel")} id="pf-photo">
            <Input
              id="pf-photo"
              value={draft.photo}
              onChange={(e) => set("photo", e.target.value)}
              placeholder="https://…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("profile.editDialog.fullNameLabel")} id="pf-name">
              <Input
                id="pf-name"
                value={draft.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.preferredNameLabel")} id="pf-preferred">
              <Input
                id="pf-preferred"
                value={draft.preferredName}
                onChange={(e) => set("preferredName", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.dobLabel")} id="pf-dob">
              <Input
                id="pf-dob"
                type="date"
                value={draft.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.schoolNameLabel")} id="pf-school">
              <Input
                id="pf-school"
                value={draft.schoolName}
                onChange={(e) => set("schoolName", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.schoolTypeLabel")}>
              <Select
                value={draft.schoolType || NO_SUBJECT}
                onValueChange={(v) => set("schoolType", v === NO_SUBJECT ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.editDialog.notSetOption")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>{t("profile.editDialog.notSetOption")}</SelectItem>
                  {SCHOOL_TYPES.map((t2) => (
                    <SelectItem key={t2} value={t2}>
                      {t2}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("profile.editDialog.classLabel")} id="pf-class">
              <Input
                id="pf-class"
                value={draft.className}
                onChange={(e) => set("className", e.target.value)}
                placeholder="11a"
              />
            </Field>
            <Field label={t("profile.editDialog.classTeacherLabel")} id="pf-teacher">
              <Input
                id="pf-teacher"
                value={draft.classTeacher}
                onChange={(e) => set("classTeacher", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.focusSubjectLabel")}>
              <Select
                value={draft.focusSubject || NO_SUBJECT}
                onValueChange={(v) => set("focusSubject", v === NO_SUBJECT ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.editDialog.notSetOption")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>{t("profile.editDialog.notSetOption")}</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.slug} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("profile.editDialog.schoolEmailLabel")} id="pf-email">
              <Input
                id="pf-email"
                type="email"
                value={draft.schoolEmail}
                onChange={(e) => set("schoolEmail", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.studentNumberLabel")} id="pf-number">
              <Input
                id="pf-number"
                value={draft.studentNumber}
                onChange={(e) => set("studentNumber", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.usernameLabel")} id="pf-username">
              <Input
                id="pf-username"
                value={draft.username}
                onChange={(e) => set("username", e.target.value)}
              />
            </Field>
            <Field label={t("profile.editDialog.interfaceLanguageLabel")}>
              <Select value={draft.language} onValueChange={(v) => set("language", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              updateProfile(draft);
              setOpen(false);
              toast.success(t("profile.editDialog.updated"));
            }}
          >
            {t("profile.editDialog.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, id, children }: { label: string; id?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
