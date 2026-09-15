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
    "compliance.error.teacher_must_be_adult": "Teacher accounts require you to be 18 or older.",
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
    "legal.acceptableUse.intro":
      "These rules apply to study chats and to messages with other users.",
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
  de: {
    "signup.accountType.label": "Ich melde mich an als",
    "signup.accountType.student": "Schüler:in (unter 18)",
    "signup.accountType.teacher": "Lehrperson (18 oder älter)",
    "signup.accountType.hint":
      "Schüler:innen müssen unter 18 sein. Lehrpersonen müssen 18 oder älter sein. Diese Wahl bestimmt, welche Sicherheitsregeln für dein Konto gelten.",
    "signup.dob.label": "Geburtsdatum",
    "signup.dob.hint":
      "Wir verwenden dein Geburtsdatum nur, um die richtigen Kinderschutzregeln anzuwenden.",
    "signup.guardianEmail.label": "E-Mail der Eltern oder Erziehungsberechtigten",
    "signup.guardianEmail.hint":
      "Für Schüler:innen erforderlich. Sie wird nur bei Sicherheitsfragen nach einer menschlichen Prüfung verwendet und nie anderen Nutzer:innen angezeigt.",
    "signup.consent.title": "Bitte lesen und akzeptieren",
    "signup.consent.terms": "Ich akzeptiere die Nutzungsbedingungen",
    "signup.consent.privacy": "Ich habe die Datenschutzerklärung gelesen",
    "signup.consent.acceptableUse":
      "Ich akzeptiere die Richtlinie für zulässige Nutzung und Verhalten",
    "signup.consent.childSafety": "Ich habe den Kinderschutzhinweis gelesen",
    "signup.consent.openLink": "Lesen",
    "signup.consent.required":
      "Alle vier Dokumente müssen akzeptiert werden, bevor du fortfahren kannst.",

    "compliance.error.account_type_required": "Bitte wähle Schüler:in oder Lehrperson.",
    "compliance.error.dob_required": "Bitte gib dein Geburtsdatum ein.",
    "compliance.error.dob_invalid": "Bitte gib ein gültiges Geburtsdatum ein.",
    "compliance.error.student_must_be_under_18":
      "Schülerkonten sind für Lernende unter 18. Bist du 18 oder älter, wähle den Kontotyp Lehrperson.",
    "compliance.error.teacher_must_be_adult":
      "Lehrpersonenkonten setzen voraus, dass du 18 oder älter bist.",
    "compliance.error.guardian_email_required":
      "Schüler:innen müssen eine E-Mail-Adresse der Eltern oder Erziehungsberechtigten angeben.",
    "compliance.error.guardian_email_invalid":
      "Bitte gib eine gültige E-Mail-Adresse der Erziehungsberechtigten ein.",
    "compliance.error.guardian_email_same_as_account":
      "Die E-Mail der Erziehungsberechtigten muss sich von deiner eigenen Login-E-Mail unterscheiden.",
    "compliance.error.consents_required": "Bitte akzeptiere alle vier Dokumente.",
    "compliance.error.saveFailed":
      "Wir konnten deine Angaben nicht speichern. Bitte überprüfe sie und versuche es erneut.",
    "compliance.error.loadFailed":
      "Wir konnten deinen Kontostatus nicht laden. Prüfe deine Verbindung und versuche es erneut.",
    "compliance.retry": "Erneut versuchen",

    "compliance.title": "Bevor du startest",
    "compliance.subtitle":
      "Diese App ist für Schüler:innen unter 18 und für Lehrpersonen ab 18 Jahren gemacht. Ein paar Angaben sorgen dafür, dass alle sicher sind.",
    "compliance.section.role": "Deine Rolle",
    "compliance.section.consents": "Vereinbarungen",
    "compliance.safety.heading": "Kinderschutz-Hinweis",
    "compliance.safety.body":
      "Sexuelle, explizite, grafische oder sonst altersunangemessene Inhalte sind in dieser App nirgends erlaubt — weder in Lernchats noch in Nachrichten an andere Personen. Grooming, Mobbing, Belästigung und das Teilen intimer Bilder sind strikt verboten und werden von Menschen geprüft. Unterricht zu Themen wie Geschichte, Gesundheit, Medizin oder Ähnlichem bleibt im altersgerechten Schulkontext erlaubt.",
    "compliance.safety.consequences":
      "Bei einem bestätigten Verstoss wird der Inhalt blockiert und du erhältst eine Verwarnung. Ein zweiter bestätigter Verstoss schränkt dein Konto ein, während eine Person den Fall prüft.",
    "compliance.submit": "Bestätigen und fortfahren",
    "compliance.saving": "Wird gespeichert…",
    "compliance.completedNote": "Deine Angaben sind gespeichert. Es geht weiter…",

    "suspended.title": "Dein Zugang ist bis zur Prüfung eingeschränkt",
    "suspended.body":
      "Eine Person prüft gerade eine Sicherheitsmeldung zu diesem Konto. Während der Prüfung kannst du die Lernfunktionen nicht nutzen. Dein Konto wurde nicht gelöscht.",
    "suspended.guardianNote":
      "Bei Schülerkonten kann als Teil dieser Prüfung eine Benachrichtigung an die registrierten Eltern oder Erziehungsberechtigten vorbereitet werden. Dieser Schritt wird immer zuerst von einer Person geprüft.",
    "suspended.helpTitle": "Was du tun kannst",
    "suspended.helpAppeal":
      "Falls du glaubst, dass das ein Irrtum ist, wende dich an deine Ansprechperson an der Schule oder schreibe an die Adresse in der Datenschutzerklärung, um eine Überprüfung zu verlangen.",
    "suspended.helpPrivacy": "Datenschutzerklärung",
    "suspended.helpTerms": "Nutzungsbedingungen",
    "suspended.signOut": "Abmelden",

    "legal.version": "Version {version}",
    "legal.lastUpdated": "Zuletzt aktualisiert am {date}",
    "legal.backHome": "Zurück",
    "legal.baselineNote":
      "Dies ist eine Produktions-Basisversion für ein europäisches Schulumfeld. Deine Schule oder der Betreiber sollte sie vor dem Start von einer Rechtsberatung oder einer Datenschutzbeauftragten prüfen lassen.",
    "legal.terms.title": "Nutzungsbedingungen",
    "legal.terms.intro":
      "Diese Bedingungen erklären, wie Schüler:innen und Lehrpersonen diesen Lernassistenten nutzen dürfen.",
    "legal.terms.eligibility.title": "Wer die App nutzen darf",
    "legal.terms.eligibility.body":
      "Schülerkonten sind für Lernende unter 18 mit registrierter E-Mail der Erziehungsberechtigten. Lehrpersonenkonten sind für Erwachsene ab 18 Jahren. Du darfst nur dein eigenes Konto nutzen.",
    "legal.terms.use.title": "Die App nutzen",
    "legal.terms.use.body":
      "Nutze die Lernwerkzeuge zum Lernen. Versuche nicht, die Sicherheitssysteme zu umgehen, lade keine Inhalte hoch, an denen du keine Rechte hast, und nutze die App nicht, um jemandem zu schaden.",
    "legal.terms.content.title": "Deine Inhalte",
    "legal.terms.content.body":
      "Deine Notizen, Chats, Noten und Nachrichten bleiben dein Eigentum. Ein automatischer Export ist heute nicht möglich, aber du kannst deine Daten jederzeit über System-Gesundheit löschen.",
    "legal.terms.availability.title": "Verfügbarkeit",
    "legal.terms.availability.body":
      "Die KI-Funktionen hängen von einem lokalen Modellserver mit begrenzter Kapazität ab. Ist keine Kapazität verfügbar, funktioniert die App weiter ohne KI-Funktionen.",
    "legal.terms.termination.title": "Einschränkungen und Sperrung",
    "legal.terms.termination.body":
      "Ein bestätigter Sicherheitsverstoss blockiert den Inhalt und fügt eine Verwarnung hinzu. Ein zweiter bestätigter Verstoss schränkt das Konto ein, während eine Person den Fall prüft. Eine endgültige Löschung ist immer eine menschliche Entscheidung, nie eine automatische.",

    "legal.privacy.title": "Datenschutzerklärung",
    "legal.privacy.intro":
      "Dieser Hinweis erklärt, welche Daten die App speichert, weshalb, und wie du die Kontrolle behältst.",
    "legal.privacy.data.title": "Was wir speichern",
    "legal.privacy.data.body":
      "Kontodaten (Benutzername, E-Mail, Rolle, Geburtsdatum, E-Mail der Erziehungsberechtigten bei Schüler:innen), deine Schuldaten (Fächer, Noten, Planer-Einträge, Materialien), deine Lernchats, deine Nachrichten mit anderen Nutzer:innen samt Anhängen, deine Einstellungen sowie begrenzte Sicherheitsdatensätze ohne den beanstandeten Inhalt selbst.",
    "legal.privacy.purpose.title": "Wozu wir es speichern",
    "legal.privacy.purpose.body":
      "Um dir die genutzten Lernfunktionen bereitzustellen, um Minderjährige in Nachrichten und KI-Chats zu schützen, und um den Dienst technisch stabil zu halten. Wir verkaufen keine Daten und nutzen sie nicht für Werbung.",
    "legal.privacy.minimisation.title": "Datensparsamkeit",
    "legal.privacy.minimisation.body":
      "Andere Nutzer:innen können dich nur über deinen exakten Benutzernamen finden. Deine E-Mail-Adresse, dein Geburtsdatum und die E-Mail der Erziehungsberechtigten werden anderen Nutzer:innen nie angezeigt. Systemstatus-Seiten zeigen immer nur Gesamtzahlen, nie die Identität anderer Personen.",
    "legal.privacy.retention.title": "Wie lange wir es aufbewahren",
    "legal.privacy.retention.body":
      "Deine Inhalte bleiben, bis du sie löschst. Wird der Speicher knapp, können die ältesten gespeicherten Dateien plattformweit automatisch entfernt werden. Minimale, anonymisierte Sicherheits- und Rechtsdatensätze können aufbewahrt werden, wenn das Gesetz oder ein Rechtsanspruch dies verlangt.",
    "legal.privacy.rights.title": "Deine Rechte",
    "legal.privacy.rights.body":
      "Du kannst eine Zusammenfassung deiner eigenen Daten einsehen und sie nach Zeitraum löschen, alle deine Inhalte löschen und dabei dein Konto behalten, oder dein Konto ganz löschen. Öffne System-Gesundheit, um diese Kontrollen zu nutzen.",
    "legal.privacy.contact.title": "Kontakt",
    "legal.privacy.contact.body":
      "Bei Fragen zum Datenschutz wende dich an die verantwortliche Person an deiner Schule oder den Betreiber dieser Installation.",

    "legal.acceptableUse.title": "Richtlinie für zulässige Nutzung und Verhalten",
    "legal.acceptableUse.intro":
      "Diese Regeln gelten für Lernchats und für Nachrichten mit anderen Nutzer:innen.",
    "legal.acceptableUse.allowed.title": "Erwünscht",
    "legal.acceptableUse.allowed.body":
      "Stelle Fragen, teile Notizen, diskutiere Schulfächer — auch schwierige Themen wie Geschichte, Krieg, Gesundheit, Medizin oder sexuelle Gesundheit — im altersgerechten Schulkontext.",
    "legal.acceptableUse.forbidden.title": "Nicht erlaubt",
    "legal.acceptableUse.forbidden.body":
      "Sexuelle oder explizite Inhalte, jeglicher sexueller Inhalt mit Minderjährigen, grafische Gewalt, Ermutigung zu Selbstverletzung, Mobbing, Belästigung, Hass, Anleitungen zu illegalen Handlungen, Drogen- oder Waffenanleitungen, Verherrlichung von Extremismus sowie das Teilen privater Daten anderer Personen.",
    "legal.acceptableUse.enforcement.title": "Wie wir das durchsetzen",
    "legal.acceptableUse.enforcement.body":
      "Unsichere Inhalte werden sofort blockiert. Ein erster bestätigter Verstoss führt zu einer Verwarnung. Ein zweiter bestätigter Verstoss schränkt das Konto ein, während eine Person den Fall prüft. Überprüfungen werden von Menschen durchgeführt, nie allein von einem automatischen System.",

    "legal.childSafety.title": "Kinderschutzhinweis",
    "legal.childSafety.intro":
      "Die meisten Personen, die diese App nutzen, sind unter 18. Sicherheit geht vor Bequemlichkeit.",
    "legal.childSafety.warning":
      "Explizite, sexuelle oder sonst altersunangemessene Inhalte sind nie erlaubt. Sende niemals intime Bilder. Bitte nie eine Schülerin oder einen Schüler, sich privat zu treffen, ein Gespräch zu verstecken oder in eine andere App zu wechseln.",
    "legal.childSafety.report.title": "Meldung",
    "legal.childSafety.report.body":
      "Wenn dich etwas beunruhigt, sag es sofort einer Lehrperson oder einer anderen Vertrauensperson. Ernste Fälle werden von Personen an deiner Schule behandelt, und wo erforderlich von den zuständigen Behörden.",
    "legal.childSafety.guardians.title": "Eltern und Erziehungsberechtigte",
    "legal.childSafety.guardians.body":
      "Bei Schülerkonten speichern wir eine E-Mail-Adresse der Erziehungsberechtigten. Sie wird nur bei Sicherheitsfragen verwendet, und erst, nachdem eine Person den Fall geprüft hat.",
  },
  gsw: {
    "signup.accountType.label": "Ich mäld mi aa als",
    "signup.accountType.student": "Schüeler:in (under 18)",
    "signup.accountType.teacher": "Lehrperson (18 oder elter)",
    "signup.accountType.hint":
      "Schüeler:innen müend under 18 sii. Lehrperson müend 18 oder elter sii. Die Wahl bestimmt, weli Sicherheitsregle für dis Konto gälte.",
    "signup.dob.label": "Geburtsdatum",
    "signup.dob.hint":
      "Mir bruuche dis Geburtsdatum nur, für die richtige Chinderschutz-Regle aazwände.",
    "signup.guardianEmail.label": "E-Mail vo de Eltere oder Erziehigsberechtigte",
    "signup.guardianEmail.hint":
      "Für Schüeler:innen erforderlich. Si wird nur bi Sicherheitsfrage nach ere mönschliche Prüefig bruucht und niemals andere Nutzer:innen aazeigt.",
    "signup.consent.title": "Bitte läse und akzeptiere",
    "signup.consent.terms": "Ich akzeptier d Nutzigsbedingige",
    "signup.consent.privacy": "Ich han d Datenschutzerklärig gläse",
    "signup.consent.acceptableUse": "Ich akzeptier d Richtlinie für zuegässeni Nutzig und Verhalte",
    "signup.consent.childSafety": "Ich han dr Chinderschutz-Hiwiis gläse",
    "signup.consent.openLink": "Läse",
    "signup.consent.required":
      "Alli vier Dokumänt müend akzeptiert werde, bevor du wiitermache chasch.",

    "compliance.error.account_type_required": "Bitte wähl Schüeler:in oder Lehrperson.",
    "compliance.error.dob_required": "Bitte gib dis Geburtsdatum ii.",
    "compliance.error.dob_invalid": "Bitte gib es gültigs Geburtsdatum ii.",
    "compliance.error.student_must_be_under_18":
      "Schüelerkonte sind für Lernendi under 18. Bisch 18 oder elter, wähl dr Kontotyp Lehrperson.",
    "compliance.error.teacher_must_be_adult":
      "Lehrperson-Konte setzed voruus, dass du 18 oder elter bisch.",
    "compliance.error.guardian_email_required":
      "Schüeler:innen müend e E-Mail-Adrässe vo de Eltere oder Erziehigsberechtigte aagäh.",
    "compliance.error.guardian_email_invalid":
      "Bitte gib e gültigi E-Mail-Adrässe vo dr Erziehigsberechtigte ii.",
    "compliance.error.guardian_email_same_as_account":
      "D E-Mail vo dr Erziehigsberechtigte muess sich vo dinere eigete Login-E-Mail unterscheide.",
    "compliance.error.consents_required": "Bitte akzeptier alli vier Dokumänt.",
    "compliance.error.saveFailed":
      "Mir händ dini Aagabe nöd chöne spichere. Bitte prüef si und versuech's nomol.",
    "compliance.error.loadFailed":
      "Mir händ din Kontostatus nöd chöne lade. Prüef dini Verbindig und versuech's nomol.",
    "compliance.retry": "Nomol versueche",

    "compliance.title": "Bevor's losgaht",
    "compliance.subtitle":
      "Die App isch für Schüeler:innen under 18 und für Lehrperson ab 18 Jahr gmacht. E paar Aagabe sorged defür, dass alli sicher sind.",
    "compliance.section.role": "Dini Rolle",
    "compliance.section.consents": "Vereinbarige",
    "compliance.safety.heading": "Chinderschutz-Hiwiis",
    "compliance.safety.body":
      "Sexuelli, expliziti, grafischi oder sunst altersunaagmässeni Inhalt sind i dere App nienevo erlaubt — weder i Lernchats no i Nachrichte a anderi Persone. Grooming, Mobbing, Belästigung und s Teile vo intime Bilder sind strikt verbote und werded vo Mönsche gprüeft. Unterricht zu Theme wie Gschicht, Gsundheit, Medizin oder Ähnligem blibt im altersgrächte Schuelkontext erlaubt.",
    "compliance.safety.consequences":
      "Bi eme bestätigte Verstoss wird dr Inhalt blockiert und du übercho e Verwarnig. E zwöite bestätigti Verstoss schränkt dis Konto ii, während e Person dr Fall prüeft.",
    "compliance.submit": "Bestätige und wiitermache",
    "compliance.saving": "Wird gspeicheret…",
    "compliance.completedNote": "Dini Aagabe sind gspeicheret. Es gaht wiiter…",

    "suspended.title": "Din Zuegang isch bis zur Prüefig iigschränkt",
    "suspended.body":
      "E Person prüeft grad e Sicherheitsmäldig zu däm Konto. Während dr Prüefig chasch d Lernfunktione nöd nutze. Dis Konto isch nöd glöscht worde.",
    "suspended.guardianNote":
      "Bi Schüelerkonte cha als Teil vo dere Prüefig e Benachrichtigung a die registrierte Eltere oder Erziehigsberechtigte vorbereitet werde. Dä Schritt wird immer zerscht vo ere Person gprüeft.",
    "suspended.helpTitle": "Was du mache chasch",
    "suspended.helpAppeal":
      "Falls du meinsch, das sig es Missverständnis, wend di a dini Aaspräch-Person a dr Schuel oder schriib a d Adrässe i dr Datenschutzerklärig, für e Überprüefig z verlange.",
    "suspended.helpPrivacy": "Datenschutzerklärig",
    "suspended.helpTerms": "Nutzigsbedingige",
    "suspended.signOut": "Abmälde",

    "legal.version": "Version {version}",
    "legal.lastUpdated": "Zletscht aktualisiert am {date}",
    "legal.backHome": "Zrugg",
    "legal.baselineNote":
      "Das isch e Produktions-Basisversion für es europäischs Schuelumfäld. Dini Schuel oder dr Betriiber sött si vor em Start vo ere Rächtsberatig oder ere Datenschutzbeuftragte prüefe lah.",
    "legal.terms.title": "Nutzigsbedingige",
    "legal.terms.intro":
      "Die Bedingige erkläred, wie Schüeler:innen und Lehrperson dä Lernassistent bruche dörfed.",
    "legal.terms.eligibility.title": "Wer d App bruche darf",
    "legal.terms.eligibility.body":
      "Schüelerkonte sind für Lernendi under 18 mit ere registrierte E-Mail vo dr Erziehigsberechtigte. Lehrperson-Konte sind für Erwachseni ab 18 Jahr. Du darfsch nur dis eigets Konto bruche.",
    "legal.terms.use.title": "D App bruche",
    "legal.terms.use.body":
      "Bruch d Lernwärchziig zum Lerne. Versuech nöd, d Sicherheitssystem z umgah, lad kei Inhalt uuf, a däm du kei Rächt hesch, und bruch d App nöd, für öpperem z schade.",
    "legal.terms.content.title": "Dini Inhalt",
    "legal.terms.content.body":
      "Dini Notize, Chats, Note und Nachrichte blibed dis Eigetum. E automatische Export gaht hüt no nöd, aber du chasch dini Date jedersiit über System-Gsundheit lösche.",
    "legal.terms.availability.title": "Verfüegbarkeit",
    "legal.terms.availability.body":
      "D KI-Funktione sind vo eme lokale Modellserver mit begränzter Kapazität abhängig. Isch kei Kapazität verfüegbar, laift d App wiiter ohni KI-Funktione.",
    "legal.terms.termination.title": "Iischränkige und Sperrig",
    "legal.terms.termination.body":
      "E bestätigte Sicherheitsverstoss blockiert dr Inhalt und fügt e Verwarnig dezue. E zwöite bestätigti Verstoss schränkt s Konto ii, während e Person dr Fall prüeft. Es ändgültigs Lösche isch immer e mönschlichi Entscheidig, nie e automatischi.",

    "legal.privacy.title": "Datenschutzerklärig",
    "legal.privacy.intro":
      "Dä Hiwiis erklärt, weli Date d App spichert, wieso, und wie du d Kontrolle behaltisch.",
    "legal.privacy.data.title": "Was mir spichered",
    "legal.privacy.data.body":
      "Kontodate (Benutzername, E-Mail, Rolle, Geburtsdatum, E-Mail vo dr Erziehigsberechtigte bi Schüeler:innen), dini Schueldate (Fächer, Note, Planer-Iiträg, Materialie), dini Lernchats, dini Nachrichte mit andere Nutzer:innen samt Aahäng, dini Iistellige sowie begränzti Sicherheits-Datesätz ohni dr beanstandet Inhalt sälber.",
    "legal.privacy.purpose.title": "Wieso mir's spichered",
    "legal.privacy.purpose.body":
      "Für dir die gnutzte Lernfunktione bereitzstelle, für Minderjährigi i Nachrichte und KI-Chats z schütze, und für dr Dienst technisch stabil z halte. Mir verchaufed kei Date und bruched si nöd für Wärbig.",
    "legal.privacy.minimisation.title": "Datesparsamkeit",
    "legal.privacy.minimisation.body":
      "Anderi Nutzer:innen chönd di nur über din exakte Benutzername finde. Dini E-Mail-Adrässe, dis Geburtsdatum und d E-Mail vo dr Erziehigsberechtigte werded andere Nutzer:innen nie aazeigt. Systemstatus-Site zeiged immer nur Gsamtzahle, nie d Identität vo andere Persone.",
    "legal.privacy.retention.title": "Wie lang mir's ufbewahred",
    "legal.privacy.retention.body":
      "Dini Inhalt blibed, bis du si löschisch. Wird dr Speicher knapp, chönd die ältischte gspeicherete Dateie plattformwiit automatisch entfernt werde. Minimali, anonymisierti Sicherheits- und Rächtsdatesätz chönd ufbewahrt werde, wänn's Gsetz oder e Rächtsaaspruch das verlangt.",
    "legal.privacy.rights.title": "Dini Rächt",
    "legal.privacy.rights.body":
      "Du chasch e Zämmefassig vo dine eigete Date aaluege und si nach Ziitruum lösche, alli dini Inhalt lösche und derbi dis Konto behalte, oder dis Konto ganz lösche. Öffne System-Gsundheit, für die Kontrolle z bruche.",
    "legal.privacy.contact.title": "Kontakt",
    "legal.privacy.contact.body":
      "Bi Frage zum Datenschutz wend di a die verantwortlichi Person a dinere Schuel oder dr Betriiber vo dere Installation.",

    "legal.acceptableUse.title": "Richtlinie für zuegässeni Nutzig und Verhalte",
    "legal.acceptableUse.intro":
      "Die Regle gälted für Lernchats und für Nachrichte mit andere Nutzer:innen.",
    "legal.acceptableUse.allowed.title": "Erwünscht",
    "legal.acceptableUse.allowed.body":
      "Stell Frage, teil Notize, diskutier Schuelfächer — au schwirigi Theme wie Gschicht, Chrieg, Gsundheit, Medizin oder sexuelli Gsundheit — im altersgrächte Schuelkontext.",
    "legal.acceptableUse.forbidden.title": "Nöd erlaubt",
    "legal.acceptableUse.forbidden.body":
      "Sexuelli oder expliziti Inhalt, jeglicher sexuelle Inhalt mit Minderjährige, grafischi Gwalt, Ermuetigung zu Sälbstverletzig, Mobbing, Belästigung, Hass, Aaleitige zu illegale Handlige, Droge- oder Waffe-Aaleitige, Verherrlichung vo Extremismus sowie s Teile vo private Date vo andere Persone.",
    "legal.acceptableUse.enforcement.title": "Wie mir das durchsetzed",
    "legal.acceptableUse.enforcement.body":
      "Unsicheri Inhalt werded sofort blockiert. E erschte bestätigte Verstoss füehrt zu ere Verwarnig. E zwöite bestätigti Verstoss schränkt s Konto ii, während e Person dr Fall prüeft. Überprüefige werded vo Mönsche gmacht, nie allei vo eme automatische System.",

    "legal.childSafety.title": "Chinderschutz-Hiwiis",
    "legal.childSafety.intro":
      "D meischte Persone, wo die App bruched, sind under 18. Sicherheit gaht vor Bequemlichkeit.",
    "legal.childSafety.warning":
      "Expliziti, sexuelli oder sunst altersunaagmässeni Inhalt sind nie erlaubt. Schick niemals intimi Bilder. Bitt nie e Schüeler:in, sich privat z träffe, es Gspräch z verstecke oder i e anderi App z wächsle.",
    "legal.childSafety.report.title": "Mäldig",
    "legal.childSafety.report.body":
      "Wänn di öppis beunruehigt, sags sofort ere Lehrperson oder ere andere Vertrauensperson. Ernschti Fäll werded vo Persone a dinere Schuel behandlet, und wo nötig vo de zueständige Behörde.",
    "legal.childSafety.guardians.title": "Eltere und Erziehigsberechtigti",
    "legal.childSafety.guardians.body":
      "Bi Schüelerkonte spichered mir e E-Mail-Adrässe vo dr Erziehigsberechtigte. Si wird nur bi Sicherheitsfrage bruucht, und erscht, nachdäm e Person dr Fall gprüeft het.",
  },
  ru: {
    "signup.accountType.label": "Я регистрируюсь как",
    "signup.accountType.student": "Учащийся (младше 18 лет)",
    "signup.accountType.teacher": "Учитель (18 лет и старше)",
    "signup.accountType.hint":
      "Учащиеся должны быть младше 18 лет. Учителя должны быть 18 лет или старше. Этот выбор влияет на правила безопасности для вашего аккаунта.",
    "signup.dob.label": "Дата рождения",
    "signup.dob.hint":
      "Мы используем вашу дату рождения только для применения правильных правил защиты детей.",
    "signup.guardianEmail.label": "Электронная почта родителя или опекуна",
    "signup.guardianEmail.hint":
      "Требуется для учащихся. Используется только по вопросам безопасности после проверки человеком и никогда не показывается другим пользователям.",
    "signup.consent.title": "Пожалуйста, прочитайте и примите",
    "signup.consent.terms": "Я принимаю Условия использования",
    "signup.consent.privacy": "Я прочитал(а) Уведомление о конфиденциальности",
    "signup.consent.acceptableUse": "Я принимаю Политику допустимого использования и поведения",
    "signup.consent.childSafety": "Я прочитал(а) Уведомление о безопасности детей",
    "signup.consent.openLink": "Читать",
    "signup.consent.required": "Прежде чем продолжить, необходимо принять все четыре документа.",

    "compliance.error.account_type_required": "Пожалуйста, выберите учащегося или учителя.",
    "compliance.error.dob_required": "Пожалуйста, укажите дату рождения.",
    "compliance.error.dob_invalid": "Пожалуйста, укажите корректную дату рождения.",
    "compliance.error.student_must_be_under_18":
      "Аккаунты учащихся предназначены для учеников младше 18 лет. Если вам 18 лет или больше, выберите тип аккаунта «учитель».",
    "compliance.error.teacher_must_be_adult":
      "Для аккаунта учителя необходимо быть не младше 18 лет.",
    "compliance.error.guardian_email_required":
      "Учащиеся должны указать электронную почту родителя или опекуна.",
    "compliance.error.guardian_email_invalid":
      "Пожалуйста, укажите корректный адрес электронной почты опекуна.",
    "compliance.error.guardian_email_same_as_account":
      "Электронная почта опекуна должна отличаться от вашей собственной почты для входа.",
    "compliance.error.consents_required": "Пожалуйста, примите все четыре документа.",
    "compliance.error.saveFailed":
      "Не удалось сохранить ваши данные. Проверьте их и попробуйте снова.",
    "compliance.error.loadFailed":
      "Не удалось загрузить статус вашего аккаунта. Проверьте соединение и попробуйте снова.",
    "compliance.retry": "Повторить",

    "compliance.title": "Прежде чем начать",
    "compliance.subtitle":
      "Это приложение создано для школьников младше 18 лет и учителей от 18 лет и старше. Несколько деталей нужны, чтобы обеспечить безопасность всех.",
    "compliance.section.role": "Ваша роль",
    "compliance.section.consents": "Соглашения",
    "compliance.safety.heading": "Предупреждение о безопасности детей",
    "compliance.safety.body":
      "Сексуальный, откровенный, шокирующий или иным образом неподобающий по возрасту контент запрещён во всём приложении — ни в учебных чатах, ни в сообщениях другим людям. Груминг, травля, домогательства и обмен интимными изображениями строго запрещены и рассматриваются людьми. Уроки по истории, здоровью, медицине и подобным темам остаются разрешёнными в возрастно-уместном школьном контексте.",
    "compliance.safety.consequences":
      "При подтверждённом нарушении контент блокируется, и вы получаете предупреждение. Второе подтверждённое нарушение ограничивает ваш аккаунт до рассмотрения дела человеком.",
    "compliance.submit": "Подтвердить и продолжить",
    "compliance.saving": "Сохранение…",
    "compliance.completedNote": "Ваши данные сохранены. Продолжаем…",

    "suspended.title": "Ваш доступ ограничен до проверки",
    "suspended.body":
      "Человек рассматривает отчёт о безопасности по этому аккаунту. Во время проверки вы не можете пользоваться учебными функциями. Ваш аккаунт не был удалён.",
    "suspended.guardianNote":
      "Для аккаунтов учащихся в рамках этой проверки может быть подготовлено уведомление зарегистрированному родителю или опекуну. Этот шаг всегда сначала проверяется человеком.",
    "suspended.helpTitle": "Что вы можете сделать",
    "suspended.helpAppeal":
      "Если вы считаете, что это ошибка, обратитесь к ответственному лицу в вашей школе или напишите по адресу, указанному в Уведомлении о конфиденциальности, чтобы запросить пересмотр.",
    "suspended.helpPrivacy": "Уведомление о конфиденциальности",
    "suspended.helpTerms": "Условия использования",
    "suspended.signOut": "Выйти",

    "legal.version": "Версия {version}",
    "legal.lastUpdated": "Последнее обновление {date}",
    "legal.backHome": "Назад",
    "legal.baselineNote":
      "Это базовая производственная версия для европейской школьной среды. Ваша школа или оператор должны проверить её у юриста или ответственного за защиту данных перед запуском.",
    "legal.terms.title": "Условия использования",
    "legal.terms.intro":
      "Эти условия объясняют, как учащиеся и учителя могут пользоваться этим учебным ассистентом.",
    "legal.terms.eligibility.title": "Кто может пользоваться приложением",
    "legal.terms.eligibility.body":
      "Аккаунты учащихся предназначены для учеников младше 18 лет с зарегистрированным адресом электронной почты родителя или опекуна. Аккаунты учителей — для взрослых от 18 лет. Вы можете использовать только свой собственный аккаунт.",
    "legal.terms.use.title": "Использование приложения",
    "legal.terms.use.body":
      "Используйте учебные инструменты для обучения. Не пытайтесь обойти системы безопасности, не загружайте контент, на который у вас нет прав, и не используйте приложение, чтобы навредить кому-либо.",
    "legal.terms.content.title": "Ваш контент",
    "legal.terms.content.body":
      "Ваши заметки, чаты, оценки и сообщения остаются вашими. Сегодня автоматический экспорт недоступен, но вы можете удалить свои данные в любой момент в разделе «Состояние системы».",
    "legal.terms.availability.title": "Доступность",
    "legal.terms.availability.body":
      "Функции ИИ зависят от локального сервера моделей с ограниченной мощностью. Когда мощности недостаточно, приложение продолжает работать без функций ИИ.",
    "legal.terms.termination.title": "Ограничения и приостановка",
    "legal.terms.termination.body":
      "Подтверждённое нарушение безопасности блокирует контент и добавляет предупреждение. Второе подтверждённое нарушение ограничивает аккаунт до рассмотрения дела человеком. Окончательное удаление — это всегда решение человека, а не автоматическое.",

    "legal.privacy.title": "Уведомление о конфиденциальности",
    "legal.privacy.intro":
      "Это уведомление объясняет, какие данные хранит приложение, зачем и как вы сохраняете контроль над ними.",
    "legal.privacy.data.title": "Что мы храним",
    "legal.privacy.data.body":
      "Данные аккаунта (имя пользователя, электронная почта, роль, дата рождения, электронная почта опекуна для учащихся), ваши школьные данные (предметы, оценки, записи планировщика, материалы), ваши учебные чаты, ваши сообщения с другими пользователями и вложения к ним, ваши настройки, а также ограниченные записи о безопасности без самого нарушающего контента.",
    "legal.privacy.purpose.title": "Зачем мы это храним",
    "legal.privacy.purpose.body":
      "Чтобы предоставлять вам используемые учебные функции, обеспечивать безопасность несовершеннолетних в сообщениях и чатах с ИИ, а также поддерживать техническую стабильность сервиса. Мы не продаём данные и не используем их для рекламы.",
    "legal.privacy.minimisation.title": "Минимизация данных",
    "legal.privacy.minimisation.body":
      "Другие пользователи могут найти вас только по точному имени пользователя. Ваш адрес электронной почты, дата рождения и электронная почта опекуна никогда не показываются другим пользователям. Страницы состояния системы всегда показывают только совокупные цифры, никогда — личности других людей.",
    "legal.privacy.retention.title": "Как долго мы это храним",
    "legal.privacy.retention.body":
      "Ваш контент остаётся до тех пор, пока вы его не удалите. Когда хранилище близко к заполнению, самые старые сохранённые файлы по всей платформе могут удаляться автоматически. Минимальные, обезличенные записи по безопасности и правовым вопросам могут храниться, если это требуется законом или правовым требованием.",
    "legal.privacy.rights.title": "Ваши права",
    "legal.privacy.rights.body":
      "Вы можете просматривать сводку своих данных и удалять их за определённый период, удалить весь свой контент, сохранив аккаунт, или удалить аккаунт полностью. Откройте «Состояние системы», чтобы воспользоваться этими средствами управления.",
    "legal.privacy.contact.title": "Контакты",
    "legal.privacy.contact.body":
      "По вопросам конфиденциальности обращайтесь к ответственному лицу в вашей школе или к оператору данной установки.",

    "legal.acceptableUse.title": "Политика допустимого использования и поведения",
    "legal.acceptableUse.intro":
      "Эти правила применяются к учебным чатам и к сообщениям с другими пользователями.",
    "legal.acceptableUse.allowed.title": "Приветствуется",
    "legal.acceptableUse.allowed.body":
      "Задавайте вопросы, делитесь заметками, обсуждайте школьные предметы — включая сложные темы, такие как история, война, здоровье, медицина или половое здоровье — в возрастно-уместном школьном контексте.",
    "legal.acceptableUse.forbidden.title": "Запрещено",
    "legal.acceptableUse.forbidden.body":
      "Сексуальный или откровенный контент, любой сексуальный контент с участием несовершеннолетних, шокирующее насилие, поощрение самоповреждения, травля, домогательства, разжигание ненависти, инструкции по незаконным действиям, инструкции по наркотикам или оружию, прославление экстремизма и распространение чужих личных данных.",
    "legal.acceptableUse.enforcement.title": "Как мы это обеспечиваем",
    "legal.acceptableUse.enforcement.body":
      "Небезопасный контент блокируется немедленно. Первое подтверждённое нарушение добавляет предупреждение. Второе подтверждённое нарушение ограничивает аккаунт до рассмотрения дела человеком. Проверки проводятся людьми, а не только автоматической системой.",

    "legal.childSafety.title": "Уведомление о безопасности детей",
    "legal.childSafety.intro":
      "Большинство пользователей этого приложения младше 18 лет. Безопасность важнее удобства.",
    "legal.childSafety.warning":
      "Откровенный, сексуальный или иным образом неподобающий по возрасту контент никогда не допускается. Никогда не отправляйте интимные изображения. Никогда не просите ученика встретиться наедине, скрыть переписку или перейти в другое приложение.",
    "legal.childSafety.report.title": "Как сообщить",
    "legal.childSafety.report.body":
      "Если вас что-то беспокоит, немедленно расскажите учителю или другому взрослому, которому доверяете. Серьёзные случаи рассматриваются людьми в вашей школе, а при необходимости — ответственными органами.",
    "legal.childSafety.guardians.title": "Родители и опекуны",
    "legal.childSafety.guardians.body":
      "Для аккаунтов учащихся мы храним адрес электронной почты опекуна. Он используется только по вопросам безопасности, и только после того, как человек рассмотрел дело.",
  },
  es: {
    "signup.accountType.label": "Me registro como",
    "signup.accountType.student": "Estudiante (menor de 18 años)",
    "signup.accountType.teacher": "Docente (18 años o más)",
    "signup.accountType.hint":
      "Los estudiantes deben ser menores de 18 años. Los docentes deben tener 18 años o más. Esta elección afecta las reglas de seguridad que se aplican a tu cuenta.",
    "signup.dob.label": "Fecha de nacimiento",
    "signup.dob.hint":
      "Usamos tu fecha de nacimiento solo para aplicar las reglas correctas de protección infantil.",
    "signup.guardianEmail.label": "Correo del padre, madre o tutor",
    "signup.guardianEmail.hint":
      "Obligatorio para estudiantes. Se usa solo para asuntos de seguridad tras una revisión humana y nunca se muestra a otros usuarios.",
    "signup.consent.title": "Por favor, lee y acepta",
    "signup.consent.terms": "Acepto los Términos de Uso",
    "signup.consent.privacy": "He leído el Aviso de Privacidad",
    "signup.consent.acceptableUse": "Acepto la Política de Uso Aceptable y Comportamiento",
    "signup.consent.childSafety": "He leído el Aviso de Seguridad Infantil",
    "signup.consent.openLink": "Leer",
    "signup.consent.required": "Debes aceptar los cuatro documentos antes de continuar.",

    "compliance.error.account_type_required": "Por favor, elige estudiante o docente.",
    "compliance.error.dob_required": "Por favor, introduce tu fecha de nacimiento.",
    "compliance.error.dob_invalid": "Por favor, introduce una fecha de nacimiento válida.",
    "compliance.error.student_must_be_under_18":
      "Las cuentas de estudiante son para alumnos menores de 18 años. Si tienes 18 años o más, elige el tipo de cuenta docente.",
    "compliance.error.teacher_must_be_adult":
      "Las cuentas de docente requieren tener 18 años o más.",
    "compliance.error.guardian_email_required":
      "Los estudiantes deben indicar el correo de un padre, madre o tutor.",
    "compliance.error.guardian_email_invalid": "Por favor, introduce un correo de tutor válido.",
    "compliance.error.guardian_email_same_as_account":
      "El correo del tutor debe ser distinto de tu propio correo de inicio de sesión.",
    "compliance.error.consents_required": "Por favor, acepta los cuatro documentos.",
    "compliance.error.saveFailed":
      "No pudimos guardar tus datos. Compruébalos e inténtalo de nuevo.",
    "compliance.error.loadFailed":
      "No pudimos cargar el estado de tu cuenta. Comprueba tu conexión e inténtalo de nuevo.",
    "compliance.retry": "Intentar de nuevo",

    "compliance.title": "Antes de empezar",
    "compliance.subtitle":
      "Esta app está hecha para estudiantes menores de 18 años y docentes de 18 años o más. Unos datos ayudan a mantener a todos a salvo.",
    "compliance.section.role": "Tu rol",
    "compliance.section.consents": "Acuerdos",
    "compliance.safety.heading": "Aviso de seguridad infantil",
    "compliance.safety.body":
      "El contenido sexual, explícito, gráfico o de otro modo inapropiado para la edad no está permitido en ningún lugar de esta app, ni en los chats de estudio ni en mensajes a otras personas. El grooming, el acoso, el hostigamiento y compartir imágenes íntimas están estrictamente prohibidos y son revisados por personas. Las lecciones sobre historia, salud, medicina o temas similares siguen permitidas en un contexto escolar apropiado para la edad.",
    "compliance.safety.consequences":
      "Si se confirma una infracción, el contenido se bloquea y recibes una advertencia. Una segunda infracción confirmada limita tu cuenta mientras una persona revisa el caso.",
    "compliance.submit": "Confirmar y continuar",
    "compliance.saving": "Guardando…",
    "compliance.completedNote": "Tus datos se han guardado. Continuando…",

    "suspended.title": "Tu acceso está limitado a la espera de revisión",
    "suspended.body":
      "Una persona está revisando un informe de seguridad sobre esta cuenta. Durante la revisión no puedes usar las funciones de estudio. Tu cuenta no ha sido eliminada.",
    "suspended.guardianNote":
      "Para cuentas de estudiante, como parte de esta revisión se puede preparar un aviso al padre, madre o tutor registrado. Ese paso siempre lo comprueba antes una persona.",
    "suspended.helpTitle": "Qué puedes hacer",
    "suspended.helpAppeal":
      "Si crees que es un error, contacta a la persona responsable en tu escuela o escribe a la dirección indicada en el Aviso de Privacidad para pedir una revisión.",
    "suspended.helpPrivacy": "Aviso de Privacidad",
    "suspended.helpTerms": "Términos de Uso",
    "suspended.signOut": "Cerrar sesión",

    "legal.version": "Versión {version}",
    "legal.lastUpdated": "Última actualización {date}",
    "legal.backHome": "Volver",
    "legal.baselineNote":
      "Esta es una base de producción para un entorno escolar europeo. Tu escuela o el operador debería hacerla revisar por asesoría legal o por un responsable de protección de datos antes del lanzamiento.",
    "legal.terms.title": "Términos de Uso",
    "legal.terms.intro":
      "Estos términos explican cómo los estudiantes y docentes pueden usar este asistente de estudio.",
    "legal.terms.eligibility.title": "Quién puede usar la app",
    "legal.terms.eligibility.body":
      "Las cuentas de estudiante son para alumnos menores de 18 años con un correo de tutor registrado. Las cuentas de docente son para adultos de 18 años o más. Solo puedes usar tu propia cuenta.",
    "legal.terms.use.title": "Uso de la app",
    "legal.terms.use.body":
      "Usa las herramientas de estudio para aprender. No intentes eludir los sistemas de seguridad, no subas contenido sobre el que no tengas derechos y no uses la app para dañar a nadie.",
    "legal.terms.content.title": "Tu contenido",
    "legal.terms.content.body":
      "Tus apuntes, chats, notas y mensajes siguen siendo tuyos. Hoy no puedes exportar nada automáticamente, pero puedes eliminar tus datos en cualquier momento desde Estado del Sistema.",
    "legal.terms.availability.title": "Disponibilidad",
    "legal.terms.availability.body":
      "Las funciones de IA dependen de un servidor de modelos local con capacidad limitada. Cuando no hay capacidad disponible, la app sigue funcionando sin funciones de IA.",
    "legal.terms.termination.title": "Límites y suspensión",
    "legal.terms.termination.body":
      "Una infracción de seguridad confirmada bloquea el contenido y añade una advertencia. Una segunda infracción confirmada limita la cuenta mientras una persona revisa el caso. La eliminación permanente es siempre una decisión humana, nunca automática.",

    "legal.privacy.title": "Aviso de Privacidad",
    "legal.privacy.intro":
      "Este aviso explica qué datos almacena la app, por qué, y cómo mantienes el control.",
    "legal.privacy.data.title": "Qué almacenamos",
    "legal.privacy.data.body":
      "Datos de la cuenta (nombre de usuario, correo, rol, fecha de nacimiento, correo del tutor para estudiantes), tus datos escolares (asignaturas, notas, entradas del planificador, materiales), tus chats de estudio, tus mensajes con otros usuarios y sus adjuntos, tus ajustes, y registros de seguridad acotados sin el contenido infractor en sí.",
    "legal.privacy.purpose.title": "Por qué lo almacenamos",
    "legal.privacy.purpose.body":
      "Para ofrecerte las funciones de estudio que usas, para mantener seguros a los menores en mensajería y chats con IA, y para mantener el servicio técnicamente estable. No vendemos datos ni los usamos para publicidad.",
    "legal.privacy.minimisation.title": "Minimización de datos",
    "legal.privacy.minimisation.body":
      "Otros usuarios solo pueden encontrarte por tu nombre de usuario exacto. Tu correo, fecha de nacimiento y correo del tutor nunca se muestran a otros usuarios. Las páginas de estado del sistema solo muestran cifras agregadas, nunca la identidad de otras personas.",
    "legal.privacy.retention.title": "Cuánto tiempo lo conservamos",
    "legal.privacy.retention.body":
      "Tu contenido permanece hasta que lo elimines. Cuando el almacenamiento está casi lleno, los archivos más antiguos de toda la plataforma pueden eliminarse automáticamente. Se pueden conservar registros mínimos y anonimizados de seguridad y legales cuando la ley o una reclamación legal lo exijan.",
    "legal.privacy.rights.title": "Tus derechos",
    "legal.privacy.rights.body":
      "Puedes ver un resumen de tus propios datos y eliminarlos por rango de fechas, eliminar todo tu contenido conservando tu cuenta, o eliminar tu cuenta por completo. Abre Estado del Sistema para usar estos controles.",
    "legal.privacy.contact.title": "Contacto",
    "legal.privacy.contact.body":
      "Para preguntas sobre privacidad, contacta a la persona responsable en tu escuela o al operador de esta instalación.",

    "legal.acceptableUse.title": "Política de Uso Aceptable y Comportamiento",
    "legal.acceptableUse.intro":
      "Estas reglas se aplican a los chats de estudio y a los mensajes con otros usuarios.",
    "legal.acceptableUse.allowed.title": "Se anima a",
    "legal.acceptableUse.allowed.body":
      "Hacer preguntas, compartir apuntes, hablar de asignaturas escolares —incluidos temas difíciles como historia, guerra, salud, medicina o salud sexual— en un contexto escolar apropiado para la edad.",
    "legal.acceptableUse.forbidden.title": "No permitido",
    "legal.acceptableUse.forbidden.body":
      "Contenido sexual o explícito, cualquier contenido sexual con menores, violencia gráfica, incitación a la autolesión, acoso, hostigamiento, odio, instrucciones para actos ilegales, instrucciones sobre drogas o armas, glorificación del extremismo y compartir datos privados de otras personas.",
    "legal.acceptableUse.enforcement.title": "Cómo lo aplicamos",
    "legal.acceptableUse.enforcement.body":
      "El contenido inseguro se bloquea de inmediato. Una primera infracción confirmada añade una advertencia. Una segunda infracción confirmada limita la cuenta mientras una persona revisa el caso. Las revisiones las realizan personas, no solo un sistema automático.",

    "legal.childSafety.title": "Aviso de Seguridad Infantil",
    "legal.childSafety.intro":
      "La mayoría de las personas que usan esta app son menores de 18 años. La seguridad está por encima de la comodidad.",
    "legal.childSafety.warning":
      "El contenido explícito, sexual o de otro modo inapropiado para la edad nunca está permitido. Nunca envíes imágenes íntimas. Nunca pidas a un alumno que se reúna en privado, oculte una conversación o se traslade a otra app.",
    "legal.childSafety.report.title": "Cómo informar",
    "legal.childSafety.report.body":
      "Si algo te preocupa, cuéntaselo de inmediato a un docente o a otro adulto de confianza. Los casos graves los gestionan personas de tu escuela, y cuando corresponde, las autoridades responsables.",
    "legal.childSafety.guardians.title": "Padres, madres y tutores",
    "legal.childSafety.guardians.body":
      "Para cuentas de estudiante almacenamos un correo del tutor. Se usa solo para asuntos de seguridad, y solo después de que una persona haya revisado el caso.",
  },
  fr: {
    "signup.accountType.label": "Je m'inscris en tant que",
    "signup.accountType.student": "Élève (moins de 18 ans)",
    "signup.accountType.teacher": "Enseignant·e (18 ans ou plus)",
    "signup.accountType.hint":
      "Les élèves doivent avoir moins de 18 ans. Les enseignant·e·s doivent avoir 18 ans ou plus. Ce choix détermine les règles de sécurité applicables à votre compte.",
    "signup.dob.label": "Date de naissance",
    "signup.dob.hint":
      "Nous utilisons votre date de naissance uniquement pour appliquer les bonnes règles de protection des mineurs.",
    "signup.guardianEmail.label": "E-mail d'un parent ou tuteur légal",
    "signup.guardianEmail.hint":
      "Obligatoire pour les élèves. Utilisé uniquement pour des questions de sécurité après une vérification humaine, et jamais montré aux autres utilisateurs.",
    "signup.consent.title": "Veuillez lire et accepter",
    "signup.consent.terms": "J'accepte les Conditions d'utilisation",
    "signup.consent.privacy": "J'ai lu la Politique de confidentialité",
    "signup.consent.acceptableUse":
      "J'accepte la Politique d'utilisation acceptable et de comportement",
    "signup.consent.childSafety": "J'ai lu l'Avis sur la sécurité des mineurs",
    "signup.consent.openLink": "Lire",
    "signup.consent.required": "Les quatre documents doivent être acceptés avant de continuer.",

    "compliance.error.account_type_required": "Veuillez choisir élève ou enseignant·e.",
    "compliance.error.dob_required": "Veuillez indiquer votre date de naissance.",
    "compliance.error.dob_invalid": "Veuillez indiquer une date de naissance valide.",
    "compliance.error.student_must_be_under_18":
      "Les comptes élève sont réservés aux personnes de moins de 18 ans. Si vous avez 18 ans ou plus, choisissez le type de compte enseignant·e.",
    "compliance.error.teacher_must_be_adult":
      "Les comptes enseignant·e nécessitent d'avoir 18 ans ou plus.",
    "compliance.error.guardian_email_required":
      "Les élèves doivent indiquer l'adresse e-mail d'un parent ou tuteur légal.",
    "compliance.error.guardian_email_invalid":
      "Veuillez indiquer une adresse e-mail de tuteur valide.",
    "compliance.error.guardian_email_same_as_account":
      "L'e-mail du tuteur doit être différent de votre propre e-mail de connexion.",
    "compliance.error.consents_required": "Veuillez accepter les quatre documents.",
    "compliance.error.saveFailed":
      "Nous n'avons pas pu enregistrer vos informations. Veuillez les vérifier et réessayer.",
    "compliance.error.loadFailed":
      "Nous n'avons pas pu charger le statut de votre compte. Vérifiez votre connexion et réessayez.",
    "compliance.retry": "Réessayer",

    "compliance.title": "Avant de commencer",
    "compliance.subtitle":
      "Cette application est conçue pour les élèves de moins de 18 ans et les enseignant·e·s de 18 ans ou plus. Quelques informations permettent d'assurer la sécurité de tous.",
    "compliance.section.role": "Votre rôle",
    "compliance.section.consents": "Accords",
    "compliance.safety.heading": "Avertissement sur la sécurité des mineurs",
    "compliance.safety.body":
      "Les contenus sexuels, explicites, choquants ou autrement inappropriés pour l'âge ne sont autorisés nulle part dans cette application, ni dans les discussions d'étude, ni dans les messages à d'autres personnes. Le grooming, le harcèlement, l'intimidation et le partage d'images intimes sont strictement interdits et examinés par des personnes. Les leçons sur l'histoire, la santé, la médecine ou des sujets similaires restent autorisées dans un contexte scolaire adapté à l'âge.",
    "compliance.safety.consequences":
      "En cas de violation confirmée, le contenu est bloqué et vous recevez un avertissement. Une deuxième violation confirmée limite votre compte pendant qu'une personne examine le dossier.",
    "compliance.submit": "Confirmer et continuer",
    "compliance.saving": "Enregistrement…",
    "compliance.completedNote": "Vos informations sont enregistrées. Poursuite en cours…",

    "suspended.title": "Votre accès est limité en attendant un examen",
    "suspended.body":
      "Une personne examine un signalement de sécurité concernant ce compte. Pendant l'examen, vous ne pouvez pas utiliser les fonctions d'étude. Votre compte n'a pas été supprimé.",
    "suspended.guardianNote":
      "Pour les comptes élève, un avis au parent ou tuteur légal enregistré peut être préparé dans le cadre de cet examen. Cette étape est toujours d'abord vérifiée par une personne.",
    "suspended.helpTitle": "Ce que vous pouvez faire",
    "suspended.helpAppeal":
      "Si vous pensez qu'il s'agit d'une erreur, contactez la personne responsable de votre établissement ou écrivez à l'adresse indiquée dans la Politique de confidentialité pour demander un réexamen.",
    "suspended.helpPrivacy": "Politique de confidentialité",
    "suspended.helpTerms": "Conditions d'utilisation",
    "suspended.signOut": "Se déconnecter",

    "legal.version": "Version {version}",
    "legal.lastUpdated": "Dernière mise à jour le {date}",
    "legal.backHome": "Retour",
    "legal.baselineNote":
      "Ceci est une base de production pour un contexte scolaire européen. Votre établissement ou l'exploitant devrait la faire vérifier par un conseil juridique ou un délégué à la protection des données avant le lancement.",
    "legal.terms.title": "Conditions d'utilisation",
    "legal.terms.intro":
      "Ces conditions expliquent comment les élèves et les enseignant·e·s peuvent utiliser cet assistant d'étude.",
    "legal.terms.eligibility.title": "Qui peut utiliser l'application",
    "legal.terms.eligibility.body":
      "Les comptes élève sont destinés aux personnes de moins de 18 ans disposant d'un e-mail de tuteur enregistré. Les comptes enseignant·e sont destinés aux adultes de 18 ans ou plus. Vous ne pouvez utiliser que votre propre compte.",
    "legal.terms.use.title": "Utilisation de l'application",
    "legal.terms.use.body":
      "Utilisez les outils d'étude pour apprendre. N'essayez pas de contourner les systèmes de sécurité, ne téléversez pas de contenu sur lequel vous n'avez aucun droit, et n'utilisez pas l'application pour nuire à autrui.",
    "legal.terms.content.title": "Votre contenu",
    "legal.terms.content.body":
      "Vos notes, discussions, résultats et messages restent les vôtres. Vous ne pouvez rien exporter automatiquement aujourd'hui, mais vous pouvez supprimer vos données à tout moment depuis État du système.",
    "legal.terms.availability.title": "Disponibilité",
    "legal.terms.availability.body":
      "Les fonctions d'IA dépendent d'un serveur de modèles local à capacité limitée. Lorsque la capacité n'est pas disponible, l'application continue de fonctionner sans les fonctions d'IA.",
    "legal.terms.termination.title": "Limites et suspension",
    "legal.terms.termination.body":
      "Une violation de sécurité confirmée bloque le contenu et ajoute un avertissement. Une deuxième violation confirmée limite le compte pendant qu'une personne examine le dossier. La suppression définitive est toujours une décision humaine, jamais automatique.",

    "legal.privacy.title": "Politique de confidentialité",
    "legal.privacy.intro":
      "Cet avis explique quelles données l'application stocke, pourquoi, et comment vous gardez le contrôle.",
    "legal.privacy.data.title": "Ce que nous stockons",
    "legal.privacy.data.body":
      "Les données du compte (nom d'utilisateur, e-mail, rôle, date de naissance, e-mail du tuteur pour les élèves), vos données scolaires (matières, notes, entrées du planificateur, documents), vos discussions d'étude, vos messages avec d'autres utilisateurs et leurs pièces jointes, vos paramètres, ainsi que des registres de sécurité limités sans le contenu incriminé lui-même.",
    "legal.privacy.purpose.title": "Pourquoi nous les stockons",
    "legal.privacy.purpose.body":
      "Pour vous fournir les fonctions d'étude que vous utilisez, pour assurer la sécurité des mineurs dans la messagerie et les discussions avec l'IA, et pour garder le service techniquement stable. Nous ne vendons pas de données et ne les utilisons pas à des fins publicitaires.",
    "legal.privacy.minimisation.title": "Minimisation des données",
    "legal.privacy.minimisation.body":
      "Les autres utilisateurs ne peuvent vous trouver que par votre nom d'utilisateur exact. Votre adresse e-mail, votre date de naissance et l'e-mail du tuteur ne sont jamais montrés aux autres utilisateurs. Les pages d'état du système n'affichent que des chiffres globaux, jamais l'identité d'autres personnes.",
    "legal.privacy.retention.title": "Durée de conservation",
    "legal.privacy.retention.body":
      "Votre contenu reste jusqu'à ce que vous le supprimiez. Lorsque le stockage approche de la saturation, les fichiers stockés les plus anciens de toute la plateforme peuvent être supprimés automatiquement. Des registres minimaux et anonymisés de sécurité et à caractère légal peuvent être conservés lorsque la loi ou une réclamation légale l'exige.",
    "legal.privacy.rights.title": "Vos droits",
    "legal.privacy.rights.body":
      "Vous pouvez consulter un résumé de vos propres données et les supprimer sur une plage de dates, supprimer tout votre contenu en conservant votre compte, ou supprimer entièrement votre compte. Ouvrez État du système pour utiliser ces contrôles.",
    "legal.privacy.contact.title": "Contact",
    "legal.privacy.contact.body":
      "Pour toute question sur la confidentialité, contactez la personne responsable de votre établissement ou l'exploitant de cette installation.",

    "legal.acceptableUse.title": "Politique d'utilisation acceptable et de comportement",
    "legal.acceptableUse.intro":
      "Ces règles s'appliquent aux discussions d'étude et aux messages avec d'autres utilisateurs.",
    "legal.acceptableUse.allowed.title": "Encouragé",
    "legal.acceptableUse.allowed.body":
      "Poser des questions, partager des notes, discuter de matières scolaires — y compris de sujets difficiles comme l'histoire, la guerre, la santé, la médecine ou la santé sexuelle — dans un contexte scolaire adapté à l'âge.",
    "legal.acceptableUse.forbidden.title": "Non autorisé",
    "legal.acceptableUse.forbidden.body":
      "Le contenu sexuel ou explicite, tout contenu sexuel impliquant des mineurs, la violence graphique, l'incitation à l'automutilation, l'intimidation, le harcèlement, la haine, les instructions pour des actes illégaux, les instructions sur les drogues ou les armes, la glorification de l'extrémisme, et le partage des données privées d'autrui.",
    "legal.acceptableUse.enforcement.title": "Comment nous l'appliquons",
    "legal.acceptableUse.enforcement.body":
      "Le contenu dangereux est bloqué immédiatement. Une première violation confirmée ajoute un avertissement. Une deuxième violation confirmée limite le compte pendant qu'une personne examine le dossier. Les examens sont réalisés par des personnes, jamais par un système automatique seul.",

    "legal.childSafety.title": "Avis sur la sécurité des mineurs",
    "legal.childSafety.intro":
      "La plupart des personnes qui utilisent cette application ont moins de 18 ans. La sécurité prime sur le confort.",
    "legal.childSafety.warning":
      "Le contenu explicite, sexuel ou autrement inapproprié pour l'âge n'est jamais autorisé. N'envoyez jamais d'images intimes. Ne demandez jamais à un·e élève de se rencontrer en privé, de cacher une conversation ou de passer à une autre application.",
    "legal.childSafety.report.title": "Signalement",
    "legal.childSafety.report.body":
      "Si quelque chose vous inquiète, parlez-en immédiatement à un·e enseignant·e ou à un autre adulte de confiance. Les cas graves sont traités par des personnes de votre établissement, et si nécessaire par les autorités compétentes.",
    "legal.childSafety.guardians.title": "Parents et tuteurs légaux",
    "legal.childSafety.guardians.body":
      "Pour les comptes élève, nous stockons l'adresse e-mail d'un tuteur légal. Elle n'est utilisée que pour des questions de sécurité, et uniquement après qu'une personne a examiné le dossier.",
  },
  it: {
    "signup.accountType.label": "Mi registro come",
    "signup.accountType.student": "Studente/essa (minorenne)",
    "signup.accountType.teacher": "Insegnante (18 anni o più)",
    "signup.accountType.hint":
      "Gli studenti devono avere meno di 18 anni. Gli insegnanti devono avere 18 anni o più. Questa scelta determina le regole di sicurezza applicate al tuo account.",
    "signup.dob.label": "Data di nascita",
    "signup.dob.hint":
      "Usiamo la tua data di nascita solo per applicare le regole corrette di tutela dei minori.",
    "signup.guardianEmail.label": "E-mail di un genitore o tutore",
    "signup.guardianEmail.hint":
      "Obbligatoria per gli studenti. Viene usata solo per questioni di sicurezza dopo una verifica umana e non viene mai mostrata ad altri utenti.",
    "signup.consent.title": "Leggi e accetta",
    "signup.consent.terms": "Accetto i Termini di utilizzo",
    "signup.consent.privacy": "Ho letto l'Informativa sulla privacy",
    "signup.consent.acceptableUse": "Accetto la Politica di uso accettabile e comportamento",
    "signup.consent.childSafety": "Ho letto l'Avviso sulla sicurezza dei minori",
    "signup.consent.openLink": "Leggi",
    "signup.consent.required": "Devi accettare tutti e quattro i documenti prima di continuare.",

    "compliance.error.account_type_required": "Scegli studente o insegnante.",
    "compliance.error.dob_required": "Inserisci la tua data di nascita.",
    "compliance.error.dob_invalid": "Inserisci una data di nascita valida.",
    "compliance.error.student_must_be_under_18":
      "Gli account studente sono per allievi minori di 18 anni. Se hai 18 anni o più, scegli il tipo di account insegnante.",
    "compliance.error.teacher_must_be_adult":
      "Gli account insegnante richiedono di avere 18 anni o più.",
    "compliance.error.guardian_email_required":
      "Gli studenti devono indicare l'e-mail di un genitore o tutore.",
    "compliance.error.guardian_email_invalid": "Inserisci un indirizzo e-mail del tutore valido.",
    "compliance.error.guardian_email_same_as_account":
      "L'e-mail del tutore deve essere diversa dalla tua e-mail di accesso.",
    "compliance.error.consents_required": "Accetta tutti e quattro i documenti.",
    "compliance.error.saveFailed":
      "Non siamo riusciti a salvare i tuoi dati. Controllali e riprova.",
    "compliance.error.loadFailed":
      "Non siamo riusciti a caricare lo stato del tuo account. Controlla la connessione e riprova.",
    "compliance.retry": "Riprova",

    "compliance.title": "Prima di iniziare",
    "compliance.subtitle":
      "Questa app è pensata per studenti minori di 18 anni e insegnanti dai 18 anni in su. Alcuni dati servono a tutelare la sicurezza di tutti.",
    "compliance.section.role": "Il tuo ruolo",
    "compliance.section.consents": "Accordi",
    "compliance.safety.heading": "Avviso sulla sicurezza dei minori",
    "compliance.safety.body":
      "Contenuti sessuali, espliciti, crudi o comunque non adatti all'età non sono ammessi in nessuna parte dell'app, né nelle chat di studio né nei messaggi ad altre persone. Adescamento, bullismo, molestie e condivisione di immagini intime sono severamente vietati e vengono esaminati da persone. Le lezioni su storia, salute, medicina o argomenti simili restano ammesse in un contesto scolastico adeguato all'età.",
    "compliance.safety.consequences":
      "In caso di violazione confermata, il contenuto viene bloccato e ricevi un avvertimento. Una seconda violazione confermata limita il tuo account mentre una persona esamina il caso.",
    "compliance.submit": "Conferma e continua",
    "compliance.saving": "Salvataggio…",
    "compliance.completedNote": "I tuoi dati sono stati salvati. Si continua…",

    "suspended.title": "Il tuo accesso è limitato in attesa di verifica",
    "suspended.body":
      "Una persona sta esaminando una segnalazione di sicurezza su questo account. Durante la verifica non puoi usare le funzioni di studio. Il tuo account non è stato eliminato.",
    "suspended.guardianNote":
      "Per gli account studente, come parte di questa verifica può essere preparato un avviso al genitore o tutore registrato. Questo passaggio viene sempre controllato prima da una persona.",
    "suspended.helpTitle": "Cosa puoi fare",
    "suspended.helpAppeal":
      "Se ritieni che si tratti di un errore, contatta il referente della tua scuola o scrivi all'indirizzo indicato nell'Informativa sulla privacy per chiedere un riesame.",
    "suspended.helpPrivacy": "Informativa sulla privacy",
    "suspended.helpTerms": "Termini di utilizzo",
    "suspended.signOut": "Esci",

    "legal.version": "Versione {version}",
    "legal.lastUpdated": "Ultimo aggiornamento {date}",
    "legal.backHome": "Indietro",
    "legal.baselineNote":
      "Questa è una base di produzione per un contesto scolastico europeo. La tua scuola o il gestore dovrebbe farla verificare da un consulente legale o da un responsabile della protezione dei dati prima del lancio.",
    "legal.terms.title": "Termini di utilizzo",
    "legal.terms.intro":
      "Questi termini spiegano come studenti e insegnanti possono usare questo assistente di studio.",
    "legal.terms.eligibility.title": "Chi può usare l'app",
    "legal.terms.eligibility.body":
      "Gli account studente sono per allievi minori di 18 anni con un'e-mail di un tutore registrata. Gli account insegnante sono per adulti dai 18 anni in su. Puoi usare solo il tuo account.",
    "legal.terms.use.title": "Uso dell'app",
    "legal.terms.use.body":
      "Usa gli strumenti di studio per imparare. Non cercare di aggirare i sistemi di sicurezza, non caricare contenuti su cui non hai diritti e non usare l'app per danneggiare qualcuno.",
    "legal.terms.content.title": "I tuoi contenuti",
    "legal.terms.content.body":
      "Le tue note, chat, voti e messaggi restano tuoi. Oggi non è possibile esportare nulla automaticamente, ma puoi eliminare i tuoi dati in qualsiasi momento da Stato del sistema.",
    "legal.terms.availability.title": "Disponibilità",
    "legal.terms.availability.body":
      "Le funzioni IA dipendono da un server di modelli locale con capacità limitata. Quando la capacità non è disponibile, l'app continua a funzionare senza funzioni IA.",
    "legal.terms.termination.title": "Limiti e sospensione",
    "legal.terms.termination.body":
      "Una violazione di sicurezza confermata blocca il contenuto e aggiunge un avvertimento. Una seconda violazione confermata limita l'account mentre una persona esamina il caso. L'eliminazione definitiva è sempre una decisione umana, mai automatica.",

    "legal.privacy.title": "Informativa sulla privacy",
    "legal.privacy.intro":
      "Questa informativa spiega quali dati memorizza l'app, perché, e come mantieni il controllo.",
    "legal.privacy.data.title": "Cosa memorizziamo",
    "legal.privacy.data.body":
      "Dati dell'account (nome utente, e-mail, ruolo, data di nascita, e-mail del tutore per gli studenti), i tuoi dati scolastici (materie, voti, voci del planner, materiali), le tue chat di studio, i tuoi messaggi con altri utenti e i relativi allegati, le tue impostazioni e registri di sicurezza limitati senza il contenuto incriminato stesso.",
    "legal.privacy.purpose.title": "Perché li memorizziamo",
    "legal.privacy.purpose.body":
      "Per fornirti le funzioni di studio che usi, per tutelare i minori nella messaggistica e nelle chat con l'IA, e per mantenere il servizio tecnicamente stabile. Non vendiamo dati e non li usiamo per la pubblicità.",
    "legal.privacy.minimisation.title": "Minimizzazione dei dati",
    "legal.privacy.minimisation.body":
      "Gli altri utenti possono trovarti solo tramite il tuo esatto nome utente. Il tuo indirizzo e-mail, la data di nascita e l'e-mail del tutore non vengono mai mostrati ad altri utenti. Le pagine di stato del sistema mostrano solo numeri aggregati, mai l'identità di altre persone.",
    "legal.privacy.retention.title": "Per quanto tempo li conserviamo",
    "legal.privacy.retention.body":
      "I tuoi contenuti restano finché non li elimini. Quando lo spazio di archiviazione è quasi pieno, i file più vecchi memorizzati su tutta la piattaforma possono essere rimossi automaticamente. Registri minimi e anonimizzati di sicurezza e legali possono essere conservati quando la legge o una pretesa legale lo richiedono.",
    "legal.privacy.rights.title": "I tuoi diritti",
    "legal.privacy.rights.body":
      "Puoi vedere un riepilogo dei tuoi dati ed eliminarli per intervallo di date, eliminare tutti i tuoi contenuti mantenendo l'account, oppure eliminare del tutto l'account. Apri Stato del sistema per usare questi controlli.",
    "legal.privacy.contact.title": "Contatto",
    "legal.privacy.contact.body":
      "Per domande sulla privacy, contatta il responsabile della tua scuola o il gestore di questa installazione.",

    "legal.acceptableUse.title": "Politica di uso accettabile e comportamento",
    "legal.acceptableUse.intro":
      "Queste regole valgono per le chat di studio e per i messaggi con altri utenti.",
    "legal.acceptableUse.allowed.title": "Incoraggiato",
    "legal.acceptableUse.allowed.body":
      "Fai domande, condividi appunti, discuti materie scolastiche — inclusi argomenti difficili come storia, guerra, salute, medicina o salute sessuale — in un contesto scolastico adeguato all'età.",
    "legal.acceptableUse.forbidden.title": "Non consentito",
    "legal.acceptableUse.forbidden.body":
      "Contenuti sessuali o espliciti, qualsiasi contenuto sessuale che coinvolga minori, violenza cruda, incoraggiamento all'autolesionismo, bullismo, molestie, incitamento all'odio, istruzioni per atti illegali, istruzioni su droghe o armi, glorificazione dell'estremismo e condivisione di dati privati altrui.",
    "legal.acceptableUse.enforcement.title": "Come lo facciamo rispettare",
    "legal.acceptableUse.enforcement.body":
      "I contenuti non sicuri vengono bloccati immediatamente. Una prima violazione confermata aggiunge un avvertimento. Una seconda violazione confermata limita l'account mentre una persona esamina il caso. Le verifiche sono svolte da persone, non solo da un sistema automatico.",

    "legal.childSafety.title": "Avviso sulla sicurezza dei minori",
    "legal.childSafety.intro":
      "La maggior parte delle persone che usa questa app ha meno di 18 anni. La sicurezza viene prima della comodità.",
    "legal.childSafety.warning":
      "Contenuti espliciti, sessuali o comunque non adatti all'età non sono mai ammessi. Non inviare mai immagini intime. Non chiedere mai a un allievo di incontrarsi in privato, nascondere una conversazione o passare a un'altra app.",
    "legal.childSafety.report.title": "Segnalazione",
    "legal.childSafety.report.body":
      "Se qualcosa ti preoccupa, parlane subito con un insegnante o un altro adulto di fiducia. I casi gravi vengono gestiti da persone della tua scuola e, se necessario, dalle autorità competenti.",
    "legal.childSafety.guardians.title": "Genitori e tutori",
    "legal.childSafety.guardians.body":
      "Per gli account studente memorizziamo un indirizzo e-mail del tutore. Viene usato solo per questioni di sicurezza, e solo dopo che una persona ha esaminato il caso.",
  },
};
