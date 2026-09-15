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
    "model.catalogFallback": "Showing the built-in model list because the catalogue is unavailable.",
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
} as const;
