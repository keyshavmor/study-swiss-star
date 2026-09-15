/**
 * Signup compliance, safety onboarding, legal pages and suspension states.
 * English is the source of truth; the other six languages must define the same
 * key set (enforced by `bun run check:i18n`).
 */
export const compliance = {
  en: {
    /* ------------------------------------------------------ signup form --- */
    "signup.accountType.label": "I am signing up as",
    "signup.accountType.student": "Student (under 18)",
    "signup.accountType.teacher": "Teacher (18 or older)",
    "signup.accountType.hint":
      "Students must be under 18. Teachers must be 18 or older. This choice affects the safety rules that apply to your account.",
    "signup.dob.label": "Date of birth",
    "signup.dob.hint": "We use your date of birth only to apply the correct child-safety rules.",
    "signup.guardianEmail.label": "Parent or guardian email",
    "signup.guardianEmail.hint":
      "Required for students. It is used only for safety matters after a human review, and it is never shown to other users.",
    "signup.consent.title": "Please read and accept",
    "signup.consent.terms": "I accept the Terms of Use",
    "signup.consent.privacy": "I have read the Privacy Notice",
    "signup.consent.acceptableUse": "I accept the Acceptable Use and Behaviour Policy",
    "signup.consent.childSafety": "I have read the Child Safety Notice",
    "signup.consent.openLink": "Read",
    "signup.consent.required": "All four documents must be accepted before you can continue.",

    /* -------------------------------------------------- validation copy --- */
    "compliance.error.account_type_required": "Please choose student or teacher.",
    "compliance.error.dob_required": "Please enter your date of birth.",
    "compliance.error.dob_invalid": "Please enter a valid date of birth.",
    "compliance.error.student_must_be_under_18":
      "Student accounts are for pupils under 18. If you are 18 or older, choose the teacher account type.",
    "compliance.error.teacher_must_be_adult":
      "Teacher accounts require you to be 18 or older.",
    "compliance.error.guardian_email_required":
      "Students must provide a parent or guardian email address.",
    "compliance.error.guardian_email_invalid": "Please enter a valid guardian email address.",
    "compliance.error.guardian_email_same_as_account":
      "The guardian email must be different from your own login email.",
    "compliance.error.consents_required": "Please accept all four documents.",
    "compliance.error.saveFailed":
      "We could not save your details. Please check them and try again.",
    "compliance.error.loadFailed":
      "We could not load your account status. Check your connection and try again.",
    "compliance.retry": "Try again",

    /* --------------------------------------------- compliance onboarding -- */
    "compliance.title": "Before you start",
    "compliance.subtitle":
      "This app is made for school students under 18 and for teachers aged 18 or older. A few details keep everyone safe.",
    "compliance.section.role": "Your role",
    "compliance.section.consents": "Agreements",
    "compliance.safety.heading": "Child safety warning",
    "compliance.safety.body":
      "Sexual, explicit, graphic or otherwise age-inappropriate content is not allowed anywhere in this app — not in study chats and not in messages to other people. Grooming, bullying, harassment and sharing intimate images are strictly forbidden and are reviewed by humans. Lessons about history, health, medicine or similar topics stay allowed in an age-appropriate school context.",
    "compliance.safety.consequences":
      "If a confirmed violation happens, the content is blocked and you receive a warning. A second confirmed violation limits your account while a person reviews the case.",
    "compliance.submit": "Confirm and continue",
    "compliance.saving": "Saving…",
    "compliance.completedNote": "Your details are saved. Continuing…",

    /* -------------------------------------------------------- suspended --- */
    "suspended.title": "Your access is limited pending review",
    "suspended.body":
      "A person is reviewing a safety report about this account. During the review you cannot use the study features. Your account has not been deleted.",
    "suspended.guardianNote":
      "For student accounts, a notice to the registered parent or guardian may be prepared as part of this review. That step is always checked by a person first.",
    "suspended.helpTitle": "What you can do",
    "suspended.helpAppeal":
      "If you believe this is a mistake, contact your school contact person or write to the address in the Privacy Notice to ask for a review.",
    "suspended.helpPrivacy": "Privacy Notice",
    "suspended.helpTerms": "Terms of Use",
    "suspended.signOut": "Sign out",

    /* ------------------------------------------------------ legal pages --- */
    "legal.version": "Version {version}",
    "legal.lastUpdated": "Last updated {date}",
    "legal.backHome": "Back",
    "legal.baselineNote":
      "This is a production baseline for a European school setting. Your school or operator should have it reviewed by legal counsel or a data protection officer before launch.",
    "legal.terms.title": "Terms of Use",
    "legal.terms.intro":
      "These terms explain how students and teachers may use this study assistant.",
    "legal.terms.eligibility.title": "Who may use the app",
    "legal.terms.eligibility.body":
      "Student accounts are for pupils under 18 with a registered parent or guardian email. Teacher accounts are for adults aged 18 or older. You may only use your own account.",
    "legal.terms.use.title": "Using the app",
    "legal.terms.use.body":
      "Use the study tools for learning. Do not try to break the safety systems, do not upload content you have no right to share, and do not use the app to harm anyone.",
    "legal.terms.content.title": "Your content",
    "legal.terms.content.body":
      "Your notes, chats, grades and messages remain yours. You can export nothing automatically today, but you can delete your data at any time from System Health.",
    "legal.terms.availability.title": "Availability",
    "legal.terms.availability.body":
      "The AI features depend on a local model server with limited capacity. When capacity is unavailable the app continues without AI features.",
    "legal.terms.termination.title": "Limits and suspension",
    "legal.terms.termination.body":
      "A confirmed safety violation blocks the content and adds a warning. A second confirmed violation limits the account while a person reviews the case. Permanent deletion is a human decision, never an automatic one.",

    "legal.privacy.title": "Privacy Notice",
    "legal.privacy.intro":
      "This notice explains which data the app stores, why, and how you stay in control.",
    "legal.privacy.data.title": "What we store",
    "legal.privacy.data.body":
      "Account data (username, email, role, date of birth, guardian email for students), your school data (subjects, grades, planner entries, materials), your study chats, your messages with other users and their attachments, your settings, and bounded safety records without the offending content itself.",
    "legal.privacy.purpose.title": "Why we store it",
    "legal.privacy.purpose.body":
      "To provide the study features you use, to keep minors safe in messaging and AI chats, and to keep the service technically stable. We do not sell data and we do not use it for advertising.",
    "legal.privacy.minimisation.title": "Data minimisation",
    "legal.privacy.minimisation.body":
      "Other users can only find you by your exact username. Your email address, date of birth and guardian email are never shown to other users. System status pages only ever show aggregate numbers, never other people's identities.",
    "legal.privacy.retention.title": "How long we keep it",
    "legal.privacy.retention.body":
      "Your content stays until you delete it. When storage runs close to full, the oldest stored files across the platform may be removed automatically. Minimal, anonymised safety and legal records may be retained where the law or a legal claim requires it.",
    "legal.privacy.rights.title": "Your rights",
    "legal.privacy.rights.body":
      "You can see a summary of your own data and delete it by date range, delete all your content while keeping your account, or delete your account entirely. Open System Health to use these controls.",
    "legal.privacy.contact.title": "Contact",
    "legal.privacy.contact.body":
      "For privacy questions, contact the person responsible at your school or the operator of this installation.",

    "legal.acceptableUse.title": "Acceptable Use and Behaviour Policy",
    "legal.acceptableUse.intro": "These rules apply to study chats and to messages with other users.",
    "legal.acceptableUse.allowed.title": "Encouraged",
    "legal.acceptableUse.allowed.body":
      "Ask questions, share notes, discuss school subjects — including difficult topics such as history, war, health, medicine or sexual health — in an age-appropriate school context.",
    "legal.acceptableUse.forbidden.title": "Not allowed",
    "legal.acceptableUse.forbidden.body":
      "Sexual or explicit content, any sexual content involving minors, graphic violence, self-harm encouragement, bullying, harassment, hate, instructions for illegal acts, drug or weapon instructions, glorifying extremism, and sharing other people's private data.",
    "legal.acceptableUse.enforcement.title": "How we enforce this",
    "legal.acceptableUse.enforcement.body":
      "Unsafe content is blocked immediately. A first confirmed violation adds a warning. A second confirmed violation limits the account while a person reviews the case. Reviews are done by people, not by an automatic system alone.",

    "legal.childSafety.title": "Child Safety Notice",
    "legal.childSafety.intro":
      "Most people using this app are under 18. Safety comes before convenience.",
    "legal.childSafety.warning":
      "Explicit, sexual or otherwise age-inappropriate content is never allowed. Never send intimate images. Never ask a pupil to meet privately, hide a conversation or move to another app.",
    "legal.childSafety.report.title": "Reporting",
    "legal.childSafety.report.body":
      "If something worries you, tell a teacher or another trusted adult straight away. Serious cases are handled by people at your school, and where required by the responsible authorities.",
    "legal.childSafety.guardians.title": "Parents and guardians",
    "legal.childSafety.guardians.body":
      "For student accounts we store a guardian email address. It is used only for safety matters, and only after a person has reviewed the case.",
  },
};
