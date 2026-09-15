/** Progressive setup form for Practice, Scored Quiz and Mock Exam. */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/lib/i18n/provider";
import {
  MAX_QUESTIONS_PER_TYPE,
  setMixCount,
  totalQuestions,
  validateSetup,
} from "@/lib/assessment/config";
import {
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
  SOURCE_SCOPES,
  TIME_PRESETS,
  type AssessmentConfig,
  type QuestionType,
} from "@/lib/assessment/types";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABEL_KEY, QUESTION_TYPE_LABEL_KEY } from "./QuestionRenderer";

const SOURCE_SCOPE_LABEL_KEY = {
  materials: "assessment.source.materials",
  web: "assessment.source.web",
  both: "assessment.source.both",
} as const;

export function DifficultyPicker({
  value,
  onChange,
}: {
  value: AssessmentConfig["difficulty"];
  onChange: (next: AssessmentConfig["difficulty"]) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="text-[14px] font-medium">{t("assessment.setup.difficulty")}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {DIFFICULTY_LEVELS.map((level) => (
          <Button
            key={level}
            type="button"
            variant={value === level ? "default" : "secondary"}
            size="sm"
            aria-pressed={value === level}
            onClick={() => onChange(level)}
          >
            {t(DIFFICULTY_LABEL_KEY[level])}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

export function SourceScopePicker({
  value,
  onChange,
  materials,
  selectedMaterialIds,
  onToggleMaterial,
}: {
  value: AssessmentConfig["sourceScope"];
  onChange: (next: AssessmentConfig["sourceScope"]) => void;
  materials: Array<{ id: string; name: string; section: string }>;
  selectedMaterialIds: string[];
  onToggleMaterial: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="space-y-3">
      <legend className="text-[14px] font-medium">{t("assessment.setup.sourceScope")}</legend>
      <RadioGroup value={value} onValueChange={(next) => onChange(next as typeof value)}>
        {SOURCE_SCOPES.map((scope) => (
          <div key={scope} className="flex items-center gap-2.5">
            <RadioGroupItem value={scope} id={`scope-${scope}`} />
            <Label htmlFor={`scope-${scope}`} className="cursor-pointer font-normal">
              {t(SOURCE_SCOPE_LABEL_KEY[scope])}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {value !== "web" && materials.length > 0 && (
        <div className="rounded-[14px] bg-surface-2 p-3">
          <p className="text-[13px] text-muted-foreground">
            {t("assessment.setup.narrowMaterials")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {materials.map((material) => (
              <li key={material.id} className="flex items-start gap-2.5">
                <Checkbox
                  id={`material-${material.id}`}
                  checked={selectedMaterialIds.includes(material.id)}
                  onCheckedChange={() => onToggleMaterial(material.id)}
                />
                <Label
                  htmlFor={`material-${material.id}`}
                  className="cursor-pointer text-[14px] font-normal"
                >
                  {material.name}
                  <span className="ml-1.5 text-muted-foreground">· {material.section}</span>
                </Label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {value !== "materials" && (
        <p className="text-[13px] text-muted-foreground">{t("assessment.setup.webNotice")}</p>
      )}
    </fieldset>
  );
}

export function QuestionMixEditor({
  mix,
  onChange,
}: {
  mix: AssessmentConfig["questionMix"];
  onChange: (next: AssessmentConfig["questionMix"]) => void;
}) {
  const { t } = useI18n();
  const total = totalQuestions(mix);
  return (
    <fieldset className="space-y-2">
      <legend className="text-[14px] font-medium">{t("assessment.setup.questionMix")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {QUESTION_TYPES.map((type: QuestionType) => (
          <div
            key={type}
            className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface px-3.5 py-2.5"
          >
            <Label htmlFor={`mix-${type}`} className="text-[14px] font-normal">
              {t(QUESTION_TYPE_LABEL_KEY[type])}
            </Label>
            <Input
              id={`mix-${type}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_QUESTIONS_PER_TYPE}
              value={mix[type]}
              onChange={(event) => onChange(setMixCount(mix, type, Number(event.target.value)))}
              className="tabular h-9 w-20 text-right"
            />
          </div>
        ))}
      </div>
      <p className="tabular text-[14px] font-semibold" aria-live="polite">
        {t("assessment.setup.totalQuestions", { count: total })}
      </p>
    </fieldset>
  );
}

export function TimeLimitPicker({
  value,
  onChange,
  allowUntimed,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  allowUntimed: boolean;
}) {
  const { t } = useI18n();
  const isPreset = value !== null && (TIME_PRESETS as readonly number[]).includes(value);
  const [custom, setCustom] = useState(!isPreset && value !== null);

  return (
    <fieldset className="space-y-2">
      <legend className="text-[14px] font-medium">{t("assessment.setup.timeAllowed")}</legend>
      <div className="flex flex-wrap gap-2">
        {allowUntimed && (
          <Button
            type="button"
            size="sm"
            variant={value === null ? "default" : "secondary"}
            aria-pressed={value === null}
            onClick={() => {
              setCustom(false);
              onChange(null);
            }}
          >
            {t("assessment.setup.untimed")}
          </Button>
        )}
        {TIME_PRESETS.map((minutes) => (
          <Button
            key={minutes}
            type="button"
            size="sm"
            variant={!custom && value === minutes ? "default" : "secondary"}
            aria-pressed={!custom && value === minutes}
            onClick={() => {
              setCustom(false);
              onChange(minutes);
            }}
          >
            {t("assessment.setup.minutes", { count: minutes })}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={custom ? "default" : "secondary"}
          aria-pressed={custom}
          onClick={() => {
            setCustom(true);
            onChange(value ?? 25);
          }}
        >
          {t("assessment.setup.custom")}
        </Button>
      </div>
      {custom && (
        <div className="flex items-center gap-2">
          <Label htmlFor="custom-minutes" className="text-[13.5px] font-normal">
            {t("assessment.setup.customMinutes")}
          </Label>
          <Input
            id="custom-minutes"
            type="number"
            min={1}
            max={300}
            value={value ?? 25}
            onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
            className="tabular h-9 w-24"
          />
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">{t("assessment.setup.timeNotice")}</p>
    </fieldset>
  );
}

export function AssessmentSetup({
  config,
  onChange,
  onGenerate,
  onCancel,
  materials,
  topics,
  learningGoals,
  disabled,
}: {
  config: AssessmentConfig;
  onChange: (next: AssessmentConfig) => void;
  onGenerate: () => void;
  onCancel?: () => void | undefined;
  materials: Array<{ id: string; name: string; section: string }>;
  topics: string[];
  learningGoals: Array<{ id: string; label: string }>;
  disabled?: boolean | undefined;
}) {
  const { t } = useI18n();
  const issues = useMemo(() => validateSetup(config), [config]);
  const total = totalQuestions(config.questionMix);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (issues.length === 0) onGenerate();
      }}
    >
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">{t("assessment.setup.scope")}</h3>
        <div className="rounded-[14px] bg-surface-2 px-3.5 py-3 text-[14px]">
          {t("assessment.setup.subjectFixed", { name: config.subjectName })}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic" className="text-[14px] font-medium">
            {t("assessment.setup.topic")}
          </Label>
          <Input
            id="topic"
            list="assessment-topics"
            value={config.topic ?? ""}
            placeholder={t("assessment.setup.topicAny")}
            onChange={(event) => onChange({ ...config, topic: event.target.value || undefined })}
          />
          <datalist id="assessment-topics">
            {topics.map((topic) => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </div>
        {learningGoals.length > 0 && (
          <fieldset>
            <legend className="text-[14px] font-medium">
              {t("assessment.setup.learningGoals")}
            </legend>
            <ul className="mt-2 space-y-1.5">
              {learningGoals.map((goal) => (
                <li key={goal.id} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`goal-${goal.id}`}
                    checked={config.learningGoalIds.includes(goal.id)}
                    onCheckedChange={() =>
                      onChange({
                        ...config,
                        learningGoalIds: config.learningGoalIds.includes(goal.id)
                          ? config.learningGoalIds.filter((id) => id !== goal.id)
                          : [...config.learningGoalIds, goal.id],
                      })
                    }
                  />
                  <Label
                    htmlFor={`goal-${goal.id}`}
                    className="cursor-pointer text-[14px] font-normal leading-[1.5]"
                  >
                    {goal.label}
                  </Label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
      </section>

      <DifficultyPicker
        value={config.difficulty}
        onChange={(difficulty) => onChange({ ...config, difficulty })}
      />

      <SourceScopePicker
        value={config.sourceScope}
        onChange={(sourceScope) => onChange({ ...config, sourceScope })}
        materials={materials}
        selectedMaterialIds={config.selectedMaterialIds}
        onToggleMaterial={(id) =>
          onChange({
            ...config,
            selectedMaterialIds: config.selectedMaterialIds.includes(id)
              ? config.selectedMaterialIds.filter((entry) => entry !== id)
              : [...config.selectedMaterialIds, id],
          })
        }
      />

      <QuestionMixEditor
        mix={config.questionMix}
        onChange={(questionMix) => onChange({ ...config, questionMix })}
      />

      <TimeLimitPicker
        value={config.timeLimitMinutes}
        allowUntimed={config.kind !== "mock_exam"}
        onChange={(timeLimitMinutes) => onChange({ ...config, timeLimitMinutes })}
      />

      <section className="space-y-2">
        <h3 className="text-[15px] font-semibold">{t("assessment.setup.advanced")}</h3>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="feedback-mode"
            checked={config.feedbackMode === "immediate"}
            disabled={config.kind === "mock_exam" || config.kind === "quiz"}
            onCheckedChange={(state) =>
              onChange({ ...config, feedbackMode: state === true ? "immediate" : "deferred" })
            }
          />
          <Label htmlFor="feedback-mode" className="cursor-pointer text-[14px] font-normal">
            {t("assessment.setup.immediateFeedback")}
          </Label>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="include-stats"
            checked={config.includeInStats}
            onCheckedChange={(state) => onChange({ ...config, includeInStats: state === true })}
          />
          <Label htmlFor="include-stats" className="cursor-pointer text-[14px] font-normal">
            {t("assessment.setup.includeInStats")}
          </Label>
        </div>
        <p className="text-[13px] text-muted-foreground">{t("assessment.setup.statsNotice")}</p>
      </section>

      <section className="space-y-2 rounded-[16px] border border-border bg-surface-2 p-4">
        <h3 className="text-[15px] font-semibold">{t("assessment.setup.review")}</h3>
        <dl className="grid gap-2 text-[14px] sm:grid-cols-2">
          <Row label={t("assessment.setup.review.subject")} value={config.subjectName} />
          <Row
            label={t("assessment.setup.review.difficulty")}
            value={t(DIFFICULTY_LABEL_KEY[config.difficulty])}
          />
          <Row label={t("assessment.setup.review.questions")} value={String(total)} />
          <Row
            label={t("assessment.setup.review.time")}
            value={
              config.timeLimitMinutes === null
                ? t("assessment.setup.untimed")
                : t("assessment.setup.minutes", { count: config.timeLimitMinutes })
            }
          />
          <Row
            label={t("assessment.setup.review.schoolLevel")}
            value={config.schoolLevel ?? t("assessment.setup.review.notOnFile")}
          />
          <Row
            label={t("assessment.setup.review.academicYear")}
            value={config.academicYear ?? t("assessment.setup.review.notOnFile")}
          />
          <Row label={t("assessment.setup.review.language")} value={config.language} />
          <Row
            label={t("assessment.setup.review.sources")}
            value={t(SOURCE_SCOPE_LABEL_KEY[config.sourceScope])}
          />
        </dl>
        {(config.schoolLevel === null || config.academicYear === null) && (
          <p className="text-[13px] text-muted-foreground">
            {t("assessment.setup.review.missingProfile")}
          </p>
        )}
      </section>

      {issues.length > 0 && (
        <ul className="space-y-1 text-[13.5px] text-warning" role="alert">
          {issues.map((issue) => (
            <li key={`${issue.field}-${issue.messageKey}`}>{t(issue.messageKey)}</li>
          ))}
        </ul>
      )}

      <div className={cn("flex flex-wrap gap-2")}>
        <Button type="submit" disabled={disabled || issues.length > 0}>
          {t("assessment.setup.generate")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
