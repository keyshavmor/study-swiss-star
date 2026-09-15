/**
 * Account compliance / safety onboarding.
 *
 * CURRENT SUPABASE: `public.account_compliance` (own-row SELECT only) and the
 * RPC `complete_account_compliance_onboarding(...)`, which is the ONLY write
 * path. Compliance is never inferred from auth metadata.
 *
 * LEGAL REVIEW REQUIRED BEFORE PRODUCTION: the versions below are a production
 * baseline. Counsel/DPO sign-off is still required before launch.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AccountStatus, AccountType } from "@/integrations/supabase/types";

/** CURRENT versions the production RPC accepts. */
export const LEGAL_VERSIONS = {
  terms: "2026-09-15",
  privacy: "2026-09-15",
  acceptable_use: "2026-09-15",
  /** DB `document_type` is `safety_notice`; the page is titled Child Safety. */
  safety_notice: "2026-09-15",
} as const;

export interface AccountComplianceState {
  userId: string;
  accountType: AccountType;
  dateOfBirth: string | null;
  guardianEmail: string | null;
  complianceOnboardingCompleted: boolean;
  safetyIntroAcknowledgedAt: string | null;
  accountStatus: AccountStatus;
  safetyStrikeCount: number;
  suspensionReasonCode: string | null;
}

export const MIN_TEACHER_AGE = 18;

/** Whole years between `dob` and `at` (default now). */
export function ageOn(dob: string, at: Date = new Date()): number | null {
  const parsed = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  let age = at.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - parsed.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < parsed.getUTCDate())) age -= 1;
  return age;
}

export type ComplianceValidationError =
  | "account_type_required"
  | "dob_required"
  | "dob_invalid"
  | "student_must_be_under_18"
  | "teacher_must_be_adult"
  | "guardian_email_required"
  | "guardian_email_invalid"
  | "guardian_email_same_as_account"
  | "consents_required";

export interface ComplianceFormInput {
  accountType: AccountType | "";
  dateOfBirth: string;
  guardianEmail: string;
  accountEmail: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedAcceptableUse: boolean;
  acceptedChildSafety: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mirrors the production RPC's own checks so the user gets localized feedback
 * before the round trip. The RPC remains the authority.
 */
export function validateComplianceInput(
  input: ComplianceFormInput,
  now: Date = new Date(),
): ComplianceValidationError[] {
  const errors: ComplianceValidationError[] = [];

  if (input.accountType !== "student" && input.accountType !== "teacher") {
    errors.push("account_type_required");
  }

  if (!input.dateOfBirth.trim()) {
    errors.push("dob_required");
  } else {
    const age = ageOn(input.dateOfBirth, now);
    if (age === null || age < 0 || age > 120) {
      errors.push("dob_invalid");
    } else if (input.accountType === "student" && age >= MIN_TEACHER_AGE) {
      errors.push("student_must_be_under_18");
    } else if (input.accountType === "teacher" && age < MIN_TEACHER_AGE) {
      errors.push("teacher_must_be_adult");
    }
  }

  if (input.accountType === "student") {
    const guardian = input.guardianEmail.trim().toLowerCase();
    if (!guardian) errors.push("guardian_email_required");
    else if (!EMAIL_RE.test(guardian)) errors.push("guardian_email_invalid");
    else if (guardian === input.accountEmail.trim().toLowerCase()) {
      errors.push("guardian_email_same_as_account");
    }
  }

  if (
    !input.acceptedTerms ||
    !input.acceptedPrivacy ||
    !input.acceptedAcceptableUse ||
    !input.acceptedChildSafety
  ) {
    errors.push("consents_required");
  }

  return errors;
}

/** Reads the signed-in user's own compliance row. Returns null when absent. */
export async function fetchAccountCompliance(): Promise<AccountComplianceState | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("account_compliance")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    userId: data.user_id,
    accountType: data.account_type,
    dateOfBirth: data.date_of_birth,
    guardianEmail: data.guardian_email,
    complianceOnboardingCompleted: data.compliance_onboarding_completed === true,
    safetyIntroAcknowledgedAt: data.safety_intro_acknowledged_at,
    accountStatus: data.account_status,
    safetyStrikeCount: data.safety_strike_count ?? 0,
    suspensionReasonCode: data.suspension_reason_code,
  };
}

/**
 * Calls the production RPC. Completion is only true when the RPC confirms it —
 * the caller must re-read the compliance row before routing onwards.
 */
export async function completeComplianceOnboarding(input: {
  accountType: "student" | "teacher";
  dateOfBirth: string;
  guardianEmail: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("complete_account_compliance_onboarding", {
    p_account_type: input.accountType,
    p_date_of_birth: input.dateOfBirth,
    p_guardian_email: input.accountType === "student" ? input.guardianEmail : null,
    p_terms_version: LEGAL_VERSIONS.terms,
    p_privacy_version: LEGAL_VERSIONS.privacy,
    p_acceptable_use_version: LEGAL_VERSIONS.acceptable_use,
    p_safety_version: LEGAL_VERSIONS.safety_notice,
  });
  if (error) throw new Error(error.message);
}

/** Own consent records, newest first. Read-only. */
export async function fetchLegalConsents() {
  const { data, error } = await supabase
    .from("user_legal_consents")
    .select("*")
    .order("accepted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
