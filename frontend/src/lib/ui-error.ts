/**
 * Marker for errors whose message is already a localized, user-facing string.
 *
 * Raw provider/backend errors are English and must never be shown in the UI
 * (they would leak stray English into a translated screen). Only messages
 * wrapped in `UiError` may be displayed; everything else is logged and
 * replaced by a localized generic message.
 */
export class UiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UiError";
  }
}

export function isUiError(value: unknown): value is UiError {
  return value instanceof UiError;
}

/** The localized message to show, or `null` when only a generic one is safe. */
export function localizedMessage(value: unknown): string | null {
  return isUiError(value) ? value.message : null;
}
