import { describe, expect, it } from "vitest";
import {
  LEGAL_VERSIONS,
  ageOn,
  validateComplianceInput,
  type ComplianceFormInput,
} from "./compliance";

const NOW = new Date("2026-09-15T12:00:00Z");

function input(overrides: Partial<ComplianceFormInput> = {}): ComplianceFormInput {
  return {
    accountType: "student",
    dateOfBirth: "2010-05-01",
    guardianEmail: "parent@example.com",
    accountEmail: "pupil@example.com",
    acceptedTerms: true,
    acceptedPrivacy: true,
    acceptedAcceptableUse: true,
    acceptedChildSafety: true,
    ...overrides,
  };
}

describe("legal versions", () => {
  it("uses the current production versions for all four documents", () => {
    expect(LEGAL_VERSIONS).toEqual({
      terms: "2026-09-15",
      privacy: "2026-09-15",
      acceptable_use: "2026-09-15",
      child_safety: "2026-09-15",
    });
  });
});

describe("age calculation", () => {
  it("counts whole years and handles a birthday that has not happened yet", () => {
    expect(ageOn("2010-05-01", NOW)).toBe(16);
    expect(ageOn("2008-12-31", NOW)).toBe(17);
    expect(ageOn("2008-09-15", NOW)).toBe(18);
    expect(ageOn("not-a-date", NOW)).toBeNull();
  });
});

describe("compliance validation", () => {
  it("accepts a valid student", () => {
    expect(validateComplianceInput(input(), NOW)).toEqual([]);
  });

  it("accepts a valid teacher without a guardian email", () => {
    const errors = validateComplianceInput(
      input({ accountType: "teacher", dateOfBirth: "1990-04-04", guardianEmail: "" }),
      NOW,
    );
    expect(errors).toEqual([]);
  });

  it("requires a guardian email for students", () => {
    expect(validateComplianceInput(input({ guardianEmail: "" }), NOW)).toContain(
      "guardian_email_required",
    );
    expect(validateComplianceInput(input({ guardianEmail: "nope" }), NOW)).toContain(
      "guardian_email_invalid",
    );
  });

  it("rejects a guardian email equal to the student's own login email", () => {
    expect(
      validateComplianceInput(
        input({ guardianEmail: "Pupil@Example.com", accountEmail: "pupil@example.com" }),
        NOW,
      ),
    ).toContain("guardian_email_same_as_account");
  });

  it("requires students to be under 18", () => {
    expect(validateComplianceInput(input({ dateOfBirth: "2000-01-01" }), NOW)).toContain(
      "student_must_be_under_18",
    );
  });

  it("requires teachers to be 18 or older", () => {
    expect(
      validateComplianceInput(
        input({ accountType: "teacher", dateOfBirth: "2012-01-01", guardianEmail: "" }),
        NOW,
      ),
    ).toContain("teacher_must_be_adult");
  });

  it("requires a date of birth and an account type", () => {
    expect(validateComplianceInput(input({ dateOfBirth: "" }), NOW)).toContain("dob_required");
    expect(validateComplianceInput(input({ accountType: "" }), NOW)).toContain(
      "account_type_required",
    );
  });

  it("requires all four legal acknowledgements", () => {
    for (const key of [
      "acceptedTerms",
      "acceptedPrivacy",
      "acceptedAcceptableUse",
      "acceptedChildSafety",
    ] as const) {
      expect(validateComplianceInput(input({ [key]: false }), NOW)).toContain("consents_required");
    }
  });
});
