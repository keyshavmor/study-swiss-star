/**
 * Peer-to-peer messaging, attachments and content-safety translations.
 * English is the source of truth for the key set.
 */
export const messaging = {
  en: {
    "nav.messages": "Messages",
    "nav.messagesUnread": "{count} unread messages",

    "messages.title": "Messages",
    "messages.subtitle": "Write to classmates and teachers you know by username.",
    "messages.empty.title": "No conversations yet",
    "messages.empty.body": "Start a chat by entering the exact username of the person you know.",
    "messages.new": "New conversation",
    "messages.usernameLabel": "Exact username",
    "messages.usernamePlaceholder": "e.g. lea.muster",
    "messages.usernameHint":
      "For safety, people can only be found by their exact username. There is no searchable list of pupils.",
    "messages.start": "Start chat",
    "messages.starting": "Opening…",
    "messages.notFound": "No user with that exact username.",
    "messages.selfNotAllowed": "You cannot start a conversation with yourself.",
    "messages.startFailed": "The conversation could not be opened. Please try again.",
    "messages.selectConversation": "Choose a conversation",
    "messages.backToList": "All conversations",
    "messages.unreadBadge": "{count} new",
    "messages.you": "You",
    "messages.loadFailed": "Messages could not be loaded. Please try again.",
    "messages.emptyThread": "No messages yet. Say hello.",
    "messages.composerPlaceholder": "Write a message…",
    "messages.send": "Send",
    "messages.sending": "Checking and sending…",
    "messages.persistNote":
      "Messages are stored in your account. If you are signed out, new messages simply appear as unread the next time you sign in — the app does not send phone notifications.",

    "messages.attach": "Add file",
    "messages.attach.allowed": "PDF, DOC, DOCX, JPEG, PNG or WEBP, up to 250 KB after processing.",
    "messages.attach.processing": "Preparing file…",
    "messages.attach.compressed": "Compressed from {from} to {to}.",
    "messages.attach.remove": "Remove file",
    "messages.attach.error.mime_not_allowed": "This file type is not allowed.",
    "messages.attach.error.document_too_large":
      "This document is larger than 250 KB. Please attach a smaller file — we do not cut documents short.",
    "messages.attach.error.image_compression_failed":
      "We could not compress this image below 250 KB. Please attach a smaller image.",
    "messages.attach.error.processing_failed": "This file could not be prepared. Please try again.",
    "messages.attach.scanPending": "Waiting for the safety check",
    "messages.attach.download": "Open file",

    "messages.notifications.title": "Message notifications",
    "messages.notifications.enable": "Allow browser notifications",
    "messages.notifications.enabled": "Browser notifications are on.",
    "messages.notifications.blocked":
      "Your browser has blocked notifications for this site. You can change this in the browser settings.",
    "messages.notifications.denied": "Notifications were not allowed.",
    "messages.notifications.unsupported": "This browser does not support notifications.",
    "messages.notifications.incoming": "New message from {name}",

    /* ------------------------------------------------------ safety copy --- */
    "safety.unavailable.title": "Safety check unavailable — message not sent",
    "safety.unavailable.body":
      "Messages and AI answers are checked for child safety before they are delivered. That check is not reachable right now, so nothing was sent. Please try again later.",
    "safety.unavailable.retry": "Try again",
    "safety.checking": "Running the safety check…",
    "safety.blocked.title": "This message was blocked",
    "safety.blocked.body":
      "The content breaks the Acceptable Use and Child Safety rules, so it was not sent. Please keep conversations respectful and age-appropriate.",
    "safety.blocked.strike": "This is confirmed warning {count}.",
    "safety.blocked.readPolicy": "Read the rules",
    "safety.suspended.title": "Your account access is now limited",
    "safety.suspended.body":
      "A second confirmed violation was recorded. A person will review the case. Your account has not been deleted.",
    "safety.suspended.open": "See details",
    "safety.aiBlocked.title": "This request was not sent to the AI",
    "safety.aiBlocked.body":
      "The safety check did not allow this request. Please rephrase it in a school-appropriate way.",
    "safety.category.sexual_explicit": "Sexual or explicit content",
    "safety.category.sexual_minor": "Sexual content involving minors",
    "safety.category.graphic_violence": "Graphic violence",
    "safety.category.self_harm": "Self-harm",
    "safety.category.harassment_bullying": "Bullying or harassment",
    "safety.category.hate": "Hate speech",
    "safety.category.illegal_instructions": "Instructions for illegal acts",
    "safety.category.drugs_instructional": "Drug instructions",
    "safety.category.weapons_instructional": "Weapon instructions",
    "safety.category.extremism_glorification": "Glorifying extremism",
    "safety.category.personal_data_exposure": "Exposing personal data",
    "safety.category.other": "Other safety concern",
  },
};
