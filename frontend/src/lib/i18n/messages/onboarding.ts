/**
 * onboarding, model readiness, AI availability and storage-capacity
 * translations for the seven approved application languages.
 */
export const onboarding = {
  en: {
    /* ---------------------------------------------- language onboarding --- */
    "onboarding.language.title": "Choose your language",
    "onboarding.language.subtitle":
      "Pick the language you want to study in. You can change it any time from the header.",
    "onboarding.language.hint": "This becomes your default language on every device.",
    "onboarding.language.continue": "Continue",
    "onboarding.language.saving": "Saving…",
    "onboarding.language.saveError": "Could not save your language. Please try again.",
    "onboarding.language.selected": "Selected",
    "onboarding.language.loadError":
      "We could not load your saved settings. Check your connection and try again.",
    "onboarding.language.retry": "Try again",

    /* ------------------------------------------------- model onboarding --- */
    "onboarding.model.title": "Prepare your study AI",
    "onboarding.model.subtitle":
      "Choose the local model for this session. We check with the local backend before enabling AI.",
    "onboarding.model.continueToApp": "Continue to the app",
    "onboarding.model.continueWithoutAi": "Continue without AI",
    "onboarding.model.logout": "Log out",
    "onboarding.model.sessionNote": "AI readiness is checked once per browser session.",

    /* ------------------------------------------------- readiness panel --- */
    "model.label": "Local model",
    "model.placeholder": "Select a model",
    "model.catalogFallback":
      "Showing the built-in model list because the catalogue is unavailable.",
    "model.checkPrepare": "Check / prepare model",
    "model.retry": "Retry",
    "model.chooseAnother": "Choose another model",
    "model.checking": "Checking…",
    "model.progress.indeterminate": "Working…",
    "model.notCheckedYet": "Not checked yet in this session.",

    "model.state.checking_backend": "Contacting the local backend",
    "model.state.checking_resources": "Checking resources",
    "model.state.checking_model": "Checking the model",
    "model.state.queued": "Queued",
    "model.state.downloading": "Downloading the model",
    "model.state.downloaded": "Model downloaded",
    "model.state.loading": "Loading the model",
    "model.state.ready": "AI is ready",
    "model.state.blocked": "AI cannot start right now",
    "model.state.failed": "Model preparation failed",
    "model.state.backend_unavailable": "The local AI backend is unavailable",

    "model.presentOnDisk": "Already downloaded on this machine",
    "model.sharedDownload": "Sharing an existing download — the model file is not duplicated.",
    "model.downloadInProgress": "A download for this model is already running.",
    "model.activeUsers": "Active users: {count}",

    "model.resource.title": "Backend resources",
    "model.resource.gpu": "GPU memory",
    "model.resource.ram": "System memory",
    "model.resource.storage": "Backend disk",
    "model.resource.free": "{percent}% free",
    "model.resource.freeOf": "{free} free of {total}",
    "model.resource.unknown": "Not reported",
    "model.resource.unavailable": "The backend did not report resource measurements.",
    "model.policy.admission":
      "New downloads or model loads start only above {gpu}% GPU, {ram}% memory and {storage}% disk free.",
    "model.policy.runtime":
      "AI is only marked ready above {gpu}% GPU, {ram}% memory and {storage}% disk free.",

    "model.reason.backend_unavailable": "The local AI backend did not respond.",
    "model.reason.model_not_available": "This model is not available on the backend.",
    "model.reason.download_failed": "The model download failed.",
    "model.reason.insufficient_storage": "Not enough free disk space on the backend.",
    "model.reason.insufficient_gpu_vram": "Not enough free GPU memory.",
    "model.reason.insufficient_ram": "Not enough free system memory.",
    "model.reason.model_load_failed": "The model could not be loaded.",
    "model.reason.model_process_limit": "The backend is already running too many model processes.",
    "model.reason.unknown": "The backend reported an unknown problem.",

    "model.warning.cannotStart": "AI cannot be started safely right now",
    "model.warning.resourcePressure":
      "The backend is under resource pressure. Continuing without AI is recommended.",
    "model.ready.title": "AI is ready",
    "model.ready.body": "{model} is loaded and ready for this session.",
    "model.unavailable.title": "AI unavailable",
    "model.unavailable.body":
      "The local AI backend is not reachable. You can keep using everything else and try again later.",
    "model.saveError": "Could not save your model choice.",
    "model.saved": "Model choice saved",

    /* ------------------------------------------------------- AI / no-AI --- */
    "ai.nonAi.badge": "Non-AI mode",
    "ai.unavailable.title": "AI features are switched off",
    "ai.unavailable.body":
      "You are using the app without AI for this session. Study plans, chat and generated exercises are unavailable.",
    "ai.unavailable.retryInSettings": "Retry AI setup in Settings",
    "ai.unavailable.openGate": "Run the AI check again",
    "ai.unavailable.short": "AI is unavailable in this session.",

    /* -------------------------------------------- settings: local model --- */
    "settings.localModel.preferredSaved":
      "Saved as your preferred model. It becomes active once the readiness check succeeds.",
    "settings.localModel.readinessHint":
      "Selecting a model does not activate it. Run the readiness check below.",

    /* ------------------------------------------ settings: storage policy --- */
    "settings.storage.capacity.title": "Automatic capacity cleanup",
    "settings.storage.capacity.body":
      "When platform storage reaches 90% used, the oldest study materials and chat attachments across all accounts are removed until about 80% used. This runs automatically and cannot be switched off.",
    "settings.storage.capacity.excluded":
      "Profile pictures, your account and your preferences are never removed by this cleanup.",
    "settings.storage.capacity.warning": "Platform storage is at {percent}% used",
    "settings.storage.capacity.warningBody":
      "Cleanup of the oldest files across all accounts becomes eligible at 90% used and targets 80%.",
    "settings.storage.capacity.manual": "Run capacity cleanup now",
    "settings.storage.capacity.manualHint":
      "Optional. The cleanup itself only acts when the 90% threshold is reached.",
  },
  de: {
    "onboarding.language.title": "Wähle deine Sprache",
    "onboarding.language.subtitle":
      "Wähle die Sprache, in der du lernen möchtest. Du kannst sie jederzeit über die Kopfzeile ändern.",
    "onboarding.language.hint": "Dies wird deine Standardsprache auf jedem Gerät.",
    "onboarding.language.continue": "Weiter",
    "onboarding.language.saving": "Wird gespeichert…",
    "onboarding.language.saveError":
      "Sprache konnte nicht gespeichert werden. Bitte versuche es erneut.",
    "onboarding.language.selected": "Ausgewählt",
    "onboarding.language.loadError":
      "Wir konnten deine gespeicherten Einstellungen nicht laden. Prüfe deine Verbindung und versuche es erneut.",
    "onboarding.language.retry": "Erneut versuchen",

    "onboarding.model.title": "Bereite deine Lern-KI vor",
    "onboarding.model.subtitle":
      "Wähle das lokale Modell für diese Sitzung. Wir prüfen mit dem lokalen Backend, bevor die KI aktiviert wird.",
    "onboarding.model.continueToApp": "Weiter zur App",
    "onboarding.model.continueWithoutAi": "Ohne KI fortfahren",
    "onboarding.model.logout": "Abmelden",
    "onboarding.model.sessionNote": "Die KI-Bereitschaft wird einmal pro Browsersitzung geprüft.",

    "model.label": "Lokales Modell",
    "model.placeholder": "Modell auswählen",
    "model.catalogFallback":
      "Zeigt die integrierte Modellliste, da der Katalog nicht verfügbar ist.",
    "model.checkPrepare": "Modell prüfen / vorbereiten",
    "model.retry": "Erneut versuchen",
    "model.chooseAnother": "Anderes Modell wählen",
    "model.checking": "Wird geprüft…",
    "model.progress.indeterminate": "Wird bearbeitet…",
    "model.notCheckedYet": "In dieser Sitzung noch nicht geprüft.",

    "model.state.checking_backend": "Verbindung zum lokalen Backend wird hergestellt",
    "model.state.checking_resources": "Ressourcen werden geprüft",
    "model.state.checking_model": "Modell wird geprüft",
    "model.state.queued": "In Warteschlange",
    "model.state.downloading": "Modell wird heruntergeladen",
    "model.state.downloaded": "Modell heruntergeladen",
    "model.state.loading": "Modell wird geladen",
    "model.state.ready": "KI ist bereit",
    "model.state.blocked": "KI kann gerade nicht gestartet werden",
    "model.state.failed": "Modellvorbereitung fehlgeschlagen",
    "model.state.backend_unavailable": "Das lokale KI-Backend ist nicht verfügbar",

    "model.presentOnDisk": "Bereits auf diesem Gerät heruntergeladen",
    "model.sharedDownload":
      "Nutzt einen vorhandenen Download — die Modelldatei wird nicht dupliziert.",
    "model.downloadInProgress": "Für dieses Modell läuft bereits ein Download.",
    "model.activeUsers": "Aktive Nutzer: {count}",

    "model.resource.title": "Backend-Ressourcen",
    "model.resource.gpu": "GPU-Speicher",
    "model.resource.ram": "Arbeitsspeicher",
    "model.resource.storage": "Backend-Speicherplatz",
    "model.resource.free": "{percent}% frei",
    "model.resource.freeOf": "{free} frei von {total}",
    "model.resource.unknown": "Nicht gemeldet",
    "model.resource.unavailable": "Das Backend hat keine Ressourcenmesswerte gemeldet.",
    "model.policy.admission":
      "Neue Downloads oder Modellstarts beginnen nur über {gpu}% GPU, {ram}% Arbeitsspeicher und {storage}% freiem Speicherplatz.",
    "model.policy.runtime":
      "Die KI wird nur über {gpu}% GPU, {ram}% Arbeitsspeicher und {storage}% freiem Speicherplatz als bereit markiert.",

    "model.reason.backend_unavailable": "Das lokale KI-Backend hat nicht geantwortet.",
    "model.reason.model_not_available": "Dieses Modell ist auf dem Backend nicht verfügbar.",
    "model.reason.download_failed": "Der Modell-Download ist fehlgeschlagen.",
    "model.reason.insufficient_storage": "Nicht genug freier Speicherplatz auf dem Backend.",
    "model.reason.insufficient_gpu_vram": "Nicht genug freier GPU-Speicher.",
    "model.reason.insufficient_ram": "Nicht genug freier Arbeitsspeicher.",
    "model.reason.model_load_failed": "Das Modell konnte nicht geladen werden.",
    "model.reason.model_process_limit": "Das Backend führt bereits zu viele Modellprozesse aus.",
    "model.reason.unknown": "Das Backend hat ein unbekanntes Problem gemeldet.",

    "model.warning.cannotStart": "Die KI kann gerade nicht sicher gestartet werden",
    "model.warning.resourcePressure":
      "Das Backend steht unter Ressourcendruck. Es wird empfohlen, ohne KI fortzufahren.",
    "model.ready.title": "KI ist bereit",
    "model.ready.body": "{model} ist geladen und für diese Sitzung bereit.",
    "model.unavailable.title": "KI nicht verfügbar",
    "model.unavailable.body":
      "Das lokale KI-Backend ist nicht erreichbar. Du kannst alles andere weiterhin nutzen und es später erneut versuchen.",
    "model.saveError": "Deine Modellwahl konnte nicht gespeichert werden.",
    "model.saved": "Modellwahl gespeichert",

    "ai.nonAi.badge": "Modus ohne KI",
    "ai.unavailable.title": "KI-Funktionen sind ausgeschaltet",
    "ai.unavailable.body":
      "Du nutzt die App für diese Sitzung ohne KI. Lernpläne, Chat und generierte Übungen sind nicht verfügbar.",
    "ai.unavailable.retryInSettings": "KI-Einrichtung in den Einstellungen erneut versuchen",
    "ai.unavailable.openGate": "KI-Prüfung erneut ausführen",
    "ai.unavailable.short": "Die KI ist in dieser Sitzung nicht verfügbar.",

    "settings.localModel.preferredSaved":
      "Als bevorzugtes Modell gespeichert. Es wird aktiv, sobald die Bereitschaftsprüfung erfolgreich ist.",
    "settings.localModel.readinessHint":
      "Die Auswahl eines Modells aktiviert es nicht. Führe unten die Bereitschaftsprüfung aus.",

    "settings.storage.capacity.title": "Automatische Kapazitätsbereinigung",
    "settings.storage.capacity.body":
      "Sobald der Plattformspeicher zu 90% belegt ist, werden die ältesten Lernmaterialien und Chat-Anhänge über alle Konten hinweg entfernt, bis rund 80% belegt sind. Dies läuft automatisch und kann nicht ausgeschaltet werden.",
    "settings.storage.capacity.excluded":
      "Profilbilder, dein Konto und deine Präferenzen werden durch diese Bereinigung nie entfernt.",
    "settings.storage.capacity.warning": "Der Plattformspeicher ist zu {percent}% belegt",
    "settings.storage.capacity.warningBody":
      "Die Bereinigung der ältesten Dateien über alle Konten hinweg wird ab 90% Belegung zulässig und zielt auf 80%.",
    "settings.storage.capacity.manual": "Kapazitätsbereinigung jetzt ausführen",
    "settings.storage.capacity.manualHint":
      "Optional. Die Bereinigung selbst greift nur, wenn die 90%-Schwelle erreicht ist.",
  },
  gsw: {
    "onboarding.language.title": "Wähl dini Sprach",
    "onboarding.language.subtitle":
      "Wähl d Sprach, i dere du lerne wottsch. Du chasch si jedärziit i de Kopfziile ändere.",
    "onboarding.language.hint": "Das wird dini Standardsprach uf jedem Gerät.",
    "onboarding.language.continue": "Wiiter",
    "onboarding.language.saving": "Wird gspeicheret…",
    "onboarding.language.saveError":
      "Sprach het nid chönne gspeicheret werde. Bitte versuechs nomol.",
    "onboarding.language.selected": "Usgwählt",
    "onboarding.language.loadError":
      "Mir hei dini gspeicherete Iistellige nid chöne lade. Prüef dini Verbindig und versuech s nomal.",
    "onboarding.language.retry": "Nomal versueche",

    "onboarding.model.title": "Bereit dini Lern-KI vor",
    "onboarding.model.subtitle":
      "Wähl s lokale Modell für die Sitzig. Mir überprüefed's mit em lokale Backend, bevor d KI aktiviert wird.",
    "onboarding.model.continueToApp": "Wiiter zur App",
    "onboarding.model.continueWithoutAi": "Ohni KI wiitermache",
    "onboarding.model.logout": "Abmelde",
    "onboarding.model.sessionNote": "D KI-Bereitschaft wird einisch pro Browsersitzig überprüeft.",

    "model.label": "Lokals Modell",
    "model.placeholder": "Modell uswähle",
    "model.catalogFallback": "Zeigt d igebauti Modelllischte, wil dr Katalog nid verfüegbar isch.",
    "model.checkPrepare": "Modell überprüefe / vorbereite",
    "model.retry": "Nomol versueche",
    "model.chooseAnother": "Anders Modell wähle",
    "model.checking": "Wird überprüeft…",
    "model.progress.indeterminate": "Wird bearbeitet…",
    "model.notCheckedYet": "In dere Sitzig no nid überprüeft.",

    "model.state.checking_backend": "Verbindig zum lokale Backend wird ufbaut",
    "model.state.checking_resources": "Ressourcen werded überprüeft",
    "model.state.checking_model": "Modell wird überprüeft",
    "model.state.queued": "In dr Wartechlange",
    "model.state.downloading": "Modell wird abegladen",
    "model.state.downloaded": "Modell abegladen",
    "model.state.loading": "Modell wird glade",
    "model.state.ready": "D KI isch parat",
    "model.state.blocked": "D KI cha grad nid gstartet werde",
    "model.state.failed": "Modellvorbereitig het nid klappt",
    "model.state.backend_unavailable": "S lokale KI-Backend isch nid verfüegbar",

    "model.presentOnDisk": "Scho abegladen uf däm Gerät",
    "model.sharedDownload": "Nutzt en vorhandene Download — d Modelldatei wird nid dupliziert.",
    "model.downloadInProgress": "Für das Modell lauft scho en Download.",
    "model.activeUsers": "Aktivi Nutzer: {count}",

    "model.resource.title": "Backend-Ressourcen",
    "model.resource.gpu": "GPU-Speicher",
    "model.resource.ram": "Arbeitsspeicher",
    "model.resource.storage": "Backend-Speicherplatz",
    "model.resource.free": "{percent}% frei",
    "model.resource.freeOf": "{free} frei vo {total}",
    "model.resource.unknown": "Nid gmeldet",
    "model.resource.unavailable": "S Backend het kei Ressourcemesswärt gmeldet.",
    "model.policy.admission":
      "Nöi Downloads oder Modellstarts started nur über {gpu}% GPU, {ram}% Arbeitsspeicher und {storage}% freiem Speicherplatz.",
    "model.policy.runtime":
      "D KI wird nur über {gpu}% GPU, {ram}% Arbeitsspeicher und {storage}% freiem Speicherplatz als parat markiert.",

    "model.reason.backend_unavailable": "S lokale KI-Backend het nid gantwortet.",
    "model.reason.model_not_available": "Das Modell isch uf em Backend nid verfüegbar.",
    "model.reason.download_failed": "Dr Modell-Download het nid klappt.",
    "model.reason.insufficient_storage": "Nid gnueg freie Speicherplatz uf em Backend.",
    "model.reason.insufficient_gpu_vram": "Nid gnueg freie GPU-Speicher.",
    "model.reason.insufficient_ram": "Nid gnueg freie Arbeitsspeicher.",
    "model.reason.model_load_failed": "S Modell het nid chönne glade werde.",
    "model.reason.model_process_limit": "S Backend lauft scho z viel Modellprozäss.",
    "model.reason.unknown": "S Backend het es unbekannts Problem gmeldet.",

    "model.warning.cannotStart": "D KI cha grad nid sicher gstartet werde",
    "model.warning.resourcePressure":
      "S Backend steit unter Ressourcedruck. Mir empfehled, ohni KI wiiterzmache.",
    "model.ready.title": "D KI isch parat",
    "model.ready.body": "{model} isch glade und parat für die Sitzig.",
    "model.unavailable.title": "KI nid verfüegbar",
    "model.unavailable.body":
      "S lokale KI-Backend isch nid erreichbar. Du chasch alles anders wiiter nutze und's später nomol versueche.",
    "model.saveError": "Dini Modellwahl het nid chönne gspeicheret werde.",
    "model.saved": "Modellwahl gspeicheret",

    "ai.nonAi.badge": "Modus ohni KI",
    "ai.unavailable.title": "D KI-Funktione sind usgschaltet",
    "ai.unavailable.body":
      "Du nutzisch d App für die Sitzig ohni KI. Lernpläni, Chat und generierti Übige sind nid verfüegbar.",
    "ai.unavailable.retryInSettings": "KI-Yrichtig i de Yistellige nomol versueche",
    "ai.unavailable.openGate": "KI-Überprüefig nomol usfüehre",
    "ai.unavailable.short": "D KI isch i dere Sitzig nid verfüegbar.",

    "settings.localModel.preferredSaved":
      "Als bevorzugts Modell gspeicheret. Es wird aktiv, sobald d Bereitschaftsüberprüefig erfolgriich isch.",
    "settings.localModel.readinessHint":
      "S Uswähle vomene Modell aktiviert's nid. Füehr unde d Bereitschaftsüberprüefig us.",

    "settings.storage.capacity.title": "Automatischi Kapazitätsbereinigung",
    "settings.storage.capacity.body":
      "Sobald dr Plattformspeicher zu 90% belegt isch, werded die ältiste Lernmaterialie und Chat-Aahäng über alli Konte hinweg entfernt, bis öppe 80% belegt sind. Das lauft automatisch und cha nid usgschaltet werde.",
    "settings.storage.capacity.excluded":
      "Profilbilder, dis Konto und dini Yistellige werded vo dere Bereinigung nie entfernt.",
    "settings.storage.capacity.warning": "Dr Plattformspeicher isch zu {percent}% belegt",
    "settings.storage.capacity.warningBody":
      "D Bereinigung vo de ältiste Dateie über alli Konte hinweg wird ab 90% Belegig zuegloh und zielt uf 80%.",
    "settings.storage.capacity.manual": "Kapazitätsbereinigung jetzt usfüehre",
    "settings.storage.capacity.manualHint":
      "Optional. D Bereinigung sälber greift nur, wänn d 90%-Schwelle erreicht isch.",
  },
  ru: {
    "onboarding.language.title": "Выберите язык",
    "onboarding.language.subtitle":
      "Выберите язык, на котором хотите учиться. Вы можете изменить его в любое время в шапке страницы.",
    "onboarding.language.hint": "Это станет вашим языком по умолчанию на всех устройствах.",
    "onboarding.language.continue": "Продолжить",
    "onboarding.language.saving": "Сохранение…",
    "onboarding.language.saveError": "Не удалось сохранить язык. Попробуйте ещё раз.",
    "onboarding.language.selected": "Выбрано",
    "onboarding.language.loadError":
      "Не удалось загрузить сохранённые настройки. Проверьте подключение и попробуйте снова.",
    "onboarding.language.retry": "Попробовать снова",

    "onboarding.model.title": "Подготовьте свой учебный ИИ",
    "onboarding.model.subtitle":
      "Выберите локальную модель для этой сессии. Мы проверяем это через локальный бэкенд перед включением ИИ.",
    "onboarding.model.continueToApp": "Перейти в приложение",
    "onboarding.model.continueWithoutAi": "Продолжить без ИИ",
    "onboarding.model.logout": "Выйти",
    "onboarding.model.sessionNote": "Готовность ИИ проверяется один раз за сессию браузера.",

    "model.label": "Локальная модель",
    "model.placeholder": "Выберите модель",
    "model.catalogFallback": "Показан встроенный список моделей, так как каталог недоступен.",
    "model.checkPrepare": "Проверить / подготовить модель",
    "model.retry": "Повторить",
    "model.chooseAnother": "Выбрать другую модель",
    "model.checking": "Проверка…",
    "model.progress.indeterminate": "Выполняется…",
    "model.notCheckedYet": "Ещё не проверено в этой сессии.",

    "model.state.checking_backend": "Обращение к локальному бэкенду",
    "model.state.checking_resources": "Проверка ресурсов",
    "model.state.checking_model": "Проверка модели",
    "model.state.queued": "В очереди",
    "model.state.downloading": "Загрузка модели",
    "model.state.downloaded": "Модель загружена",
    "model.state.loading": "Загрузка модели в память",
    "model.state.ready": "ИИ готов",
    "model.state.blocked": "ИИ сейчас не может запуститься",
    "model.state.failed": "Не удалось подготовить модель",
    "model.state.backend_unavailable": "Локальный бэкенд ИИ недоступен",

    "model.presentOnDisk": "Уже загружено на этом устройстве",
    "model.sharedDownload": "Используется существующая загрузка — файл модели не дублируется.",
    "model.downloadInProgress": "Загрузка этой модели уже выполняется.",
    "model.activeUsers": "Активных пользователей: {count}",

    "model.resource.title": "Ресурсы бэкенда",
    "model.resource.gpu": "Память GPU",
    "model.resource.ram": "Оперативная память",
    "model.resource.storage": "Диск бэкенда",
    "model.resource.free": "{percent}% свободно",
    "model.resource.freeOf": "свободно {free} из {total}",
    "model.resource.unknown": "Не сообщено",
    "model.resource.unavailable": "Бэкенд не предоставил данные об измерении ресурсов.",
    "model.policy.admission":
      "Новые загрузки или запуск моделей начинаются только при свободных {gpu}% GPU, {ram}% памяти и {storage}% диска.",
    "model.policy.runtime":
      "ИИ отмечается как готовый только при свободных {gpu}% GPU, {ram}% памяти и {storage}% диска.",

    "model.reason.backend_unavailable": "Локальный бэкенд ИИ не ответил.",
    "model.reason.model_not_available": "Эта модель недоступна на бэкенде.",
    "model.reason.download_failed": "Загрузка модели не удалась.",
    "model.reason.insufficient_storage": "Недостаточно свободного места на диске бэкенда.",
    "model.reason.insufficient_gpu_vram": "Недостаточно свободной памяти GPU.",
    "model.reason.insufficient_ram": "Недостаточно свободной оперативной памяти.",
    "model.reason.model_load_failed": "Не удалось загрузить модель.",
    "model.reason.model_process_limit": "Бэкенд уже запустил слишком много процессов моделей.",
    "model.reason.unknown": "Бэкенд сообщил о неизвестной проблеме.",

    "model.warning.cannotStart": "Сейчас ИИ нельзя безопасно запустить",
    "model.warning.resourcePressure":
      "Бэкенд испытывает нехватку ресурсов. Рекомендуется продолжить без ИИ.",
    "model.ready.title": "ИИ готов",
    "model.ready.body": "{model} загружена и готова для этой сессии.",
    "model.unavailable.title": "ИИ недоступен",
    "model.unavailable.body":
      "Локальный бэкенд ИИ недоступен. Вы можете продолжать пользоваться всем остальным и повторить попытку позже.",
    "model.saveError": "Не удалось сохранить выбор модели.",
    "model.saved": "Выбор модели сохранён",

    "ai.nonAi.badge": "Режим без ИИ",
    "ai.unavailable.title": "Функции ИИ отключены",
    "ai.unavailable.body":
      "Вы используете приложение без ИИ в этой сессии. Учебные планы, чат и сгенерированные упражнения недоступны.",
    "ai.unavailable.retryInSettings": "Повторить настройку ИИ в настройках",
    "ai.unavailable.openGate": "Повторить проверку ИИ",
    "ai.unavailable.short": "ИИ недоступен в этой сессии.",

    "settings.localModel.preferredSaved":
      "Сохранено как предпочитаемая модель. Она станет активной после успешной проверки готовности.",
    "settings.localModel.readinessHint":
      "Выбор модели не активирует её. Запустите проверку готовности ниже.",

    "settings.storage.capacity.title": "Автоматическая очистка ёмкости",
    "settings.storage.capacity.body":
      "Когда использование хранилища платформы достигает 90%, самые старые учебные материалы и вложения чатов по всем аккаунтам удаляются, пока использование не составит около 80%. Это выполняется автоматически и не может быть отключено.",
    "settings.storage.capacity.excluded":
      "Фотографии профиля, ваш аккаунт и ваши настройки никогда не удаляются этой очисткой.",
    "settings.storage.capacity.warning": "Хранилище платформы использовано на {percent}%",
    "settings.storage.capacity.warningBody":
      "Очистка самых старых файлов по всем аккаунтам становится допустимой при 90% использования и нацелена на 80%.",
    "settings.storage.capacity.manual": "Запустить очистку ёмкости сейчас",
    "settings.storage.capacity.manualHint":
      "Необязательно. Сама очистка срабатывает только при достижении порога в 90%.",
  },
  es: {
    "onboarding.language.title": "Elige tu idioma",
    "onboarding.language.subtitle":
      "Elige el idioma en el que quieres estudiar. Puedes cambiarlo en cualquier momento desde la cabecera.",
    "onboarding.language.hint": "Este será tu idioma predeterminado en todos los dispositivos.",
    "onboarding.language.continue": "Continuar",
    "onboarding.language.saving": "Guardando…",
    "onboarding.language.saveError": "No se pudo guardar tu idioma. Inténtalo de nuevo.",
    "onboarding.language.selected": "Seleccionado",
    "onboarding.language.loadError":
      "No pudimos cargar tus ajustes guardados. Comprueba tu conexión e inténtalo de nuevo.",
    "onboarding.language.retry": "Intentar de nuevo",

    "onboarding.model.title": "Prepara tu IA de estudio",
    "onboarding.model.subtitle":
      "Elige el modelo local para esta sesión. Lo comprobamos con el backend local antes de activar la IA.",
    "onboarding.model.continueToApp": "Continuar a la aplicación",
    "onboarding.model.continueWithoutAi": "Continuar sin IA",
    "onboarding.model.logout": "Cerrar sesión",
    "onboarding.model.sessionNote":
      "La disponibilidad de la IA se comprueba una vez por sesión del navegador.",

    "model.label": "Modelo local",
    "model.placeholder": "Selecciona un modelo",
    "model.catalogFallback":
      "Se muestra la lista de modelos integrada porque el catálogo no está disponible.",
    "model.checkPrepare": "Comprobar / preparar modelo",
    "model.retry": "Reintentar",
    "model.chooseAnother": "Elegir otro modelo",
    "model.checking": "Comprobando…",
    "model.progress.indeterminate": "Trabajando…",
    "model.notCheckedYet": "Aún no comprobado en esta sesión.",

    "model.state.checking_backend": "Contactando con el backend local",
    "model.state.checking_resources": "Comprobando recursos",
    "model.state.checking_model": "Comprobando el modelo",
    "model.state.queued": "En cola",
    "model.state.downloading": "Descargando el modelo",
    "model.state.downloaded": "Modelo descargado",
    "model.state.loading": "Cargando el modelo",
    "model.state.ready": "La IA está lista",
    "model.state.blocked": "La IA no puede iniciarse ahora mismo",
    "model.state.failed": "Error al preparar el modelo",
    "model.state.backend_unavailable": "El backend local de IA no está disponible",

    "model.presentOnDisk": "Ya descargado en este equipo",
    "model.sharedDownload":
      "Se comparte una descarga existente — el archivo del modelo no se duplica.",
    "model.downloadInProgress": "Ya hay una descarga en curso para este modelo.",
    "model.activeUsers": "Usuarios activos: {count}",

    "model.resource.title": "Recursos del backend",
    "model.resource.gpu": "Memoria de la GPU",
    "model.resource.ram": "Memoria del sistema",
    "model.resource.storage": "Disco del backend",
    "model.resource.free": "{percent}% libre",
    "model.resource.freeOf": "{free} libres de {total}",
    "model.resource.unknown": "No indicado",
    "model.resource.unavailable": "El backend no informó de mediciones de recursos.",
    "model.policy.admission":
      "Las nuevas descargas o cargas de modelos solo comienzan por encima de {gpu}% de GPU, {ram}% de memoria y {storage}% de disco libres.",
    "model.policy.runtime":
      "La IA solo se marca como lista por encima de {gpu}% de GPU, {ram}% de memoria y {storage}% de disco libres.",

    "model.reason.backend_unavailable": "El backend local de IA no respondió.",
    "model.reason.model_not_available": "Este modelo no está disponible en el backend.",
    "model.reason.download_failed": "La descarga del modelo falló.",
    "model.reason.insufficient_storage": "No hay suficiente espacio libre en disco en el backend.",
    "model.reason.insufficient_gpu_vram": "No hay suficiente memoria de GPU libre.",
    "model.reason.insufficient_ram": "No hay suficiente memoria del sistema libre.",
    "model.reason.model_load_failed": "No se pudo cargar el modelo.",
    "model.reason.model_process_limit":
      "El backend ya está ejecutando demasiados procesos de modelos.",
    "model.reason.unknown": "El backend informó de un problema desconocido.",

    "model.warning.cannotStart": "La IA no puede iniciarse de forma segura ahora mismo",
    "model.warning.resourcePressure":
      "El backend está bajo presión de recursos. Se recomienda continuar sin IA.",
    "model.ready.title": "La IA está lista",
    "model.ready.body": "{model} está cargado y listo para esta sesión.",
    "model.unavailable.title": "IA no disponible",
    "model.unavailable.body":
      "No se puede acceder al backend local de IA. Puedes seguir usando todo lo demás e intentarlo de nuevo más tarde.",
    "model.saveError": "No se pudo guardar tu elección de modelo.",
    "model.saved": "Elección de modelo guardada",

    "ai.nonAi.badge": "Modo sin IA",
    "ai.unavailable.title": "Las funciones de IA están desactivadas",
    "ai.unavailable.body":
      "Estás usando la aplicación sin IA en esta sesión. Los planes de estudio, el chat y los ejercicios generados no están disponibles.",
    "ai.unavailable.retryInSettings": "Reintentar la configuración de IA en Ajustes",
    "ai.unavailable.openGate": "Volver a ejecutar la comprobación de IA",
    "ai.unavailable.short": "La IA no está disponible en esta sesión.",

    "settings.localModel.preferredSaved":
      "Guardado como tu modelo preferido. Se activará una vez que la comprobación de disponibilidad tenga éxito.",
    "settings.localModel.readinessHint":
      "Seleccionar un modelo no lo activa. Ejecuta la comprobación de disponibilidad de abajo.",

    "settings.storage.capacity.title": "Limpieza automática de capacidad",
    "settings.storage.capacity.body":
      "Cuando el almacenamiento de la plataforma alcanza el 90% de uso, se eliminan los materiales de estudio y los archivos adjuntos de chat más antiguos de todas las cuentas hasta aproximadamente el 80% de uso. Esto se ejecuta automáticamente y no se puede desactivar.",
    "settings.storage.capacity.excluded":
      "Las fotos de perfil, tu cuenta y tus preferencias nunca se eliminan con esta limpieza.",
    "settings.storage.capacity.warning":
      "El almacenamiento de la plataforma está al {percent}% de uso",
    "settings.storage.capacity.warningBody":
      "La limpieza de los archivos más antiguos de todas las cuentas se habilita al 90% de uso y apunta al 80%.",
    "settings.storage.capacity.manual": "Ejecutar limpieza de capacidad ahora",
    "settings.storage.capacity.manualHint":
      "Opcional. La limpieza solo actúa cuando se alcanza el umbral del 90%.",
  },
  fr: {
    "onboarding.language.title": "Choisissez votre langue",
    "onboarding.language.subtitle":
      "Choisissez la langue dans laquelle vous voulez étudier. Vous pouvez la changer à tout moment depuis l'en-tête.",
    "onboarding.language.hint": "Cela devient votre langue par défaut sur chaque appareil.",
    "onboarding.language.continue": "Continuer",
    "onboarding.language.saving": "Enregistrement…",
    "onboarding.language.saveError": "Impossible d'enregistrer votre langue. Veuillez réessayer.",
    "onboarding.language.selected": "Sélectionné",
    "onboarding.language.loadError":
      "Nous n'avons pas pu charger vos réglages enregistrés. Vérifiez votre connexion et réessayez.",
    "onboarding.language.retry": "Réessayer",

    "onboarding.model.title": "Préparez votre IA d'étude",
    "onboarding.model.subtitle":
      "Choisissez le modèle local pour cette session. Nous vérifions auprès du backend local avant d'activer l'IA.",
    "onboarding.model.continueToApp": "Continuer vers l'application",
    "onboarding.model.continueWithoutAi": "Continuer sans IA",
    "onboarding.model.logout": "Se déconnecter",
    "onboarding.model.sessionNote":
      "La disponibilité de l'IA est vérifiée une fois par session de navigateur.",

    "model.label": "Modèle local",
    "model.placeholder": "Sélectionner un modèle",
    "model.catalogFallback":
      "Affichage de la liste de modèles intégrée car le catalogue n'est pas disponible.",
    "model.checkPrepare": "Vérifier / préparer le modèle",
    "model.retry": "Réessayer",
    "model.chooseAnother": "Choisir un autre modèle",
    "model.checking": "Vérification…",
    "model.progress.indeterminate": "Traitement en cours…",
    "model.notCheckedYet": "Pas encore vérifié dans cette session.",

    "model.state.checking_backend": "Connexion au backend local en cours",
    "model.state.checking_resources": "Vérification des ressources",
    "model.state.checking_model": "Vérification du modèle",
    "model.state.queued": "En file d'attente",
    "model.state.downloading": "Téléchargement du modèle",
    "model.state.downloaded": "Modèle téléchargé",
    "model.state.loading": "Chargement du modèle",
    "model.state.ready": "L'IA est prête",
    "model.state.blocked": "L'IA ne peut pas démarrer pour le moment",
    "model.state.failed": "Échec de la préparation du modèle",
    "model.state.backend_unavailable": "Le backend d'IA local n'est pas disponible",

    "model.presentOnDisk": "Déjà téléchargé sur cet appareil",
    "model.sharedDownload":
      "Partage d'un téléchargement existant — le fichier du modèle n'est pas dupliqué.",
    "model.downloadInProgress": "Un téléchargement pour ce modèle est déjà en cours.",
    "model.activeUsers": "Utilisateurs actifs : {count}",

    "model.resource.title": "Ressources du backend",
    "model.resource.gpu": "Mémoire GPU",
    "model.resource.ram": "Mémoire système",
    "model.resource.storage": "Disque du backend",
    "model.resource.free": "{percent}% libre",
    "model.resource.freeOf": "{free} libres sur {total}",
    "model.resource.unknown": "Non communiqué",
    "model.resource.unavailable": "Le backend n'a pas communiqué de mesures de ressources.",
    "model.policy.admission":
      "Les nouveaux téléchargements ou chargements de modèles ne démarrent qu'au-dessus de {gpu}% de GPU, {ram}% de mémoire et {storage}% de disque libres.",
    "model.policy.runtime":
      "L'IA n'est marquée comme prête qu'au-dessus de {gpu}% de GPU, {ram}% de mémoire et {storage}% de disque libres.",

    "model.reason.backend_unavailable": "Le backend d'IA local n'a pas répondu.",
    "model.reason.model_not_available": "Ce modèle n'est pas disponible sur le backend.",
    "model.reason.download_failed": "Le téléchargement du modèle a échoué.",
    "model.reason.insufficient_storage": "Espace disque libre insuffisant sur le backend.",
    "model.reason.insufficient_gpu_vram": "Mémoire GPU libre insuffisante.",
    "model.reason.insufficient_ram": "Mémoire système libre insuffisante.",
    "model.reason.model_load_failed": "Le modèle n'a pas pu être chargé.",
    "model.reason.model_process_limit": "Le backend exécute déjà trop de processus de modèles.",
    "model.reason.unknown": "Le backend a signalé un problème inconnu.",

    "model.warning.cannotStart": "L'IA ne peut pas être démarrée en toute sécurité pour le moment",
    "model.warning.resourcePressure":
      "Le backend subit une pression sur les ressources. Il est recommandé de continuer sans IA.",
    "model.ready.title": "L'IA est prête",
    "model.ready.body": "{model} est chargé et prêt pour cette session.",
    "model.unavailable.title": "IA indisponible",
    "model.unavailable.body":
      "Le backend d'IA local n'est pas joignable. Vous pouvez continuer à utiliser tout le reste et réessayer plus tard.",
    "model.saveError": "Impossible d'enregistrer votre choix de modèle.",
    "model.saved": "Choix de modèle enregistré",

    "ai.nonAi.badge": "Mode sans IA",
    "ai.unavailable.title": "Les fonctionnalités d'IA sont désactivées",
    "ai.unavailable.body":
      "Vous utilisez l'application sans IA pour cette session. Les plans d'étude, le chat et les exercices générés ne sont pas disponibles.",
    "ai.unavailable.retryInSettings": "Réessayer la configuration de l'IA dans les Paramètres",
    "ai.unavailable.openGate": "Relancer la vérification de l'IA",
    "ai.unavailable.short": "L'IA n'est pas disponible pour cette session.",

    "settings.localModel.preferredSaved":
      "Enregistré comme votre modèle préféré. Il devient actif dès que la vérification de disponibilité réussit.",
    "settings.localModel.readinessHint":
      "Sélectionner un modèle ne l'active pas. Lancez la vérification de disponibilité ci-dessous.",

    "settings.storage.capacity.title": "Nettoyage automatique de la capacité",
    "settings.storage.capacity.body":
      "Lorsque le stockage de la plateforme atteint 90% d'utilisation, les matériels d'étude et pièces jointes de chat les plus anciens sont supprimés sur tous les comptes jusqu'à environ 80% d'utilisation. Cela s'exécute automatiquement et ne peut pas être désactivé.",
    "settings.storage.capacity.excluded":
      "Les photos de profil, votre compte et vos préférences ne sont jamais supprimés par ce nettoyage.",
    "settings.storage.capacity.warning": "Le stockage de la plateforme est utilisé à {percent}%",
    "settings.storage.capacity.warningBody":
      "Le nettoyage des fichiers les plus anciens sur tous les comptes devient possible à 90% d'utilisation et vise 80%.",
    "settings.storage.capacity.manual": "Lancer le nettoyage de capacité maintenant",
    "settings.storage.capacity.manualHint":
      "Facultatif. Le nettoyage lui-même n'agit que lorsque le seuil de 90% est atteint.",
  },
  it: {
    "onboarding.language.title": "Scegli la tua lingua",
    "onboarding.language.subtitle":
      "Scegli la lingua in cui vuoi studiare. Puoi cambiarla in qualsiasi momento dall'intestazione.",
    "onboarding.language.hint": "Questa diventa la tua lingua predefinita su ogni dispositivo.",
    "onboarding.language.continue": "Continua",
    "onboarding.language.saving": "Salvataggio…",
    "onboarding.language.saveError": "Impossibile salvare la lingua. Riprova.",
    "onboarding.language.selected": "Selezionata",
    "onboarding.language.loadError":
      "Non è stato possibile caricare le tue impostazioni salvate. Controlla la connessione e riprova.",
    "onboarding.language.retry": "Riprova",

    "onboarding.model.title": "Prepara la tua IA di studio",
    "onboarding.model.subtitle":
      "Scegli il modello locale per questa sessione. Verifichiamo con il backend locale prima di attivare l'IA.",
    "onboarding.model.continueToApp": "Continua verso l'app",
    "onboarding.model.continueWithoutAi": "Continua senza IA",
    "onboarding.model.logout": "Esci",
    "onboarding.model.sessionNote":
      "La disponibilità dell'IA viene verificata una volta per sessione del browser.",

    "model.label": "Modello locale",
    "model.placeholder": "Seleziona un modello",
    "model.catalogFallback":
      "Viene mostrato l'elenco di modelli integrato perché il catalogo non è disponibile.",
    "model.checkPrepare": "Verifica / prepara il modello",
    "model.retry": "Riprova",
    "model.chooseAnother": "Scegli un altro modello",
    "model.checking": "Verifica in corso…",
    "model.progress.indeterminate": "In elaborazione…",
    "model.notCheckedYet": "Non ancora verificato in questa sessione.",

    "model.state.checking_backend": "Contatto con il backend locale in corso",
    "model.state.checking_resources": "Verifica delle risorse",
    "model.state.checking_model": "Verifica del modello",
    "model.state.queued": "In coda",
    "model.state.downloading": "Download del modello",
    "model.state.downloaded": "Modello scaricato",
    "model.state.loading": "Caricamento del modello",
    "model.state.ready": "L'IA è pronta",
    "model.state.blocked": "L'IA non può avviarsi al momento",
    "model.state.failed": "Preparazione del modello non riuscita",
    "model.state.backend_unavailable": "Il backend IA locale non è disponibile",

    "model.presentOnDisk": "Già scaricato su questo dispositivo",
    "model.sharedDownload":
      "Condivisione di un download esistente — il file del modello non viene duplicato.",
    "model.downloadInProgress": "Un download per questo modello è già in corso.",
    "model.activeUsers": "Utenti attivi: {count}",

    "model.resource.title": "Risorse del backend",
    "model.resource.gpu": "Memoria GPU",
    "model.resource.ram": "Memoria di sistema",
    "model.resource.storage": "Disco del backend",
    "model.resource.free": "{percent}% libero",
    "model.resource.freeOf": "{free} liberi su {total}",
    "model.resource.unknown": "Non comunicato",
    "model.resource.unavailable": "Il backend non ha comunicato misurazioni delle risorse.",
    "model.policy.admission":
      "Nuovi download o caricamenti di modelli partono solo sopra il {gpu}% di GPU, {ram}% di memoria e {storage}% di disco liberi.",
    "model.policy.runtime":
      "L'IA viene contrassegnata come pronta solo sopra il {gpu}% di GPU, {ram}% di memoria e {storage}% di disco liberi.",

    "model.reason.backend_unavailable": "Il backend IA locale non ha risposto.",
    "model.reason.model_not_available": "Questo modello non è disponibile sul backend.",
    "model.reason.download_failed": "Il download del modello non è riuscito.",
    "model.reason.insufficient_storage": "Spazio libero su disco insufficiente sul backend.",
    "model.reason.insufficient_gpu_vram": "Memoria GPU libera insufficiente.",
    "model.reason.insufficient_ram": "Memoria di sistema libera insufficiente.",
    "model.reason.model_load_failed": "Impossibile caricare il modello.",
    "model.reason.model_process_limit": "Il backend sta già eseguendo troppi processi di modelli.",
    "model.reason.unknown": "Il backend ha segnalato un problema sconosciuto.",

    "model.warning.cannotStart": "L'IA non può essere avviata in sicurezza al momento",
    "model.warning.resourcePressure":
      "Il backend è sotto pressione di risorse. Si consiglia di continuare senza IA.",
    "model.ready.title": "L'IA è pronta",
    "model.ready.body": "{model} è caricato e pronto per questa sessione.",
    "model.unavailable.title": "IA non disponibile",
    "model.unavailable.body":
      "Il backend IA locale non è raggiungibile. Puoi continuare a usare tutto il resto e riprovare più tardi.",
    "model.saveError": "Impossibile salvare la scelta del modello.",
    "model.saved": "Scelta del modello salvata",

    "ai.nonAi.badge": "Modalità senza IA",
    "ai.unavailable.title": "Le funzionalità IA sono disattivate",
    "ai.unavailable.body":
      "Stai usando l'app senza IA per questa sessione. Piani di studio, chat ed esercizi generati non sono disponibili.",
    "ai.unavailable.retryInSettings": "Riprova la configurazione IA nelle Impostazioni",
    "ai.unavailable.openGate": "Esegui di nuovo il controllo dell'IA",
    "ai.unavailable.short": "L'IA non è disponibile in questa sessione.",

    "settings.localModel.preferredSaved":
      "Salvato come modello preferito. Diventa attivo non appena il controllo di disponibilità ha esito positivo.",
    "settings.localModel.readinessHint":
      "Selezionare un modello non lo attiva. Esegui qui sotto il controllo di disponibilità.",

    "settings.storage.capacity.title": "Pulizia automatica della capacità",
    "settings.storage.capacity.body":
      "Quando l'archiviazione della piattaforma raggiunge il 90% di utilizzo, i materiali di studio e gli allegati della chat più vecchi di tutti gli account vengono rimossi fino a circa l'80% di utilizzo. Questo avviene automaticamente e non può essere disattivato.",
    "settings.storage.capacity.excluded":
      "Le immagini del profilo, il tuo account e le tue preferenze non vengono mai rimossi da questa pulizia.",
    "settings.storage.capacity.warning":
      "L'archiviazione della piattaforma è al {percent}% di utilizzo",
    "settings.storage.capacity.warningBody":
      "La pulizia dei file più vecchi su tutti gli account diventa possibile al 90% di utilizzo e punta all'80%.",
    "settings.storage.capacity.manual": "Esegui ora la pulizia della capacità",
    "settings.storage.capacity.manualHint":
      "Facoltativo. La pulizia stessa agisce solo al raggiungimento della soglia del 90%.",
  },
} as const;
