/**
 * Subject/School AI dependency classification and the guards that consume it.
 *
 * These assertions read the shipped route sources so a future edit cannot quietly
 * remove a pre-request guard.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AI_DEPENDENT_SUBJECT_MODES,
  NON_AI_SUBJECT_MODES,
  isAiDependentSubjectMode,
  isAiDependentSubjectTool,
  keepsReadOnlyContentWhenBlocked,
} from "./ai-mode-classification";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const subjectRoute = read("../routes/_authenticated/school.$subject.tsx");
const schoolRoute = read("../routes/_authenticated/school.index.tsx");
const statusBanner = read("../components/app/AiStatusBanner.tsx");

describe("AI dependency classification", () => {
  it("classifies every AI-dependent subject mode", () => {
    for (const mode of ["Chat", "Quick Check", "Knowledge Profile", "Quiz Mode", "Mock Exam", "Study Plan"] as const) {
      expect(isAiDependentSubjectMode(mode)).toBe(true);
      expect(AI_DEPENDENT_SUBJECT_MODES).toContain(mode);
    }
  });

  it("keeps statistics and subject tools usable without AI", () => {
    expect(isAiDependentSubjectMode("Statistics")).toBe(false);
    expect(isAiDependentSubjectMode("Subject Tools")).toBe(false);
    expect(NON_AI_SUBJECT_MODES).toEqual(["Statistics", "Subject Tools"]);
  });

  it("classifies subject tools individually rather than blanket-blocking", () => {
    expect(isAiDependentSubjectTool("formula-sheet")).toBe(false);
    expect(isAiDependentSubjectTool("unit-converter")).toBe(false);
    expect(isAiDependentSubjectTool("summary-generator")).toBe(true);
    expect(isAiDependentSubjectTool("concept-explainer")).toBe(true);
  });

  it("keeps stored knowledge-profile content readable while blocked", () => {
    expect(keepsReadOnlyContentWhenBlocked("Knowledge Profile")).toBe(true);
    expect(keepsReadOnlyContentWhenBlocked("Quiz Mode")).toBe(false);
  });
});

describe("School page AI status", () => {
  it("shows the compact readiness state without issuing an AI request", () => {
    expect(schoolRoute).toContain("AiStatusBanner");
    expect(schoolRoute).not.toContain("prepareModel");
    expect(schoolRoute).not.toContain("markAiReady");
  });

  it("derives status from the central availability state only", () => {
    expect(statusBanner).toContain("useAiAvailability");
    expect(statusBanner).toContain("MODEL_ONBOARDING_PATH");
    expect(statusBanner).not.toContain("prepareModel");
    expect(statusBanner).not.toContain("probeSystemCapability");
  });

  it("covers ready, preparing and blocked states", () => {
    expect(statusBanner).toContain('ai.status.readyTitle');
    expect(statusBanner).toContain('ai.status.preparingTitle');
    expect(statusBanner).toContain('ai.status.blockedTitle');
  });
});

describe("Subject page mode guards", () => {
  it("uses the single central readiness truth", () => {
    expect(subjectRoute).toContain("useAiBlocked");
    expect(subjectRoute).toContain("isAiDependentSubjectMode");
    expect(subjectRoute).toContain("AiStatusBanner");
  });

  it("gates opening chat instead of navigating into an AI chat", () => {
    expect(subjectRoute).toMatch(/aiBlocked \?[\s\S]{0,200}AiBlockedNotice/);
    expect(subjectRoute).toContain('<Link to="/chat">');
  });

  it("gates the knowledge-profile AI part but keeps stored entries visible", () => {
    expect(subjectRoute).toContain("ai.status.aiOnlyPart");
    expect(subjectRoute).toContain("<KnowledgeProfile");
  });

  it("blocks the AI-dependent placeholder modes such as Study Plan", () => {
    expect(subjectRoute).toContain("modeNeedsAi && aiBlocked");
  });

  it("keeps assessment modes behind the panel's own pre-request guard", () => {
    const panel = read("../components/app/assessment/AssessmentModePanel.tsx");
    expect(panel).toContain("useAiBlocked");
    expect(panel).toContain("AiBlockedNotice");
  });
});
