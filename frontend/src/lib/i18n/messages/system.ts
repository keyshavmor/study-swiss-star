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
};
