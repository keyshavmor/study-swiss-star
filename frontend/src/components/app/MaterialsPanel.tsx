/** Alim application component for study, planning, profile, or navigation workflows. */
import { Link } from "@tanstack/react-router";
import {
  Archive,
  FileImage,
  FileText,
  Globe,
  Link2,
  MoreHorizontal,
  Plus,
  StickyNote,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDate } from "@/lib/grade-math";
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { Material, MaterialSection, MaterialType } from "@/lib/store/types";
import { MATERIAL_SECTIONS, MATERIAL_TYPES } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { toast } from "sonner";

function fileIcon(type: MaterialType) {
  if (type === "PNG" || type === "JPEG" || type === "SVG") return FileImage;
  if (type === "Web link") return Globe;
  if (type === "Note") return StickyNote;
  return FileText;
}

interface Draft {
  name: string;
  type: MaterialType;
  section: MaterialSection;
  subjectSlug: string;
  url: string;
  notes: string;
}

function MaterialDialog({
  open,
  onOpenChange,
  subjectSlug,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectSlug: string;
  record?: Material;
}) {
  const { t } = useI18n();
  const { addMaterial, updateMaterial } = useAppData();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: record?.name ?? "",
    type: record?.type ?? "PDF",
    section: record?.section ?? "Learning Material",
    subjectSlug: record?.subjectSlug ?? subjectSlug,
    url: record?.url ?? "",
    notes: record?.notes ?? "",
  }));

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function save() {
    if (record) {
      updateMaterial(record.id, {
        name: draft.name.trim(),
        type: draft.type,
        section: draft.section,
        subjectSlug: draft.subjectSlug,
        url: draft.url.trim(),
        notes: draft.notes.trim(),
      });
      toast.success(t("materials.toast.updated"));
    } else {
      addMaterial({
        name: draft.name.trim(),
        type: draft.type,
        section: draft.section,
        subjectSlug: draft.subjectSlug,
        url: draft.url.trim(),
        notes: draft.notes.trim(),
        status: "Indexed",
        added: new Date().toISOString().slice(0, 10),
      });
      toast.success(t("materials.toast.added"), {
        description: t("materials.toast.added.description"),
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {record ? t("materials.dialog.title.edit") : t("materials.dialog.title.add")}
          </DialogTitle>
          <DialogDescription>{t("materials.dialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mat-name">{t("materials.dialog.name")}</Label>
            <Input
              id="mat-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("materials.dialog.name.placeholder")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("materials.dialog.type")}</Label>
              <Select value={draft.type} onValueChange={(v) => set("type", v as MaterialType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("materials.dialog.section")}</Label>
              <Select
                value={draft.section}
                onValueChange={(v) => set("section", v as MaterialSection)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>{t("materials.dialog.subject")}</Label>
              <Select value={draft.subjectSlug} onValueChange={(v) => set("subjectSlug", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {draft.type === "Web link" && (
            <div className="grid gap-2">
              <Label htmlFor="mat-url">{t("materials.dialog.link")}</Label>
              <Input
                id="mat-url"
                value={draft.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="mat-notes">{t("materials.dialog.notes")}</Label>
            <Textarea
              id="mat-notes"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={draft.name.trim() === ""} onClick={save}>
            {record ? t("materials.dialog.save.edit") : t("materials.dialog.save.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaterialFileCard({ file }: { file: Material }) {
  const { t, formatDate: fmtDate } = useI18n();
  const { updateMaterial, removeMaterial, restoreMaterial } = useAppData();
  const [editing, setEditing] = useState(false);
  const Icon = fileIcon(file.type);

  return (
    <div className="rounded-[16px] border border-border bg-surface p-3 transition-colors duration-200 hover:border-border-strong">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium">{file.name}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {file.type} · {t("materials.card.addedOn", { date: fmtDate(file.added) })}
          </p>
          {file.notes && (
            <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{file.notes}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11.5px] font-medium",
                file.archived ? "bg-surface-2 text-muted-foreground" : "bg-chart-3/12 text-chart-3",
              )}
            >
              {file.archived ? t("materials.card.archived") : file.status}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("materials.card.actionsFor", { name: file.name })}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setTimeout(() => setEditing(true), 0)}>
              {t("materials.card.renameOrEdit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                updateMaterial(file.id, {
                  archived: !file.archived,
                  section: file.archived ? "Learning Material" : "Archived Material",
                })
              }
            >
              {file.archived ? t("materials.card.restore") : t("materials.card.archive")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => {
                const snapshot = { ...file };
                removeMaterial(file.id);
                toast.success(t("materials.toast.deleted"), {
                  action: {
                    label: t("materials.toast.undo"),
                    onClick: () => restoreMaterial(snapshot),
                  },
                });
              }}
            >
              {t("materials.card.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing && (
        <MaterialDialog
          open={editing}
          onOpenChange={setEditing}
          subjectSlug={file.subjectSlug}
          record={file}
        />
      )}
    </div>
  );
}

export function MaterialsPanel({
  className,
  subjectSlug,
}: {
  className?: string;
  subjectSlug?: string;
}) {
  const { t } = useI18n();
  const { materials } = useAppData();
  const [adding, setAdding] = useState(false);
  const mine = materials.filter((m) => !subjectSlug || m.subjectSlug === subjectSlug);

  return (
    <aside className={cn("app-card flex flex-col gap-4 p-5", className)}>
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight">{t("materials.panel.title")}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {mine.length === 0
            ? t("materials.panel.empty")
            : t("materials.panel.count", { count: mine.length })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          {t("materials.panel.addMaterial")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Link2 className="h-4 w-4" />
          {t("materials.panel.addWebLink")}
        </Button>
      </div>

      {mine.length === 0 ? (
        <p className="rounded-[14px] bg-surface-2 px-3 py-4 text-[13.5px] text-muted-foreground">
          {t("materials.panel.emptyBody")}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {MATERIAL_SECTIONS.map((section) => {
            const files = mine.filter((m) =>
              section === "Archived Material" ? m.archived : !m.archived && m.section === section,
            );
            if (files.length === 0) return null;
            return (
              <section key={section}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    {section}
                  </h3>
                  <Badge variant="secondary" className="text-[11px]">
                    {files.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {files.map((file) => (
                    <MaterialFileCard key={file.id} file={file} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Link
        to="/help"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-primary hover:underline"
      >
        <Archive className="h-4 w-4" />
        {t("materials.panel.helpLink")}
      </Link>

      {adding && (
        <MaterialDialog
          open={adding}
          onOpenChange={setAdding}
          subjectSlug={subjectSlug ?? SUBJECTS[0]!.slug}
        />
      )}
    </aside>
  );
}
