/**
 * Quick Check: one question, almost no configuration.
 *
 * It reuses the same question renderer, lifecycle and API contract as the
 * larger assessment modes — only the setup surface is compact.
 */
import { Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/provider";
import type { AssessmentConfig } from "@/lib/assessment/types";
import { DifficultyPicker, SourceScopePicker } from "./AssessmentSetup";

export function QuickCheckSetup({
  config,
  onChange,
  onGenerate,
  materials,
  topics,
  disabled,
}: {
  config: AssessmentConfig;
  onChange: (next: AssessmentConfig) => void;
  onGenerate: () => void;
  materials: Array<{ id: string; name: string; section: string }>;
  topics: string[];
  disabled?: boolean | undefined;
}) {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <section className="rounded-[20px] border border-border bg-surface p-6 text-center">
      <Sparkles className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
      <h3 className="mt-3 text-[18px] font-semibold tracking-tight">
        {t("assessment.quickCheck.heading")}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-[14.5px] text-muted-foreground">
        {t("assessment.quickCheck.body", { name: config.subjectName })}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onGenerate} disabled={disabled}>
          {t("assessment.quickCheck.give")}
        </Button>
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost">
              <Settings2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("assessment.quickCheck.changeSettings")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-80 space-y-4 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="quick-topic" className="text-[14px] font-medium">
                {t("assessment.setup.topic")}
              </Label>
              <Input
                id="quick-topic"
                list="quick-topics"
                value={config.topic ?? ""}
                placeholder={t("assessment.setup.topicAny")}
                onChange={(event) => onChange({ ...config, topic: event.target.value || undefined })}
              />
              <datalist id="quick-topics">
                {topics.map((topic) => (
                  <option key={topic} value={topic} />
                ))}
              </datalist>
            </div>
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
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}
