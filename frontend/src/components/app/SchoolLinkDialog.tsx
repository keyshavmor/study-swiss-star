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
import { Textarea } from "@/components/ui/textarea";
import { todayIso } from "@/lib/date-utils";
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { LinkCategory, SchoolLink } from "@/lib/store/types";
import { LINK_ACCENTS, LINK_CATEGORIES } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

const NO_SUBJECT = "__none";

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}

export function normaliseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Add or edit an important school link. */
export function SchoolLinkDialog({
  trigger,
  record,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  record?: SchoolLink;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { addLink, updateLink } = useAppData();
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;

  const [name, setName] = useState(record?.name ?? "");
  const [url, setUrl] = useState(record?.url ?? "");
  const [category, setCategory] = useState<LinkCategory>(record?.category ?? "School Website");
  const [description, setDescription] = useState(record?.description ?? "");
  const [icon, setIcon] = useState(record?.icon ?? "");
  const [subjectSlug, setSubjectSlug] = useState(record?.subjectSlug ?? NO_SUBJECT);
  const [accent, setAccent] = useState(record?.accent ?? LINK_ACCENTS[0]);

  const invalid = name.trim() === "" || url.trim() === "";

  function save() {
    const payload = {
      name: name.trim(),
      url: normaliseUrl(url),
      category,
      accent,
      added: record?.added ?? todayIso(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(icon.trim() ? { icon: icon.trim().slice(0, 2).toUpperCase() } : {}),
      ...(subjectSlug === NO_SUBJECT ? {} : { subjectSlug }),
    };
    if (record) {
      updateLink(record.id, payload);
      toast.success(t("profile.linkDialog.updated"));
    } else {
      addLink(payload);
      toast.success(t("profile.linkDialog.added"));
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {record ? t("profile.linkDialog.editTitle") : t("profile.linkDialog.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("profile.linkDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="link-name">{t("profile.linkDialog.nameLabel")}</Label>
            <Input
              id="link-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profile.linkDialog.namePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-url">{t("profile.linkDialog.urlLabel")}</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("profile.linkDialog.urlPlaceholder")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("profile.linkDialog.categoryLabel")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as LinkCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("profile.linkDialog.subjectLabel")}</Label>
              <Select value={subjectSlug} onValueChange={setSubjectSlug}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>{t("profile.linkDialog.noSubject")}</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-desc">{t("profile.linkDialog.descriptionLabel")}</Label>
            <Textarea
              id="link-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("profile.linkDialog.descriptionPlaceholder")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="link-icon">{t("profile.linkDialog.iconLabel")}</Label>
              <Input
                id="link-icon"
                value={icon}
                maxLength={2}
                onChange={(e) => setIcon(e.target.value)}
                placeholder={initialsFor(name || "New link")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("profile.linkDialog.colourLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                {LINK_ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={t("profile.linkDialog.colourAria", { color: c })}
                    onClick={() => setAccent(c)}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-transform",
                      accent === c ? "scale-105 border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={invalid} onClick={save}>
            {record ? t("profile.editDialog.saveChanges") : t("profile.linkDialog.addLink")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
