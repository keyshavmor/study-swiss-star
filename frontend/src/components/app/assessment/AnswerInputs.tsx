/**
 * Answer editors for every first-class question type.
 *
 * Each editor is keyboard accessible, uses semantic fieldsets/labels and emits
 * a structured `StudentAnswer`. Nothing is persisted durably before submission.
 */
import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";
import type { PublicQuestion, StudentAnswer } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";
import { MathAnswerInput } from "./MathAnswerInput";
import { ScientificContentRenderer } from "./ScientificContentRenderer";

export interface AnswerEditorProps {
  question: PublicQuestion;
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
  disabled?: boolean | undefined;
}

export function AnswerEditor({ question, answer, onChange, disabled }: AnswerEditorProps) {
  switch (question.type) {
    case "multiple_choice":
      return (
        <MultipleChoiceInput
          question={question}
          answer={answer}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "true_false":
      return (
        <TrueFalseInput question={question} answer={answer} onChange={onChange} disabled={disabled} />
      );
    case "short_answer":
      return (
        <ShortAnswerInput
          question={question}
          answer={answer}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "matching":
      return (
        <MatchingAnswerInput
          question={question}
          answer={answer}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "essay":
      return (
        <EssayAnswerInput question={question} answer={answer} onChange={onChange} disabled={disabled} />
      );
    case "calculation":
      return (
        <CalculationAnswerInput
          question={question}
          answer={answer}
          onChange={onChange}
          disabled={disabled}
        />
      );
  }
}

function MultipleChoiceInput({ question, answer, onChange, disabled }: AnswerEditorProps) {
  const { t } = useI18n();
  if (question.type !== "multiple_choice") return null;
  const current =
    answer?.type === "multiple_choice"
      ? answer
      : {
          type: "multiple_choice" as const,
          questionId: question.id,
          selectedOptionIds: [],
          eliminatedOptionIds: [],
        };

  function select(optionId: string, selected: boolean) {
    const ids =
      question.type === "multiple_choice" && question.selection === "single"
        ? selected
          ? [optionId]
          : []
        : selected
          ? [...current.selectedOptionIds, optionId]
          : current.selectedOptionIds.filter((id) => id !== optionId);
    onChange({ ...current, selectedOptionIds: ids });
  }

  function toggleEliminated(optionId: string) {
    const eliminated = current.eliminatedOptionIds.includes(optionId)
      ? current.eliminatedOptionIds.filter((id) => id !== optionId)
      : [...current.eliminatedOptionIds, optionId];
    onChange({
      ...current,
      eliminatedOptionIds: eliminated,
      selectedOptionIds: current.selectedOptionIds.filter((id) => !eliminated.includes(id)),
    });
  }

  const single = question.selection === "single";

  const rows = question.options.map((option) => {
    const eliminated = current.eliminatedOptionIds.includes(option.id);
    const checked = current.selectedOptionIds.includes(option.id);
    return (
      <div
        key={option.id}
        className={cn(
          "flex items-start gap-3 rounded-[14px] border border-border bg-surface px-3.5 py-3",
          eliminated && "opacity-55",
        )}
      >
        {single ? (
          <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} disabled={disabled} />
        ) : (
          <Checkbox
            id={`${question.id}-${option.id}`}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(state) => select(option.id, state === true)}
          />
        )}
        <Label
          htmlFor={`${question.id}-${option.id}`}
          className={cn("flex-1 cursor-pointer font-normal", eliminated && "line-through")}
        >
          <ScientificContentRenderer content={option.content} inline />
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-pressed={eliminated}
          aria-label={t("assessment.mcq.eliminate")}
          onClick={() => toggleEliminated(option.id)}
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  });

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-[13.5px] text-muted-foreground">
        {single ? t("assessment.mcq.chooseOne") : t("assessment.mcq.chooseMultiple")}
      </legend>
      {single ? (
        <RadioGroup
          value={current.selectedOptionIds[0] ?? ""}
          onValueChange={(value) => select(value, true)}
          className="space-y-2"
        >
          {rows}
        </RadioGroup>
      ) : (
        <div className="space-y-2">{rows}</div>
      )}
    </fieldset>
  );
}

function TrueFalseInput({ question, answer, onChange, disabled }: AnswerEditorProps) {
  const { t } = useI18n();
  const value = answer?.type === "true_false" ? answer.value : null;
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-[13.5px] text-muted-foreground">
        {t("assessment.trueFalse.legend")}
      </legend>
      <RadioGroup
        value={value === null ? "" : value ? "true" : "false"}
        onValueChange={(next) =>
          onChange({ type: "true_false", questionId: question.id, value: next === "true" })
        }
        className="flex gap-2"
      >
        {(["true", "false"] as const).map((option) => (
          <div
            key={option}
            className="flex items-center gap-2.5 rounded-[14px] border border-border bg-surface px-4 py-3"
          >
            <RadioGroupItem value={option} id={`${question.id}-${option}`} disabled={disabled} />
            <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer font-normal">
              {option === "true" ? t("assessment.trueFalse.true") : t("assessment.trueFalse.false")}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

function ShortAnswerInput({ question, answer, onChange, disabled }: AnswerEditorProps) {
  const { t } = useI18n();
  const text = answer?.type === "short_answer" ? answer.text : "";
  const long = question.type === "short_answer" && question.expectedLength === "sentence";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${question.id}-short`} className="text-[14px] font-medium">
        {t("assessment.shortAnswer.label")}
      </Label>
      {long ? (
        <Textarea
          id={`${question.id}-short`}
          rows={3}
          value={text}
          disabled={disabled}
          onChange={(event) =>
            onChange({ type: "short_answer", questionId: question.id, text: event.target.value })
          }
        />
      ) : (
        <Input
          id={`${question.id}-short`}
          value={text}
          disabled={disabled}
          onChange={(event) =>
            onChange({ type: "short_answer", questionId: question.id, text: event.target.value })
          }
        />
      )}
    </div>
  );
}

function MatchingAnswerInput({ question, answer, onChange, disabled }: AnswerEditorProps) {
  const { t } = useI18n();
  if (question.type !== "matching") return null;
  const pairs = answer?.type === "matching" ? answer.pairs : [];

  function setPair(leftId: string, rightId: string) {
    const next = pairs.filter((pair) => pair.leftId !== leftId);
    if (rightId) next.push({ leftId, rightId });
    onChange({ type: "matching", questionId: question.id, pairs: next });
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-[13.5px] text-muted-foreground">
        {t("assessment.matching.legend")}
      </legend>
      {question.left.map((item) => {
        const selected = pairs.find((pair) => pair.leftId === item.id)?.rightId ?? "";
        return (
          <div
            key={item.id}
            className="grid items-center gap-2 rounded-[14px] border border-border bg-surface px-3.5 py-3 sm:grid-cols-2"
          >
            <div className="text-[15px]">
              <ScientificContentRenderer content={item.content} inline />
            </div>
            <Select value={selected} onValueChange={(value) => setPair(item.id, value)}>
              <SelectTrigger aria-label={t("assessment.matching.selectFor")} disabled={disabled}>
                <SelectValue placeholder={t("assessment.matching.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {question.right.map((right, index) => (
                  <SelectItem key={right.id} value={right.id}>
                    {`${index + 1}. ${plainText(right.content)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </fieldset>
  );
}

function plainText(content: PublicQuestion["prompt"]): string {
  return content
    .map((block) => {
      if (block.kind === "prose" || block.kind === "quotation") return block.text;
      if (block.kind === "math" || block.kind === "chemistry") return block.latex;
      if (block.kind === "code") return block.source;
      return "";
    })
    .join(" ")
    .trim();
}

function EssayAnswerInput({ question, answer, onChange, disabled }: AnswerEditorProps) {
  const { t } = useI18n();
  const text = answer?.type === "essay" ? answer.text : "";
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const suggested = question.type === "essay" ? question.suggestedWords : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${question.id}-essay`} className="text-[14px] font-medium">
        {t("assessment.essay.label")}
      </Label>
      <Textarea
        id={`${question.id}-essay`}
        value={text}
        rows={Math.min(24, Math.max(8, Math.ceil(text.length / 90) + 6))}
        disabled={disabled}
        onChange={(event) =>
          onChange({ type: "essay", questionId: question.id, text: event.target.value })
        }
      />
      <p className="text-[13px] text-muted-foreground" aria-live="polite">
        {t("assessment.essay.wordCount", { count: words })}
        {suggested ? ` · ${t("assessment.essay.suggested", { count: suggested })}` : ""}
      </p>
    </div>
  );
}

function CalculationAnswerInput({ question, answer, onChange, disabled }: AnswerEditorProps) {
  const { t } = useI18n();
  if (question.type !== "calculation") return null;
  const current =
    answer?.type === "calculation"
      ? answer
      : { type: "calculation" as const, questionId: question.id, latex: "" };

  return (
    <div className="space-y-3">
      <MathAnswerInput
        label={t("assessment.calculation.answerLabel")}
        value={current.latex}
        disabled={disabled}
        onChange={(latex) => onChange({ ...current, latex, display: latex })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${question.id}-unit`} className="text-[14px] font-medium">
            {t("assessment.calculation.unitLabel")}
          </Label>
          <Input
            id={`${question.id}-unit`}
            value={current.unit ?? ""}
            placeholder={question.unitHint ?? ""}
            disabled={disabled}
            onChange={(event) => onChange({ ...current, unit: event.target.value })}
          />
        </div>
      </div>
      {question.allowWorkings && (
        <div className="space-y-1.5">
          <Label htmlFor={`${question.id}-workings`} className="text-[14px] font-medium">
            {t("assessment.calculation.workingsLabel")}
          </Label>
          <Textarea
            id={`${question.id}-workings`}
            rows={4}
            value={current.workings ?? ""}
            disabled={disabled}
            onChange={(event) => onChange({ ...current, workings: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}
