/**
 * Mathematical answer input.
 *
 * MathLive is loaded lazily in the browser only (it registers a custom
 * element, so it must never run during server rendering). Until it is ready —
 * and for students who prefer typing LaTeX — a plain, fully keyboard-accessible
 * LaTeX field with a live preview is used instead.
 *
 * Both the canonical LaTeX and the display string are stored.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/provider";
import { ScientificExpression } from "./ScientificContentRenderer";

const PALETTE: Array<{ label: string; latex: string }> = [
  { label: "a/b", latex: "\\frac{}{}" },
  { label: "x²", latex: "^{2}" },
  { label: "xₙ", latex: "_{n}" },
  { label: "√", latex: "\\sqrt{}" },
  { label: "log", latex: "\\log_{}" },
  { label: "∫", latex: "\\int" },
  { label: "Σ", latex: "\\sum" },
  { label: "π", latex: "\\pi" },
  { label: "Δ", latex: "\\Delta" },
  { label: "≤", latex: "\\le" },
  { label: "≥", latex: "\\ge" },
  { label: "·10ⁿ", latex: "\\cdot 10^{}" },
  { label: "vec", latex: "\\vec{}" },
  { label: "matrix", latex: "\\begin{pmatrix} & \\\\ & \\end{pmatrix}" },
];

export function MathAnswerInput({
  value,
  onChange,
  label,
  describedById,
  disabled,
}: {
  value: string;
  onChange: (latex: string) => void;
  label: string;
  describedById?: string | undefined;
  disabled?: boolean | undefined;
}) {
  const { t } = useI18n();
  const [rawMode, setRawMode] = useState(false);
  const [mathFieldReady, setMathFieldReady] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (rawMode || disabled) return;
    let cancelled = false;
    void import("mathlive")
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const field = document.createElement("math-field");
        field.setAttribute("aria-label", label);
        if (describedById) field.setAttribute("aria-describedby", describedById);
        field.className =
          "block w-full rounded-[14px] border border-border bg-surface px-3 py-2.5 text-[16px]";
        field.setAttribute("math-virtual-keyboard-policy", "manual");
        (field as unknown as { value: string }).value = value;
        field.addEventListener("input", () => {
          onChangeRef.current((field as unknown as { value: string }).value);
        });
        hostRef.current.replaceChildren(field);
        fieldRef.current = field;
        setMathFieldReady(true);
      })
      .catch(() => {
        // Fall back to the accessible LaTeX field.
        if (!cancelled) setRawMode(true);
      });
    return () => {
      cancelled = true;
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMode, disabled, label, describedById]);

  useEffect(() => {
    const field = fieldRef.current as unknown as { value: string } | null;
    if (field && field.value !== value) field.value = value;
  }, [value]);

  function insert(latex: string) {
    const field = fieldRef.current as unknown as
      | { executeCommand?: (cmd: [string | undefined, string]) => void; value: string }
      | null;
    if (field?.executeCommand) {
      field.executeCommand(["insert", latex]);
      onChange(field.value);
      return;
    }
    onChange(`${value}${latex}`);
    inputRef.current?.focus();
  }

  const showRaw = rawMode || !mathFieldReady;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-[14px] font-medium">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRawMode((mode) => !mode)}
          disabled={disabled}
        >
          {rawMode ? t("assessment.math.useEditor") : t("assessment.math.useLatex")}
        </Button>
      </div>

      {!rawMode && <div ref={hostRef} aria-live="off" />}

      {showRaw && (
        <div className="space-y-1.5">
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
            aria-describedby={describedById}
            disabled={disabled}
            placeholder={t("assessment.math.latexPlaceholder")}
            className="font-mono text-[15px]"
          />
          <div
            className="rounded-[14px] bg-surface-2 px-3 py-2 text-[15px]"
            aria-label={t("assessment.math.preview")}
          >
            {value.trim() ? (
              <ScientificExpression latex={value} />
            ) : (
              <span className="text-muted-foreground">{t("assessment.math.previewEmpty")}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("assessment.math.palette")}>
        {PALETTE.map((entry) => (
          <Button
            key={entry.label}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => insert(entry.latex)}
            className="h-8 min-w-9 px-2 text-[13px]"
          >
            {entry.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
