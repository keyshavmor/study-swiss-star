/** Alim application component for study, planning, profile, or navigation workflows. */
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { AssessmentDialog } from "@/components/app/AssessmentDialog";
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
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { Assessment } from "@/lib/store/types";
import { toast } from "sonner";

/** Edit / duplicate / move / delete menu shown on every test record. */
export function AssessmentActions({ record }: { record: Assessment }) {
  const { t } = useI18n();
  const { updateAssessment, duplicateAssessment, removeAssessment, restoreAssessment } =
    useAppData();
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [target, setTarget] = useState(record.subjectSlug);

  function remove() {
    const snapshot = { ...record };
    removeAssessment(record.id);
    toast.success(t("grades.delete.toastTitle"), {
      description: t("grades.delete.toastDescription"),
      action: { label: t("grades.delete.undo"), onClick: () => restoreAssessment(snapshot) },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("grades.actions.ariaLabel", { title: record.title })}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setTimeout(() => setEditing(true), 0)}>
            {t("grades.actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateAssessment(record.id)}>
            {t("grades.actions.duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTimeout(() => setMoving(true), 0)}>
            {t("grades.actions.moveToAnother")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => updateAssessment(record.id, { includeInStats: !record.includeInStats })}
          >
            {record.includeInStats
              ? t("grades.actions.excludeFromStats")
              : t("grades.actions.includeInStats")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => setTimeout(() => setConfirmDelete(true), 0)}
          >
            {t("grades.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssessmentDialog record={record} open={editing} onOpenChange={setEditing} />

      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("grades.move.title")}</DialogTitle>
            <DialogDescription>{t("grades.move.description")}</DialogDescription>
          </DialogHeader>
          <Select value={target} onValueChange={setTarget}>
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoving(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                updateAssessment(record.id, { subjectSlug: target });
                setMoving(false);
                toast.success(t("grades.move.toastSuccess"));
              }}
            >
              {t("grades.move.button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("grades.delete.title", { title: record.title })}</AlertDialogTitle>
            <AlertDialogDescription>{t("grades.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{t("grades.delete.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
