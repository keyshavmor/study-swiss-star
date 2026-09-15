/**
 * Aggregates every translation area into one dictionary per language.
 * English is the source of truth for the typed key set and the fallback.
 */
import { LANGUAGE_CODES, type LanguageCode } from "../languages";

import { assessment } from "./assessment";
import { assistant } from "./assistant";
import { auth } from "./auth";
import { calendar } from "./calendar";
import { chat } from "./chat";
import { common } from "./common";
import { compliance } from "./compliance";
import { events } from "./events";
import { feedback } from "./feedback";
import { grades } from "./grades";
import { help } from "./help";
import { home } from "./home";
import { materials } from "./materials";
import { messaging } from "./messaging";
import { misc } from "./misc";
import { nav } from "./nav";
import { notifications } from "./notifications";
import { onboarding } from "./onboarding";
import { planner } from "./planner";
import { profile } from "./profile";
import { school } from "./school";
import { settings } from "./settings";
import { states } from "./states";
import { stats } from "./stats";
import { subject } from "./subject";
import { system } from "./system";

const AREAS = [
  assessment,
  assistant,
  auth,
  calendar,
  chat,
  common,
  compliance,
  events,
  feedback,
  grades,
  help,
  home,
  materials,
  messaging,
  misc,
  nav,
  notifications,
  onboarding,
  planner,
  profile,
  school,
  settings,
  states,
  stats,
  subject,
  system,
];

/** English dictionary shape — the typed key set for the whole app. */
export type EnglishDictionary = typeof assessment.en &
  typeof assistant.en &
  typeof auth.en &
  typeof calendar.en &
  typeof chat.en &
  typeof common.en &
  typeof compliance.en &
  typeof events.en &
  typeof feedback.en &
  typeof grades.en &
  typeof help.en &
  typeof home.en &
  typeof materials.en &
  typeof messaging.en &
  typeof misc.en &
  typeof nav.en &
  typeof notifications.en &
  typeof onboarding.en &
  typeof planner.en &
  typeof profile.en &
  typeof school.en &
  typeof settings.en &
  typeof states.en &
  typeof stats.en &
  typeof subject.en &
  typeof system.en;

export type TranslationKey = keyof EnglishDictionary & string;

function merge(language: LanguageCode): Record<string, string> {
  const target: Record<string, string> = {};
  for (const area of AREAS) {
    Object.assign(target, (area as Record<string, Record<string, string>>)[language] ?? {});
  }
  return target;
}

export const dictionaries: Record<LanguageCode, Record<string, string>> = LANGUAGE_CODES.reduce(
  (acc, code) => {
    acc[code] = merge(code);
    return acc;
  },
  {} as Record<LanguageCode, Record<string, string>>,
);
