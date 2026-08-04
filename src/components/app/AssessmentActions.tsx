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
import { SUBJECTS } from "@/lib/mock/subjects";
import { useAppData } from "@/lib/store/app-data";
import type { Assessment } from "@/lib/store/types";
import { toast } from "sonner";

/** Edit / duplicate / move / delete menu shown on every test record. */
export function AssessmentActions({ record }: { record: Assessment }) {
  const { updateAssessment, duplicateAssessment, removeAssessment, restoreAssessment } =
    useAppData();
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [target, setTarget] = useState(record.subjectSlug);

  function remove() {
    const snapshot = { ...record };
    removeAssessment(record.id);
    toast.success("Test deleted", {
      description: "Nothing is permanent — you can undo this.",
      action: { label: "Undo", onClick: () => restoreAssessment(snapshot) },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${record.title}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setTimeout(() => setEditing(true), 0)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateAssessment(record.id)}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTimeout(() => setMoving(true), 0)}>
            Move to another subject
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              updateAssessment(record.id, { includeInStats: !record.includeInStats })
            }
          >
            {record.includeInStats ? "Exclude from statistics" : "Include in statistics"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => setTimeout(() => setConfirmDelete(true), 0)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssessmentDialog record={record} open={editing} onOpenChange={setEditing} />

      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Move test</DialogTitle>
            <DialogDescription>
              Both subject averages update immediately after the move.
            </DialogDescription>
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
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAssessment(record.id, { subjectSlug: target });
                setMoving(false);
                toast.success("Test moved");
              }}
            >
              Move test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{record.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the test from your records and recalculates the subject and yearly
              averages. You can undo it straight afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
