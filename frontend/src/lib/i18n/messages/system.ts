/**
 * System admission gate, system health page, data-rights controls and the
 * related settings entries. English is the source of truth for the key set.
 */
export const system = {
  en: {
    "nav.systemHealth": "System health",

    /* --------------------------------------------------- admission gate --- */
    "admission.title": "Checking system capacity",
    "admission.subtitle":
      "This installation serves a limited number of people at the same time. We ask the local server whether there is room for your session.",
    "admission.state.checking": "Checking capacity…",
    "admission.state.admitted": "You have a place. Continuing…",
    "admission.state.queued": "You are in the waiting queue.",
    "admission.state.denied_capacity":
      "There is not enough free GPU, memory or disk space to start a new session right now.",
    "admission.state.denied_user_limit":
      "The maximum number of people is already using the system.",
    "admission.state.backend_unavailable":
      "The local server is not reachable, so we cannot confirm a free place. Access is kept closed until it answers.",
    "admission.activeUsers": "People using the system: {count} of {max}",
    "admission.queuePosition": "Your position in the queue: {position} of {size}",
    "admission.thresholds":
      "A new session needs at least {gpu}% free GPU memory, {ram}% free system memory and {storage}% free disk space.",
    "admission.caps":
      "The system also stays below {gpu}% GPU, {ram}% memory and {storage}% disk usage in total.",
    "admission.retry": "Check again",
    "admission.retryAt": "You can try again at {time}.",
    "admission.signOut": "Log out",
    "admission.failClosedNote":
      "We never assume a free place. Until the local server confirms one, the study area stays closed.",

    /* -------------------------------------------------- system health UI -- */
    "systemHealth.title": "System health",
    "systemHealth.subtitle":
      "Live capacity of the local AI server and the storage used by this installation.",
    "systemHealth.local.title": "Local AI server",
    "systemHealth.local.unavailable":
      "The local AI server is not reachable, so no live values are shown. Nothing here is estimated.",
    "systemHealth.local.activeUsers": "Admitted people",
    "systemHealth.local.queue": "Waiting queue",
    "systemHealth.local.gpus": "Graphics cards",
    "systemHealth.local.gpu": "GPU {id}",
    "systemHealth.local.vram": "Video memory",
    "systemHealth.local.utilisation": "Utilisation",
    "systemHealth.local.instances": "Loaded models",
    "systemHealth.local.instanceProcesses": "{count} processes",
    "systemHealth.local.mine": "Your session",
    "systemHealth.local.ram": "System memory",
    "systemHealth.local.disk": "Local disk",
    "systemHealth.local.rebalance": "Balancing state",
    "systemHealth.local.recommendation": "Recommended model",
    "systemHealth.local.preferred": "Your preferred model",
    "systemHealth.local.assigned": "Currently assigned model",
    "systemHealth.local.assignedNote":
      "When the system is busy you may be given a lighter model. Your saved preference does not change.",
    "systemHealth.local.queuePosition": "Your queue position",
    "systemHealth.local.noIdentities":
      "Only totals are shown here. Other people's names are never displayed.",

    "systemHealth.cloud.title": "Cloud storage and database",
    "systemHealth.cloud.objectStorage": "File storage",
    "systemHealth.cloud.database": "Database",
    "systemHealth.cloud.bandwidth": "Bandwidth",
    "systemHealth.cloud.realtime": "Realtime",
    "systemHealth.cloud.edgeFunctions": "Functions",
    "systemHealth.cloud.notExposed": "Not exposed",
    "systemHealth.cloud.cleanupNote":
      "When file storage reaches {trigger}% the oldest stored files across the whole installation are removed automatically until about {target}% is reached. Profile pictures, accounts and settings are never part of this cleanup.",
    "systemHealth.cloud.used": "{used} of {quota} used ({percent}%)",
    "systemHealth.cloud.usedOnly": "{used} used",

    "systemHealth.myData.title": "Your data",
    "systemHealth.myData.aiThreads": "Study chats",
    "systemHealth.myData.aiMessages": "Study messages",
    "systemHealth.myData.peerConversations": "Conversations",
    "systemHealth.myData.peerMessages": "Messages",
    "systemHealth.myData.attachments": "Attachments",
    "systemHealth.myData.documents": "Materials",
    "systemHealth.myData.loadFailed": "Your data summary could not be loaded.",

    "systemHealth.release.title": "Release my AI model",
    "systemHealth.release.body":
      "Frees the model and memory reserved for your session. Your session continues without AI until you prepare a model again.",
    "systemHealth.release.action": "Release my AI model",
    "systemHealth.release.working": "Releasing…",
    "systemHealth.release.done": "Your model was released. This session continues without AI.",
    "systemHealth.release.failed":
      "The local server did not confirm the release. Nothing was changed.",

    /* ------------------------------------------------- data deletion UI --- */
    "dataRights.title": "Delete my data",
    "dataRights.subtitle":
      "You decide what stays. Deletions run on your own account only and cannot be undone.",
    "dataRights.range.title": "Delete a date range",
    "dataRights.range.start": "From",
    "dataRights.range.end": "Until",
    "dataRights.range.includePeer": "Conversations with other people",
    "dataRights.range.includeAi": "Study chats with the AI",
    "dataRights.range.action": "Delete this range",
    "dataRights.range.needsSelection": "Choose at least one kind of data and a date range.",
    "dataRights.allContent.title": "Delete all my content, keep my account",
    "dataRights.allContent.body":
      "Removes your chats, messages, attachments and materials. Your login, profile, settings and consent records stay.",
    "dataRights.allContent.action": "Delete all my content",
    "dataRights.account.title": "Delete my account",
    "dataRights.account.body":
      "Removes your content and your login. You cannot sign in again afterwards.",
    "dataRights.account.action": "Delete my account",
    "dataRights.confirm.title": "Please confirm",
    "dataRights.confirm.typeToConfirm": "Type {word} to confirm.",
    "dataRights.confirm.word": "DELETE",
    "dataRights.confirm.cancel": "Cancel",
    "dataRights.confirm.proceed": "Delete permanently",
    "dataRights.working": "Deleting…",
    "dataRights.done": "Deletion finished.",
    "dataRights.failed": "The deletion could not be completed. Nothing else was changed.",
    "dataRights.retentionNote":
      "Minimal, anonymised safety and legal records may be kept where the law or a legal claim requires it. We cannot promise that such records disappear.",
    "dataRights.legalLinks": "Privacy Notice and policies",

    /* ------------------------------------------------- settings additions - */
    "settings.messaging.title": "Messages",
    "settings.messaging.peerNotifications": "Notify me about new messages",
    "settings.messaging.peerNotificationsHint":
      "Turning this off keeps the unread counter but stops pop-up alerts.",
    "settings.messaging.browserNotifications": "Show browser notifications",
    "settings.messaging.browserNotificationsHint":
      "Your browser will ask for permission when you turn this on.",
    "settings.model.preferred": "Preferred model",
    "settings.model.assigned": "Currently assigned",
    "settings.model.recommendation": "Recommended by the system: {model}",
    "settings.model.assignedDiffers":
      "The system gave you a lighter model for now. Your preference stays saved.",
    "settings.privacy.title": "Privacy and data",
    "settings.privacy.body": "See what is stored about you and delete it.",
    "settings.privacy.openSystemHealth": "Open data controls",
    "settings.privacy.legal": "Terms, Privacy, Acceptable Use and Child Safety",
    "settings.compliance.title": "Your agreements",
    "settings.compliance.accountType": "Account type",
    "settings.compliance.accountType.student": "Student",
    "settings.compliance.accountType.teacher": "Teacher",
    "settings.compliance.accountType.unknown": "Not set",
    "settings.compliance.accepted": "Accepted {date} (version {version})",
    "settings.compliance.status.active": "Active",
    "settings.compliance.status.suspended_pending_review": "Limited pending review",
    "settings.compliance.status.deletion_pending": "Deletion pending",
    "settings.compliance.strikes": "Confirmed warnings: {count}",
  },

  de: {
    "nav.systemHealth": "Systemzustand",

    "admission.title": "Systemkapazität wird geprüft",
    "admission.subtitle":
      "Diese Installation bedient nur eine begrenzte Anzahl Personen gleichzeitig. Wir fragen den lokalen Server, ob für deine Sitzung Platz ist.",
    "admission.state.checking": "Kapazität wird geprüft…",
    "admission.state.admitted": "Du hast einen Platz. Es geht weiter…",
    "admission.state.queued": "Du bist in der Warteschlange.",
    "admission.state.denied_capacity":
      "Es gibt zurzeit nicht genug freien Grafikspeicher, Arbeitsspeicher oder Festplattenplatz für eine neue Sitzung.",
    "admission.state.denied_user_limit":
      "Die maximale Anzahl Personen nutzt das System bereits.",
    "admission.state.backend_unavailable":
      "Der lokale Server ist nicht erreichbar, daher können wir keinen freien Platz bestätigen. Der Zugang bleibt geschlossen, bis er antwortet.",
    "admission.activeUsers": "Personen im System: {count} von {max}",
    "admission.queuePosition": "Deine Position in der Warteschlange: {position} von {size}",
    "admission.thresholds":
      "Eine neue Sitzung braucht mindestens {gpu}% freien Grafikspeicher, {ram}% freien Arbeitsspeicher und {storage}% freien Festplattenplatz.",
    "admission.caps":
      "Das System bleibt zusätzlich insgesamt unter {gpu}% Grafik-, {ram}% Speicher- und {storage}% Festplattennutzung.",
    "admission.retry": "Erneut prüfen",
    "admission.retryAt": "Du kannst es um {time} erneut versuchen.",
    "admission.signOut": "Abmelden",
    "admission.failClosedNote":
      "Wir nehmen niemals einen freien Platz an. Solange der lokale Server keinen bestätigt, bleibt der Lernbereich geschlossen.",

    "systemHealth.title": "Systemzustand",
    "systemHealth.subtitle":
      "Aktuelle Kapazität des lokalen KI-Servers und der von dieser Installation genutzte Speicher.",
    "systemHealth.local.title": "Lokaler KI-Server",
    "systemHealth.local.unavailable":
      "Der lokale KI-Server ist nicht erreichbar, daher werden keine aktuellen Werte angezeigt. Hier wird nichts geschätzt.",
    "systemHealth.local.activeUsers": "Zugelassene Personen",
    "systemHealth.local.queue": "Warteschlange",
    "systemHealth.local.gpus": "Grafikkarten",
    "systemHealth.local.gpu": "GPU {id}",
    "systemHealth.local.vram": "Grafikspeicher",
    "systemHealth.local.utilisation": "Auslastung",
    "systemHealth.local.instances": "Geladene Modelle",
    "systemHealth.local.instanceProcesses": "{count} Prozesse",
    "systemHealth.local.mine": "Deine Sitzung",
    "systemHealth.local.ram": "Arbeitsspeicher",
    "systemHealth.local.disk": "Lokale Festplatte",
    "systemHealth.local.rebalance": "Verteilungsstatus",
    "systemHealth.local.recommendation": "Empfohlenes Modell",
    "systemHealth.local.preferred": "Dein bevorzugtes Modell",
    "systemHealth.local.assigned": "Aktuell zugewiesenes Modell",
    "systemHealth.local.assignedNote":
      "Wenn das System stark belastet ist, erhältst du vielleicht ein leichteres Modell. Deine gespeicherte Auswahl bleibt unverändert.",
    "systemHealth.local.queuePosition": "Deine Position in der Warteschlange",
    "systemHealth.local.noIdentities":
      "Hier werden nur Gesamtwerte gezeigt. Namen anderer Personen erscheinen nie.",

    "systemHealth.cloud.title": "Cloud-Speicher und Datenbank",
    "systemHealth.cloud.objectStorage": "Dateispeicher",
    "systemHealth.cloud.database": "Datenbank",
    "systemHealth.cloud.bandwidth": "Datenübertragung",
    "systemHealth.cloud.realtime": "Echtzeit",
    "systemHealth.cloud.edgeFunctions": "Funktionen",
    "systemHealth.cloud.notExposed": "Nicht verfügbar",
    "systemHealth.cloud.cleanupNote":
      "Wenn der Dateispeicher {trigger}% erreicht, werden die ältesten gespeicherten Dateien der ganzen Installation automatisch entfernt, bis etwa {target}% erreicht sind. Profilbilder, Konten und Einstellungen sind davon nie betroffen.",
    "systemHealth.cloud.used": "{used} von {quota} genutzt ({percent}%)",
    "systemHealth.cloud.usedOnly": "{used} genutzt",

    "systemHealth.myData.title": "Deine Daten",
    "systemHealth.myData.aiThreads": "Lernchats",
    "systemHealth.myData.aiMessages": "Lernnachrichten",
    "systemHealth.myData.peerConversations": "Unterhaltungen",
    "systemHealth.myData.peerMessages": "Nachrichten",
    "systemHealth.myData.attachments": "Anhänge",
    "systemHealth.myData.documents": "Materialien",
    "systemHealth.myData.loadFailed": "Die Übersicht deiner Daten konnte nicht geladen werden.",

    "systemHealth.release.title": "Mein KI-Modell freigeben",
    "systemHealth.release.body":
      "Gibt das Modell und den für deine Sitzung reservierten Speicher frei. Deine Sitzung läuft ohne KI weiter, bis du wieder ein Modell vorbereitest.",
    "systemHealth.release.action": "Mein KI-Modell freigeben",
    "systemHealth.release.working": "Wird freigegeben…",
    "systemHealth.release.done": "Dein Modell wurde freigegeben. Diese Sitzung läuft ohne KI weiter.",
    "systemHealth.release.failed":
      "Der lokale Server hat die Freigabe nicht bestätigt. Es wurde nichts verändert.",

    "dataRights.title": "Meine Daten löschen",
    "dataRights.subtitle":
      "Du entscheidest, was bleibt. Löschungen betreffen nur dein eigenes Konto und können nicht rückgängig gemacht werden.",
    "dataRights.range.title": "Zeitraum löschen",
    "dataRights.range.start": "Von",
    "dataRights.range.end": "Bis",
    "dataRights.range.includePeer": "Unterhaltungen mit anderen Personen",
    "dataRights.range.includeAi": "Lernchats mit der KI",
    "dataRights.range.action": "Diesen Zeitraum löschen",
    "dataRights.range.needsSelection": "Wähle mindestens eine Datenart und einen Zeitraum.",
    "dataRights.allContent.title": "Alle Inhalte löschen, Konto behalten",
    "dataRights.allContent.body":
      "Entfernt deine Chats, Nachrichten, Anhänge und Materialien. Login, Profil, Einstellungen und Zustimmungsnachweise bleiben erhalten.",
    "dataRights.allContent.action": "Alle meine Inhalte löschen",
    "dataRights.account.title": "Mein Konto löschen",
    "dataRights.account.body":
      "Entfernt deine Inhalte und deinen Login. Danach kannst du sich nicht mehr anmelden.",
    "dataRights.account.action": "Mein Konto löschen",
    "dataRights.confirm.title": "Bitte bestätigen",
    "dataRights.confirm.typeToConfirm": "Tippe {word} zur Bestätigung.",
    "dataRights.confirm.word": "LOESCHEN",
    "dataRights.confirm.cancel": "Abbrechen",
    "dataRights.confirm.proceed": "Endgültig löschen",
    "dataRights.working": "Wird gelöscht…",
    "dataRights.done": "Löschung abgeschlossen.",
    "dataRights.failed": "Die Löschung konnte nicht abgeschlossen werden. Sonst wurde nichts verändert.",
    "dataRights.retentionNote":
      "Minimale, anonymisierte Sicherheits- und Rechtsnachweise können aufbewahrt werden, wenn Gesetz oder ein Rechtsanspruch es verlangt. Wir können nicht versprechen, dass solche Nachweise verschwinden.",
    "dataRights.legalLinks": "Datenschutzhinweis und Richtlinien",

    "settings.messaging.title": "Nachrichten",
    "settings.messaging.peerNotifications": "Über neue Nachrichten benachrichtigen",
    "settings.messaging.peerNotificationsHint":
      "Wenn du das ausschaltest, bleibt der Ungelesen-Zähler, aber Hinweisfenster erscheinen nicht mehr.",
    "settings.messaging.browserNotifications": "Browser-Benachrichtigungen anzeigen",
    "settings.messaging.browserNotificationsHint":
      "Dein Browser fragt nach Erlaubnis, wenn du das einschaltest.",
    "settings.model.preferred": "Bevorzugtes Modell",
    "settings.model.assigned": "Aktuell zugewiesen",
    "settings.model.recommendation": "Vom System empfohlen: {model}",
    "settings.model.assignedDiffers":
      "Das System hat dir vorläufig ein leichteres Modell gegeben. Deine Auswahl bleibt gespeichert.",
    "settings.privacy.title": "Datenschutz und Daten",
    "settings.privacy.body": "Sieh, was über dich gespeichert ist, und lösche es.",
    "settings.privacy.openSystemHealth": "Datenverwaltung öffnen",
    "settings.privacy.legal": "Nutzungsbedingungen, Datenschutz, Verhaltensregeln und Kinderschutz",
    "settings.compliance.title": "Deine Zustimmungen",
    "settings.compliance.accountType": "Kontotyp",
    "settings.compliance.accountType.student": "Schülerin oder Schüler",
    "settings.compliance.accountType.teacher": "Lehrperson",
    "settings.compliance.accountType.unknown": "Nicht festgelegt",
    "settings.compliance.accepted": "Akzeptiert am {date} (Version {version})",
    "settings.compliance.status.active": "Aktiv",
    "settings.compliance.status.suspended_pending_review": "Eingeschränkt bis zur Prüfung",
    "settings.compliance.status.deletion_pending": "Löschung ausstehend",
    "settings.compliance.strikes": "Bestätigte Verwarnungen: {count}",
  },

  gsw: {
    "nav.systemHealth": "Systemzuestand",

    "admission.title": "Mir prüefed d Systemkapazität",
    "admission.subtitle":
      "Die Installation bedient nur e begrenzti Zahl Lüt gliichziitig. Mir fraged de lokal Server, öb für dini Sitzig Platz isch.",
    "admission.state.checking": "Kapazität wird prüeft…",
    "admission.state.admitted": "Du häsch en Platz. Es gaht wiiter…",
    "admission.state.queued": "Du bisch i de Warteschlange.",
    "admission.state.denied_capacity":
      "Es git grad nöd gnueg freie Grafikspiicher, Arbeitsspiicher oder Festplatteplatz für e neui Sitzig.",
    "admission.state.denied_user_limit": "S Maximum a Lüt nutzt s System scho.",
    "admission.state.backend_unavailable":
      "De lokal Server isch nöd erreichbar, drum chöned mir kein freie Platz bestätige. De Zuegang bliibt zue, bis er antwortet.",
    "admission.activeUsers": "Lüt im System: {count} vo {max}",
    "admission.queuePosition": "Dini Position i de Warteschlange: {position} vo {size}",
    "admission.thresholds":
      "E neui Sitzig bruucht mindeschtens {gpu}% freie Grafikspiicher, {ram}% freie Arbeitsspiicher und {storage}% freie Festplatteplatz.",
    "admission.caps":
      "S System bliibt zudem insgesamt under {gpu}% Grafik-, {ram}% Spiicher- und {storage}% Festplattenutzig.",
    "admission.retry": "Nomal prüefe",
    "admission.retryAt": "Du chasch es am {time} nomal probiere.",
    "admission.signOut": "Abmelde",
    "admission.failClosedNote":
      "Mir nähmed nie eifach en freie Platz a. Solang de lokal Server kein bestätigt, bliibt de Lernbereich zue.",

    "systemHealth.title": "Systemzuestand",
    "systemHealth.subtitle":
      "Aktuelli Kapazität vom lokale KI-Server und de Spiicher, wo die Installation bruucht.",
    "systemHealth.local.title": "Lokale KI-Server",
    "systemHealth.local.unavailable":
      "De lokal KI-Server isch nöd erreichbar, drum werded kei aktuelli Wert zeigt. Da wird nüt gschätzt.",
    "systemHealth.local.activeUsers": "Zuegelasseni Lüt",
    "systemHealth.local.queue": "Warteschlange",
    "systemHealth.local.gpus": "Grafikcharte",
    "systemHealth.local.gpu": "GPU {id}",
    "systemHealth.local.vram": "Grafikspiicher",
    "systemHealth.local.utilisation": "Uslastig",
    "systemHealth.local.instances": "Glade Modell",
    "systemHealth.local.instanceProcesses": "{count} Prozäss",
    "systemHealth.local.mine": "Dini Sitzig",
    "systemHealth.local.ram": "Arbeitsspiicher",
    "systemHealth.local.disk": "Lokali Festplatte",
    "systemHealth.local.rebalance": "Verteilig-Status",
    "systemHealth.local.recommendation": "Empfohle Modell",
    "systemHealth.local.preferred": "Dis bevorzugte Modell",
    "systemHealth.local.assigned": "Aktuell zuegwiesnigs Modell",
    "systemHealth.local.assignedNote":
      "Wenn s System stark belastet isch, überchunnsch villicht es liichters Modell. Dini gspiicherti Uswahl änderet sich nöd.",
    "systemHealth.local.queuePosition": "Dini Position i de Warteschlange",
    "systemHealth.local.noIdentities":
      "Da werded nur Gsamtwert zeigt. Näme vo andere Lüt erschiined nie.",

    "systemHealth.cloud.title": "Cloud-Spiicher und Datebank",
    "systemHealth.cloud.objectStorage": "Dateispiicher",
    "systemHealth.cloud.database": "Datebank",
    "systemHealth.cloud.bandwidth": "Dateübertragig",
    "systemHealth.cloud.realtime": "Echtziit",
    "systemHealth.cloud.edgeFunctions": "Funktione",
    "systemHealth.cloud.notExposed": "Nöd verfüegbar",
    "systemHealth.cloud.cleanupNote":
      "Wenn de Dateispiicher {trigger}% erreicht, werded automatisch d elteschte Datei vo de ganze Installation glöscht, bis öppe {target}% erreicht isch. Profilbilder, Konte und Iistellige sind nie betroffe.",
    "systemHealth.cloud.used": "{used} vo {quota} bruucht ({percent}%)",
    "systemHealth.cloud.usedOnly": "{used} bruucht",

    "systemHealth.myData.title": "Dini Date",
    "systemHealth.myData.aiThreads": "Lernchats",
    "systemHealth.myData.aiMessages": "Lernnachrichte",
    "systemHealth.myData.peerConversations": "Unterhaltige",
    "systemHealth.myData.peerMessages": "Nachrichte",
    "systemHealth.myData.attachments": "Aahäng",
    "systemHealth.myData.documents": "Materialie",
    "systemHealth.myData.loadFailed": "D Übersicht vo dine Date het nöd glade chöne werde.",

    "systemHealth.release.title": "Mis KI-Modell friigeh",
    "systemHealth.release.body":
      "Git s Modell und de für dini Sitzig reservierti Spiicher frii. Dini Sitzig lauft ohni KI wiiter, bis du wieder es Modell vorbereitisch.",
    "systemHealth.release.action": "Mis KI-Modell friigeh",
    "systemHealth.release.working": "Wird friigäh…",
    "systemHealth.release.done": "Dis Modell isch friigäh. Die Sitzig lauft ohni KI wiiter.",
    "systemHealth.release.failed":
      "De lokal Server het d Friigab nöd bestätigt. Es isch nüt veränderet worde.",

    "dataRights.title": "Mini Date lösche",
    "dataRights.subtitle":
      "Du entscheidisch, was bliibt. Löschige betreffed nur dis eigete Konto und chöi nöd zrugggnoh werde.",
    "dataRights.range.title": "Ziitruum lösche",
    "dataRights.range.start": "Vo",
    "dataRights.range.end": "Bis",
    "dataRights.range.includePeer": "Unterhaltige mit andere Lüt",
    "dataRights.range.includeAi": "Lernchats mit de KI",
    "dataRights.range.action": "Dä Ziitruum lösche",
    "dataRights.range.needsSelection": "Wähl mindeschtens eini Dateart und en Ziitruum.",
    "dataRights.allContent.title": "Alli Inhalt lösche, Konto bhalte",
    "dataRights.allContent.body":
      "Löscht dini Chats, Nachrichte, Aahäng und Materialie. Login, Profil, Iistellige und Zuestimmigsnachwiis bliibed.",
    "dataRights.allContent.action": "Alli mini Inhalt lösche",
    "dataRights.account.title": "Mis Konto lösche",
    "dataRights.account.body":
      "Löscht dini Inhalt und din Login. Nachhär chasch di nöd mehr aamelde.",
    "dataRights.account.action": "Mis Konto lösche",
    "dataRights.confirm.title": "Bitte bestätige",
    "dataRights.confirm.typeToConfirm": "Tippe {word} zum Bestätige.",
    "dataRights.confirm.word": "LOESCHE",
    "dataRights.confirm.cancel": "Abbräche",
    "dataRights.confirm.proceed": "Ändgültig lösche",
    "dataRights.working": "Wird glöscht…",
    "dataRights.done": "Löschig fertig.",
    "dataRights.failed": "D Löschig het nöd abgschlosse werde chöne. Suscht isch nüt veränderet worde.",
    "dataRights.retentionNote":
      "Minimali, anonymisierti Sicherheits- und Rechtsnachwiis chöi bhalte werde, wenn s Gsetz oder en Rechtsaaspruch das verlangt. Mir chöi nöd verspräche, dass sonigi Nachwiis verschwinded.",
    "dataRights.legalLinks": "Datenschutzhinwiis und Richtlinie",

    "settings.messaging.title": "Nachrichte",
    "settings.messaging.peerNotifications": "Über neui Nachrichte informiere",
    "settings.messaging.peerNotificationsHint":
      "Wenn du das uusschaltisch, bliibt de Ungläse-Zähler, aber Hinwiisfenschter chömed kei mehr.",
    "settings.messaging.browserNotifications": "Browser-Mitteilige zeige",
    "settings.messaging.browserNotificationsHint":
      "Din Browser fragt nach de Erlaubnis, wenn du das iischaltisch.",
    "settings.model.preferred": "Bevorzugts Modell",
    "settings.model.assigned": "Aktuell zuegwiese",
    "settings.model.recommendation": "Vom System empfohle: {model}",
    "settings.model.assignedDiffers":
      "S System het dir vorläufig es liichters Modell gäh. Dini Uswahl bliibt gspiicheret.",
    "settings.privacy.title": "Datenschutz und Date",
    "settings.privacy.body": "Lueg, was über di gspiicheret isch, und lösch es.",
    "settings.privacy.openSystemHealth": "Dateverwaltig ufmache",
    "settings.privacy.legal": "Nutzigsbedingige, Datenschutz, Verhaltensregle und Chinderschutz",
    "settings.compliance.title": "Dini Zuestimmige",
    "settings.compliance.accountType": "Kontotyp",
    "settings.compliance.accountType.student": "Schüelerin oder Schüeler",
    "settings.compliance.accountType.teacher": "Lehrperson",
    "settings.compliance.accountType.unknown": "Nöd festgleit",
    "settings.compliance.accepted": "Akzeptiert am {date} (Version {version})",
    "settings.compliance.status.active": "Aktiv",
    "settings.compliance.status.suspended_pending_review": "Iigschränkt bis zur Prüefig",
    "settings.compliance.status.deletion_pending": "Löschig usstehend",
    "settings.compliance.strikes": "Bestätigti Verwarnige: {count}",
  },

  ru: {
    "nav.systemHealth": "Состояние системы",

    "admission.title": "Проверяем ресурсы системы",
    "admission.subtitle":
      "Эта установка одновременно обслуживает ограниченное число людей. Мы спрашиваем локальный сервер, есть ли место для вашего сеанса.",
    "admission.state.checking": "Проверяем доступные ресурсы…",
    "admission.state.admitted": "Место есть. Продолжаем…",
    "admission.state.queued": "Вы в очереди ожидания.",
    "admission.state.denied_capacity":
      "Сейчас недостаточно свободной видеопамяти, оперативной памяти или места на диске для нового сеанса.",
    "admission.state.denied_user_limit": "Системой уже пользуется максимальное число людей.",
    "admission.state.backend_unavailable":
      "Локальный сервер недоступен, поэтому мы не можем подтвердить свободное место. Доступ остаётся закрытым, пока он не ответит.",
    "admission.activeUsers": "Людей в системе: {count} из {max}",
    "admission.queuePosition": "Ваше место в очереди: {position} из {size}",
    "admission.thresholds":
      "Для нового сеанса нужно минимум {gpu}% свободной видеопамяти, {ram}% свободной оперативной памяти и {storage}% свободного места на диске.",
    "admission.caps":
      "Кроме того, система в целом остаётся ниже {gpu}% использования видеопамяти, {ram}% памяти и {storage}% диска.",
    "admission.retry": "Проверить снова",
    "admission.retryAt": "Можно повторить попытку в {time}.",
    "admission.signOut": "Выйти",
    "admission.failClosedNote":
      "Мы никогда не предполагаем наличие свободного места. Пока локальный сервер его не подтвердит, учебная часть остаётся закрытой.",

    "systemHealth.title": "Состояние системы",
    "systemHealth.subtitle":
      "Текущие ресурсы локального ИИ-сервера и объём хранилища этой установки.",
    "systemHealth.local.title": "Локальный ИИ-сервер",
    "systemHealth.local.unavailable":
      "Локальный ИИ-сервер недоступен, поэтому текущие значения не показаны. Здесь ничего не оценивается приблизительно.",
    "systemHealth.local.activeUsers": "Допущенные люди",
    "systemHealth.local.queue": "Очередь ожидания",
    "systemHealth.local.gpus": "Видеокарты",
    "systemHealth.local.gpu": "GPU {id}",
    "systemHealth.local.vram": "Видеопамять",
    "systemHealth.local.utilisation": "Загрузка",
    "systemHealth.local.instances": "Загруженные модели",
    "systemHealth.local.instanceProcesses": "{count} процессов",
    "systemHealth.local.mine": "Ваш сеанс",
    "systemHealth.local.ram": "Оперативная память",
    "systemHealth.local.disk": "Локальный диск",
    "systemHealth.local.rebalance": "Состояние балансировки",
    "systemHealth.local.recommendation": "Рекомендованная модель",
    "systemHealth.local.preferred": "Ваша предпочтительная модель",
    "systemHealth.local.assigned": "Назначенная сейчас модель",
    "systemHealth.local.assignedNote":
      "При высокой загрузке вам могут выдать более лёгкую модель. Ваш сохранённый выбор не меняется.",
    "systemHealth.local.queuePosition": "Ваше место в очереди",
    "systemHealth.local.noIdentities":
      "Здесь показаны только общие значения. Имена других людей никогда не отображаются.",

    "systemHealth.cloud.title": "Облачное хранилище и база данных",
    "systemHealth.cloud.objectStorage": "Хранилище файлов",
    "systemHealth.cloud.database": "База данных",
    "systemHealth.cloud.bandwidth": "Трафик",
    "systemHealth.cloud.realtime": "Реальное время",
    "systemHealth.cloud.edgeFunctions": "Функции",
    "systemHealth.cloud.notExposed": "Недоступно",
    "systemHealth.cloud.cleanupNote":
      "Когда хранилище файлов достигает {trigger}%, самые старые файлы всей установки удаляются автоматически, пока не останется около {target}%. Фотографии профиля, учётные записи и настройки в эту очистку не входят.",
    "systemHealth.cloud.used": "{used} из {quota} ({percent}%)",
    "systemHealth.cloud.usedOnly": "использовано {used}",

    "systemHealth.myData.title": "Ваши данные",
    "systemHealth.myData.aiThreads": "Учебные чаты",
    "systemHealth.myData.aiMessages": "Учебные сообщения",
    "systemHealth.myData.peerConversations": "Переписки",
    "systemHealth.myData.peerMessages": "Сообщения",
    "systemHealth.myData.attachments": "Вложения",
    "systemHealth.myData.documents": "Материалы",
    "systemHealth.myData.loadFailed": "Не удалось загрузить сводку ваших данных.",

    "systemHealth.release.title": "Освободить мою ИИ-модель",
    "systemHealth.release.body":
      "Освобождает модель и память, зарезервированные для вашего сеанса. Сеанс продолжится без ИИ, пока вы снова не подготовите модель.",
    "systemHealth.release.action": "Освободить мою ИИ-модель",
    "systemHealth.release.working": "Освобождаем…",
    "systemHealth.release.done": "Модель освобождена. Этот сеанс продолжается без ИИ.",
    "systemHealth.release.failed":
      "Локальный сервер не подтвердил освобождение. Ничего не изменено.",

    "dataRights.title": "Удалить мои данные",
    "dataRights.subtitle":
      "Вы решаете, что останется. Удаление затрагивает только вашу учётную запись и необратимо.",
    "dataRights.range.title": "Удалить за период",
    "dataRights.range.start": "С",
    "dataRights.range.end": "По",
    "dataRights.range.includePeer": "Переписки с другими людьми",
    "dataRights.range.includeAi": "Учебные чаты с ИИ",
    "dataRights.range.action": "Удалить этот период",
    "dataRights.range.needsSelection": "Выберите хотя бы один вид данных и период.",
    "dataRights.allContent.title": "Удалить всё содержимое, сохранить учётную запись",
    "dataRights.allContent.body":
      "Удаляет ваши чаты, сообщения, вложения и материалы. Вход, профиль, настройки и записи согласий сохраняются.",
    "dataRights.allContent.action": "Удалить всё моё содержимое",
    "dataRights.account.title": "Удалить мою учётную запись",
    "dataRights.account.body":
      "Удаляет ваше содержимое и вашу учётную запись. После этого вход будет невозможен.",
    "dataRights.account.action": "Удалить мою учётную запись",
    "dataRights.confirm.title": "Подтвердите, пожалуйста",
    "dataRights.confirm.typeToConfirm": "Введите {word} для подтверждения.",
    "dataRights.confirm.word": "УДАЛИТЬ",
    "dataRights.confirm.cancel": "Отмена",
    "dataRights.confirm.proceed": "Удалить безвозвратно",
    "dataRights.working": "Удаляем…",
    "dataRights.done": "Удаление завершено.",
    "dataRights.failed": "Удаление не удалось завершить. Больше ничего не изменено.",
    "dataRights.retentionNote":
      "Минимальные анонимизированные записи о безопасности и правовые записи могут сохраняться, если этого требует закон или правовая претензия. Мы не можем обещать, что такие записи исчезнут.",
    "dataRights.legalLinks": "Уведомление о конфиденциальности и правила",

    "settings.messaging.title": "Сообщения",
    "settings.messaging.peerNotifications": "Уведомлять о новых сообщениях",
    "settings.messaging.peerNotificationsHint":
      "Если выключить, счётчик непрочитанного останется, а всплывающие уведомления пропадут.",
    "settings.messaging.browserNotifications": "Показывать уведомления браузера",
    "settings.messaging.browserNotificationsHint":
      "Браузер запросит разрешение, когда вы это включите.",
    "settings.model.preferred": "Предпочтительная модель",
    "settings.model.assigned": "Назначена сейчас",
    "settings.model.recommendation": "Система рекомендует: {model}",
    "settings.model.assignedDiffers":
      "Система пока выдала вам более лёгкую модель. Ваш выбор сохранён.",
    "settings.privacy.title": "Конфиденциальность и данные",
    "settings.privacy.body": "Посмотрите, что о вас хранится, и удалите это.",
    "settings.privacy.openSystemHealth": "Открыть управление данными",
    "settings.privacy.legal":
      "Условия, конфиденциальность, правила поведения и защита детей",
    "settings.compliance.title": "Ваши согласия",
    "settings.compliance.accountType": "Тип аккаунта",
    "settings.compliance.accountType.student": "Учащийся",
    "settings.compliance.accountType.teacher": "Учитель",
    "settings.compliance.accountType.unknown": "Не указан",
    "settings.compliance.accepted": "Принято {date} (версия {version})",
    "settings.compliance.status.active": "Активен",
    "settings.compliance.status.suspended_pending_review": "Ограничен до проверки",
    "settings.compliance.status.deletion_pending": "Ожидается удаление",
    "settings.compliance.strikes": "Подтверждённых предупреждений: {count}",
  },

  es: {
    "nav.systemHealth": "Estado del sistema",

    "admission.title": "Comprobando la capacidad del sistema",
    "admission.subtitle":
      "Esta instalación atiende a un número limitado de personas a la vez. Preguntamos al servidor local si hay sitio para tu sesión.",
    "admission.state.checking": "Comprobando capacidad…",
    "admission.state.admitted": "Tienes un sitio. Continuamos…",
    "admission.state.queued": "Estás en la cola de espera.",
    "admission.state.denied_capacity":
      "Ahora mismo no hay suficiente memoria de gráficos, memoria del sistema ni espacio en disco para una nueva sesión.",
    "admission.state.denied_user_limit":
      "El número máximo de personas ya está usando el sistema.",
    "admission.state.backend_unavailable":
      "No se puede contactar con el servidor local, así que no podemos confirmar un sitio libre. El acceso permanece cerrado hasta que responda.",
    "admission.activeUsers": "Personas usando el sistema: {count} de {max}",
    "admission.queuePosition": "Tu posición en la cola: {position} de {size}",
    "admission.thresholds":
      "Una nueva sesión necesita al menos un {gpu}% de memoria de gráficos libre, un {ram}% de memoria del sistema libre y un {storage}% de disco libre.",
    "admission.caps":
      "Además, el sistema se mantiene por debajo del {gpu}% de uso de gráficos, del {ram}% de memoria y del {storage}% de disco en total.",
    "admission.retry": "Comprobar de nuevo",
    "admission.retryAt": "Puedes volver a intentarlo a las {time}.",
    "admission.signOut": "Cerrar sesión",
    "admission.failClosedNote":
      "Nunca damos por supuesto que hay sitio. Hasta que el servidor local lo confirme, el área de estudio permanece cerrada.",

    "systemHealth.title": "Estado del sistema",
    "systemHealth.subtitle":
      "Capacidad actual del servidor de IA local y almacenamiento usado por esta instalación.",
    "systemHealth.local.title": "Servidor de IA local",
    "systemHealth.local.unavailable":
      "No se puede contactar con el servidor de IA local, por lo que no se muestran valores actuales. Aquí no se estima nada.",
    "systemHealth.local.activeUsers": "Personas admitidas",
    "systemHealth.local.queue": "Cola de espera",
    "systemHealth.local.gpus": "Tarjetas gráficas",
    "systemHealth.local.gpu": "GPU {id}",
    "systemHealth.local.vram": "Memoria de vídeo",
    "systemHealth.local.utilisation": "Uso",
    "systemHealth.local.instances": "Modelos cargados",
    "systemHealth.local.instanceProcesses": "{count} procesos",
    "systemHealth.local.mine": "Tu sesión",
    "systemHealth.local.ram": "Memoria del sistema",
    "systemHealth.local.disk": "Disco local",
    "systemHealth.local.rebalance": "Estado del equilibrado",
    "systemHealth.local.recommendation": "Modelo recomendado",
    "systemHealth.local.preferred": "Tu modelo preferido",
    "systemHealth.local.assigned": "Modelo asignado ahora",
    "systemHealth.local.assignedNote":
      "Cuando el sistema está ocupado puede darte un modelo más ligero. Tu preferencia guardada no cambia.",
    "systemHealth.local.queuePosition": "Tu posición en la cola",
    "systemHealth.local.noIdentities":
      "Aquí solo se muestran totales. Los nombres de otras personas nunca aparecen.",

    "systemHealth.cloud.title": "Almacenamiento en la nube y base de datos",
    "systemHealth.cloud.objectStorage": "Almacenamiento de archivos",
    "systemHealth.cloud.database": "Base de datos",
    "systemHealth.cloud.bandwidth": "Ancho de banda",
    "systemHealth.cloud.realtime": "Tiempo real",
    "systemHealth.cloud.edgeFunctions": "Funciones",
    "systemHealth.cloud.notExposed": "No disponible",
    "systemHealth.cloud.cleanupNote":
      "Cuando el almacenamiento de archivos llega al {trigger}%, los archivos más antiguos de toda la instalación se eliminan automáticamente hasta llegar a cerca del {target}%. Las fotos de perfil, las cuentas y los ajustes nunca forman parte de esta limpieza.",
    "systemHealth.cloud.used": "{used} de {quota} usados ({percent}%)",
    "systemHealth.cloud.usedOnly": "{used} usados",

    "systemHealth.myData.title": "Tus datos",
    "systemHealth.myData.aiThreads": "Chats de estudio",
    "systemHealth.myData.aiMessages": "Mensajes de estudio",
    "systemHealth.myData.peerConversations": "Conversaciones",
    "systemHealth.myData.peerMessages": "Mensajes",
    "systemHealth.myData.attachments": "Adjuntos",
    "systemHealth.myData.documents": "Materiales",
    "systemHealth.myData.loadFailed": "No se pudo cargar el resumen de tus datos.",

    "systemHealth.release.title": "Liberar mi modelo de IA",
    "systemHealth.release.body":
      "Libera el modelo y la memoria reservados para tu sesión. Tu sesión continúa sin IA hasta que vuelvas a preparar un modelo.",
    "systemHealth.release.action": "Liberar mi modelo de IA",
    "systemHealth.release.working": "Liberando…",
    "systemHealth.release.done": "Tu modelo se ha liberado. Esta sesión continúa sin IA.",
    "systemHealth.release.failed":
      "El servidor local no confirmó la liberación. No se cambió nada.",

    "dataRights.title": "Eliminar mis datos",
    "dataRights.subtitle":
      "Tú decides qué se queda. Las eliminaciones solo afectan a tu cuenta y no se pueden deshacer.",
    "dataRights.range.title": "Eliminar un intervalo de fechas",
    "dataRights.range.start": "Desde",
    "dataRights.range.end": "Hasta",
    "dataRights.range.includePeer": "Conversaciones con otras personas",
    "dataRights.range.includeAi": "Chats de estudio con la IA",
    "dataRights.range.action": "Eliminar este intervalo",
    "dataRights.range.needsSelection": "Elige al menos un tipo de datos y un intervalo de fechas.",
    "dataRights.allContent.title": "Eliminar todo mi contenido y conservar mi cuenta",
    "dataRights.allContent.body":
      "Elimina tus chats, mensajes, adjuntos y materiales. Tu acceso, perfil, ajustes y registros de consentimiento se conservan.",
    "dataRights.allContent.action": "Eliminar todo mi contenido",
    "dataRights.account.title": "Eliminar mi cuenta",
    "dataRights.account.body":
      "Elimina tu contenido y tu acceso. Después no podrás volver a iniciar sesión.",
    "dataRights.account.action": "Eliminar mi cuenta",
    "dataRights.confirm.title": "Confirma, por favor",
    "dataRights.confirm.typeToConfirm": "Escribe {word} para confirmar.",
    "dataRights.confirm.word": "BORRAR",
    "dataRights.confirm.cancel": "Cancelar",
    "dataRights.confirm.proceed": "Eliminar definitivamente",
    "dataRights.working": "Eliminando…",
    "dataRights.done": "Eliminación finalizada.",
    "dataRights.failed": "No se pudo completar la eliminación. No se cambió nada más.",
    "dataRights.retentionNote":
      "Pueden conservarse registros mínimos y anonimizados de seguridad y legales cuando la ley o una reclamación legal lo exija. No podemos prometer que esos registros desaparezcan.",
    "dataRights.legalLinks": "Aviso de privacidad y políticas",

    "settings.messaging.title": "Mensajes",
    "settings.messaging.peerNotifications": "Avisarme de mensajes nuevos",
    "settings.messaging.peerNotificationsHint":
      "Al desactivarlo se mantiene el contador de no leídos, pero se dejan de mostrar los avisos emergentes.",
    "settings.messaging.browserNotifications": "Mostrar notificaciones del navegador",
    "settings.messaging.browserNotificationsHint":
      "Tu navegador pedirá permiso cuando lo actives.",
    "settings.model.preferred": "Modelo preferido",
    "settings.model.assigned": "Asignado ahora",
    "settings.model.recommendation": "Recomendado por el sistema: {model}",
    "settings.model.assignedDiffers":
      "Por ahora el sistema te ha dado un modelo más ligero. Tu preferencia sigue guardada.",
    "settings.privacy.title": "Privacidad y datos",
    "settings.privacy.body": "Consulta qué se guarda sobre ti y elimínalo.",
    "settings.privacy.openSystemHealth": "Abrir controles de datos",
    "settings.privacy.legal": "Condiciones, privacidad, uso aceptable y protección de menores",
    "settings.compliance.title": "Tus aceptaciones",
    "settings.compliance.accountType": "Tipo de cuenta",
    "settings.compliance.accountType.student": "Estudiante",
    "settings.compliance.accountType.teacher": "Docente",
    "settings.compliance.accountType.unknown": "Sin definir",
    "settings.compliance.accepted": "Aceptado el {date} (versión {version})",
    "settings.compliance.status.active": "Activa",
    "settings.compliance.status.suspended_pending_review": "Limitada pendiente de revisión",
    "settings.compliance.status.deletion_pending": "Eliminación pendiente",
    "settings.compliance.strikes": "Avisos confirmados: {count}",
  },

  fr: {
    "nav.systemHealth": "État du système",

    "admission.title": "Vérification de la capacité du système",
    "admission.subtitle":
      "Cette installation accueille un nombre limité de personnes en même temps. Nous demandons au serveur local s'il y a de la place pour ta session.",
    "admission.state.checking": "Vérification de la capacité…",
    "admission.state.admitted": "Tu as une place. On continue…",
    "admission.state.queued": "Tu es dans la file d'attente.",
    "admission.state.denied_capacity":
      "Il n'y a pas assez de mémoire graphique, de mémoire système ou d'espace disque libre pour démarrer une nouvelle session.",
    "admission.state.denied_user_limit":
      "Le nombre maximal de personnes utilise déjà le système.",
    "admission.state.backend_unavailable":
      "Le serveur local est injoignable, nous ne pouvons donc pas confirmer une place libre. L'accès reste fermé jusqu'à sa réponse.",
    "admission.activeUsers": "Personnes sur le système : {count} sur {max}",
    "admission.queuePosition": "Ta position dans la file : {position} sur {size}",
    "admission.thresholds":
      "Une nouvelle session nécessite au moins {gpu}% de mémoire graphique libre, {ram}% de mémoire système libre et {storage}% d'espace disque libre.",
    "admission.caps":
      "Le système reste aussi globalement sous {gpu}% d'utilisation graphique, {ram}% de mémoire et {storage}% de disque.",
    "admission.retry": "Vérifier à nouveau",
    "admission.retryAt": "Tu peux réessayer à {time}.",
    "admission.signOut": "Se déconnecter",
    "admission.failClosedNote":
      "Nous ne supposons jamais qu'une place est libre. Tant que le serveur local ne la confirme pas, l'espace d'étude reste fermé.",

    "systemHealth.title": "État du système",
    "systemHealth.subtitle":
      "Capacité actuelle du serveur d'IA local et espace de stockage utilisé par cette installation.",
    "systemHealth.local.title": "Serveur d'IA local",
    "systemHealth.local.unavailable":
      "Le serveur d'IA local est injoignable, aucune valeur actuelle n'est donc affichée. Rien n'est estimé ici.",
    "systemHealth.local.activeUsers": "Personnes admises",
    "systemHealth.local.queue": "File d'attente",
    "systemHealth.local.gpus": "Cartes graphiques",
    "systemHealth.local.gpu": "GPU {id}",
    "systemHealth.local.vram": "Mémoire vidéo",
    "systemHealth.local.utilisation": "Utilisation",
    "systemHealth.local.instances": "Modèles chargés",
    "systemHealth.local.instanceProcesses": "{count} processus",
    "systemHealth.local.mine": "Ta session",
    "systemHealth.local.ram": "Mémoire système",
    "systemHealth.local.disk": "Disque local",
    "systemHealth.local.rebalance": "État de l'équilibrage",
    "systemHealth.local.recommendation": "Modèle recommandé",
    "systemHealth.local.preferred": "Ton modèle préféré",
    "systemHealth.local.assigned": "Modèle actuellement attribué",
    "systemHealth.local.assignedNote":
      "Quand le système est chargé, un modèle plus léger peut t'être attribué. Ta préférence enregistrée ne change pas.",
    "systemHealth.local.queuePosition": "Ta position dans la file",
    "systemHealth.local.noIdentities":
      "Seuls des totaux sont affichés ici. Les noms des autres personnes n'apparaissent jamais.",

    "systemHealth.cloud.title": "Stockage cloud et base de données",
    "systemHealth.cloud.objectStorage": "Stockage de fichiers",
    "systemHealth.cloud.database": "Base de données",
    "systemHealth.cloud.bandwidth": "Bande passante",
    "systemHealth.cloud.realtime": "Temps réel",
    "systemHealth.cloud.edgeFunctions": "Fonctions",
    "systemHealth.cloud.notExposed": "Non disponible",
    "systemHealth.cloud.cleanupNote":
      "Lorsque le stockage de fichiers atteint {trigger}%, les fichiers les plus anciens de toute l'installation sont supprimés automatiquement jusqu'à environ {target}%. Les photos de profil, les comptes et les réglages ne font jamais partie de ce nettoyage.",
    "systemHealth.cloud.used": "{used} sur {quota} utilisés ({percent}%)",
    "systemHealth.cloud.usedOnly": "{used} utilisés",

    "systemHealth.myData.title": "Tes données",
    "systemHealth.myData.aiThreads": "Discussions d'étude",
    "systemHealth.myData.aiMessages": "Messages d'étude",
    "systemHealth.myData.peerConversations": "Conversations",
    "systemHealth.myData.peerMessages": "Messages",
    "systemHealth.myData.attachments": "Pièces jointes",
    "systemHealth.myData.documents": "Documents",
    "systemHealth.myData.loadFailed": "Le récapitulatif de tes données n'a pas pu être chargé.",

    "systemHealth.release.title": "Libérer mon modèle d'IA",
    "systemHealth.release.body":
      "Libère le modèle et la mémoire réservés à ta session. Ta session continue sans IA jusqu'à ce que tu prépares un nouveau modèle.",
    "systemHealth.release.action": "Libérer mon modèle d'IA",
    "systemHealth.release.working": "Libération…",
    "systemHealth.release.done": "Ton modèle a été libéré. Cette session continue sans IA.",
    "systemHealth.release.failed":
      "Le serveur local n'a pas confirmé la libération. Rien n'a été modifié.",

    "dataRights.title": "Supprimer mes données",
    "dataRights.subtitle":
      "Tu décides de ce qui reste. Les suppressions ne concernent que ton compte et sont définitives.",
    "dataRights.range.title": "Supprimer une période",
    "dataRights.range.start": "Du",
    "dataRights.range.end": "Au",
    "dataRights.range.includePeer": "Conversations avec d'autres personnes",
    "dataRights.range.includeAi": "Discussions d'étude avec l'IA",
    "dataRights.range.action": "Supprimer cette période",
    "dataRights.range.needsSelection": "Choisis au moins un type de données et une période.",
    "dataRights.allContent.title": "Supprimer tout mon contenu et garder mon compte",
    "dataRights.allContent.body":
      "Supprime tes discussions, messages, pièces jointes et documents. Ton accès, ton profil, tes réglages et tes consentements sont conservés.",
    "dataRights.allContent.action": "Supprimer tout mon contenu",
    "dataRights.account.title": "Supprimer mon compte",
    "dataRights.account.body":
      "Supprime ton contenu et ton accès. Tu ne pourras plus te connecter ensuite.",
    "dataRights.account.action": "Supprimer mon compte",
    "dataRights.confirm.title": "Merci de confirmer",
    "dataRights.confirm.typeToConfirm": "Saisis {word} pour confirmer.",
    "dataRights.confirm.word": "SUPPRIMER",
    "dataRights.confirm.cancel": "Annuler",
    "dataRights.confirm.proceed": "Supprimer définitivement",
    "dataRights.working": "Suppression…",
    "dataRights.done": "Suppression terminée.",
    "dataRights.failed": "La suppression n'a pas pu être terminée. Rien d'autre n'a été modifié.",
    "dataRights.retentionNote":
      "Des enregistrements minimaux et anonymisés de sécurité et à valeur juridique peuvent être conservés lorsque la loi ou une réclamation l'exige. Nous ne pouvons pas promettre leur disparition.",
    "dataRights.legalLinks": "Avis de confidentialité et règles",

    "settings.messaging.title": "Messages",
    "settings.messaging.peerNotifications": "Me prévenir des nouveaux messages",
    "settings.messaging.peerNotificationsHint":
      "En désactivant, le compteur de non-lus reste mais les alertes n'apparaissent plus.",
    "settings.messaging.browserNotifications": "Afficher les notifications du navigateur",
    "settings.messaging.browserNotificationsHint":
      "Ton navigateur demandera l'autorisation lorsque tu l'activeras.",
    "settings.model.preferred": "Modèle préféré",
    "settings.model.assigned": "Actuellement attribué",
    "settings.model.recommendation": "Recommandé par le système : {model}",
    "settings.model.assignedDiffers":
      "Le système t'a attribué un modèle plus léger pour l'instant. Ta préférence reste enregistrée.",
    "settings.privacy.title": "Confidentialité et données",
    "settings.privacy.body": "Vois ce qui est enregistré à ton sujet et supprime-le.",
    "settings.privacy.openSystemHealth": "Ouvrir la gestion des données",
    "settings.privacy.legal":
      "Conditions, confidentialité, usage acceptable et protection des mineurs",
    "settings.compliance.title": "Tes acceptations",
    "settings.compliance.accountType": "Type de compte",
    "settings.compliance.accountType.student": "Élève",
    "settings.compliance.accountType.teacher": "Enseignant",
    "settings.compliance.accountType.unknown": "Non défini",
    "settings.compliance.accepted": "Accepté le {date} (version {version})",
    "settings.compliance.status.active": "Actif",
    "settings.compliance.status.suspended_pending_review": "Limité en attente d'examen",
    "settings.compliance.status.deletion_pending": "Suppression en attente",
    "settings.compliance.strikes": "Avertissements confirmés : {count}",
  },

  it: {
    "nav.systemHealth": "Stato del sistema",

    "admission.title": "Verifica della capacità del sistema",
    "admission.subtitle":
      "Questa installazione serve un numero limitato di persone alla volta. Chiediamo al server locale se c'è posto per la tua sessione.",
    "admission.state.checking": "Verifica della capacità…",
    "admission.state.admitted": "Hai un posto. Si continua…",
    "admission.state.queued": "Sei in coda.",
    "admission.state.denied_capacity":
      "Al momento non c'è abbastanza memoria grafica, memoria di sistema o spazio su disco per una nuova sessione.",
    "admission.state.denied_user_limit":
      "Il numero massimo di persone sta già usando il sistema.",
    "admission.state.backend_unavailable":
      "Il server locale non è raggiungibile, quindi non possiamo confermare un posto libero. L'accesso resta chiuso finché non risponde.",
    "admission.activeUsers": "Persone nel sistema: {count} su {max}",
    "admission.queuePosition": "La tua posizione in coda: {position} su {size}",
    "admission.thresholds":
      "Una nuova sessione richiede almeno il {gpu}% di memoria grafica libera, il {ram}% di memoria di sistema libera e il {storage}% di spazio su disco libero.",
    "admission.caps":
      "Il sistema resta inoltre complessivamente sotto il {gpu}% di uso grafico, il {ram}% di memoria e il {storage}% di disco.",
    "admission.retry": "Verifica di nuovo",
    "admission.retryAt": "Puoi riprovare alle {time}.",
    "admission.signOut": "Esci",
    "admission.failClosedNote":
      "Non diamo mai per scontato un posto libero. Finché il server locale non lo conferma, l'area di studio resta chiusa.",

    "systemHealth.title": "Stato del sistema",
    "systemHealth.subtitle":
      "Capacità attuale del server IA locale e spazio di archiviazione usato da questa installazione.",
    "systemHealth.local.title": "Server IA locale",
    "systemHealth.local.unavailable":
      "Il server IA locale non è raggiungibile, quindi non vengono mostrati valori attuali. Qui non si stima nulla.",
    "systemHealth.local.activeUsers": "Persone ammesse",
    "systemHealth.local.queue": "Coda di attesa",
    "systemHealth.local.gpus": "Schede grafiche",
    "systemHealth.local.gpu": "GPU {id}",
    "systemHealth.local.vram": "Memoria video",
    "systemHealth.local.utilisation": "Utilizzo",
    "systemHealth.local.instances": "Modelli caricati",
    "systemHealth.local.instanceProcesses": "{count} processi",
    "systemHealth.local.mine": "La tua sessione",
    "systemHealth.local.ram": "Memoria di sistema",
    "systemHealth.local.disk": "Disco locale",
    "systemHealth.local.rebalance": "Stato del bilanciamento",
    "systemHealth.local.recommendation": "Modello consigliato",
    "systemHealth.local.preferred": "Il tuo modello preferito",
    "systemHealth.local.assigned": "Modello assegnato adesso",
    "systemHealth.local.assignedNote":
      "Quando il sistema è carico può esserti assegnato un modello più leggero. La tua preferenza salvata non cambia.",
    "systemHealth.local.queuePosition": "La tua posizione in coda",
    "systemHealth.local.noIdentities":
      "Qui sono mostrati solo i totali. I nomi delle altre persone non compaiono mai.",

    "systemHealth.cloud.title": "Archiviazione cloud e database",
    "systemHealth.cloud.objectStorage": "Archiviazione file",
    "systemHealth.cloud.database": "Database",
    "systemHealth.cloud.bandwidth": "Banda",
    "systemHealth.cloud.realtime": "Tempo reale",
    "systemHealth.cloud.edgeFunctions": "Funzioni",
    "systemHealth.cloud.notExposed": "Non disponibile",
    "systemHealth.cloud.cleanupNote":
      "Quando l'archiviazione file raggiunge il {trigger}%, i file più vecchi di tutta l'installazione vengono rimossi automaticamente fino a circa il {target}%. Foto del profilo, account e impostazioni non fanno mai parte di questa pulizia.",
    "systemHealth.cloud.used": "{used} di {quota} usati ({percent}%)",
    "systemHealth.cloud.usedOnly": "{used} usati",

    "systemHealth.myData.title": "I tuoi dati",
    "systemHealth.myData.aiThreads": "Chat di studio",
    "systemHealth.myData.aiMessages": "Messaggi di studio",
    "systemHealth.myData.peerConversations": "Conversazioni",
    "systemHealth.myData.peerMessages": "Messaggi",
    "systemHealth.myData.attachments": "Allegati",
    "systemHealth.myData.documents": "Materiali",
    "systemHealth.myData.loadFailed": "Non è stato possibile caricare il riepilogo dei tuoi dati.",

    "systemHealth.release.title": "Rilascia il mio modello IA",
    "systemHealth.release.body":
      "Libera il modello e la memoria riservati alla tua sessione. La sessione continua senza IA finché non prepari di nuovo un modello.",
    "systemHealth.release.action": "Rilascia il mio modello IA",
    "systemHealth.release.working": "Rilascio in corso…",
    "systemHealth.release.done": "Il tuo modello è stato rilasciato. Questa sessione continua senza IA.",
    "systemHealth.release.failed":
      "Il server locale non ha confermato il rilascio. Non è stato modificato nulla.",

    "dataRights.title": "Elimina i miei dati",
    "dataRights.subtitle":
      "Decidi tu cosa resta. Le eliminazioni riguardano solo il tuo account e non si possono annullare.",
    "dataRights.range.title": "Elimina un intervallo di date",
    "dataRights.range.start": "Dal",
    "dataRights.range.end": "Al",
    "dataRights.range.includePeer": "Conversazioni con altre persone",
    "dataRights.range.includeAi": "Chat di studio con l'IA",
    "dataRights.range.action": "Elimina questo intervallo",
    "dataRights.range.needsSelection": "Scegli almeno un tipo di dati e un intervallo di date.",
    "dataRights.allContent.title": "Elimina tutti i miei contenuti e mantieni l'account",
    "dataRights.allContent.body":
      "Rimuove chat, messaggi, allegati e materiali. Accesso, profilo, impostazioni e registrazioni dei consensi restano.",
    "dataRights.allContent.action": "Elimina tutti i miei contenuti",
    "dataRights.account.title": "Elimina il mio account",
    "dataRights.account.body":
      "Rimuove i tuoi contenuti e il tuo accesso. Dopo non potrai più accedere.",
    "dataRights.account.action": "Elimina il mio account",
    "dataRights.confirm.title": "Conferma",
    "dataRights.confirm.typeToConfirm": "Digita {word} per confermare.",
    "dataRights.confirm.word": "ELIMINA",
    "dataRights.confirm.cancel": "Annulla",
    "dataRights.confirm.proceed": "Elimina definitivamente",
    "dataRights.working": "Eliminazione…",
    "dataRights.done": "Eliminazione completata.",
    "dataRights.failed": "Non è stato possibile completare l'eliminazione. Nient'altro è stato modificato.",
    "dataRights.retentionNote":
      "Registrazioni minime e anonimizzate di sicurezza e di rilevanza legale possono essere conservate dove la legge o una pretesa legale lo richiede. Non possiamo promettere che tali registrazioni scompaiano.",
    "dataRights.legalLinks": "Informativa sulla privacy e regole",

    "settings.messaging.title": "Messaggi",
    "settings.messaging.peerNotifications": "Avvisami dei nuovi messaggi",
    "settings.messaging.peerNotificationsHint":
      "Disattivandolo resta il contatore dei non letti, ma non compaiono più gli avvisi.",
    "settings.messaging.browserNotifications": "Mostra le notifiche del browser",
    "settings.messaging.browserNotificationsHint":
      "Il browser chiederà il permesso quando lo attivi.",
    "settings.model.preferred": "Modello preferito",
    "settings.model.assigned": "Assegnato adesso",
    "settings.model.recommendation": "Consigliato dal sistema: {model}",
    "settings.model.assignedDiffers":
      "Per ora il sistema ti ha assegnato un modello più leggero. La tua preferenza resta salvata.",
    "settings.privacy.title": "Privacy e dati",
    "settings.privacy.body": "Vedi cosa è memorizzato su di te ed eliminalo.",
    "settings.privacy.openSystemHealth": "Apri i controlli sui dati",
    "settings.privacy.legal": "Condizioni, privacy, uso accettabile e protezione dei minori",
    "settings.compliance.title": "Le tue accettazioni",
    "settings.compliance.accountType": "Tipo di account",
    "settings.compliance.accountType.student": "Studente",
    "settings.compliance.accountType.teacher": "Insegnante",
    "settings.compliance.accountType.unknown": "Non impostato",
    "settings.compliance.accepted": "Accettato il {date} (versione {version})",
    "settings.compliance.status.active": "Attivo",
    "settings.compliance.status.suspended_pending_review": "Limitato in attesa di revisione",
    "settings.compliance.status.deletion_pending": "Eliminazione in attesa",
    "settings.compliance.strikes": "Avvisi confermati: {count}",
  },
};
