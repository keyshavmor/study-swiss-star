/** Pre-submission review drawer and the quit-assessment confirmation. */
import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n/provider";
import type { PublicQuestion } from "@/lib/assessment/types";

export function SubmissionReview({
  open,
  onOpenChange,
  questions,
  answeredIds,
  markedIds,
  onGoTo,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: PublicQuestion[];
  answeredIds: string[];
  markedIds: string[];
  onGoTo: (index: number) => void;
  onSubmit: () => void;
}) {
  const { t } = useI18n();
  const unansweredCount = questions.length - answeredIds.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("assessment.review.heading")}</SheetTitle>
          <SheetDescription>
            {t("assessment.review.summary", {
              answered: answeredIds.length,
              unanswered: unansweredCount,
              marked: markedIds.length,
            })}
          </SheetDescription>
        </SheetHeader>

        <p className="mt-3 rounded-[14px] bg-surface-2 px-3.5 py-3 text-[14px] text-warning">
          {t("assessment.review.zeroPointsWarning")}
        </p>

        <ul className="mt-4 space-y-1.5">
          {questions.map((question, index) => {
            const answered = answeredIds.includes(question.id);
            const marked = markedIds.includes(question.id);
            return (
              <li key={question.id}>
                <button
                  type="button"
                  onClick={() => {
                    onGoTo(index);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-border bg-surface px-3.5 py-2.5 text-left text-[14px] hover:bg-hover"
                >
                  <span className="tabular font-medium">
                    {t("assessment.navigator.questionN", { index: index + 1 })}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {answered
                      ? t("assessment.navigator.answered")
                      : t("assessment.navigator.unanswered")}
                    {marked ? ` · ${t("assessment.navigator.marked")}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5">
          <SubmitConfirmation onConfirm={onSubmit} unansweredCount={unansweredCount} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SubmitConfirmation({
  onConfirm,
  unansweredCount,
  trigger,
}: {
  onConfirm: () => void;
  unansweredCount: number;
  trigger?: React.ReactNode | undefined;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useOpenState();
  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} role="presentation">
          {trigger}
        </span>
      ) : (
        <Button className="w-full" onClick={() => setOpen(true)}>
          {t("assessment.submit")}
        </Button>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("assessment.submitConfirm.heading")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("assessment.submitConfirm.body", { count: unansweredCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>{t("assessment.submit")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function QuitAssessmentDialog({
  onConfirm,
  trigger,
}: {
  onConfirm: () => void;
  trigger: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useOpenState();
  return (
    <>
      <span onClick={() => setOpen(true)} role="presentation">
        {trigger}
      </span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("assessment.quitConfirm.heading")}</AlertDialogTitle>
            <AlertDialogDescription>{t("assessment.quitConfirm.body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("assessment.quitConfirm.keepGoing")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              {t("assessment.quitConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Local open/close state shared by both confirmation dialogs. */
function useOpenState() {
  return useState(false);
}
