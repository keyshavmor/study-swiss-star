# User Preferences Contract

Status: CURRENT — LIVE/CODE VERIFIED 2026-09-15

`public.user_preferences` is keyed by `user_id`, protected by own-row CRUD, and stores `academic_year` plus JSONB `preferences`. Current defaults include `app_language: en`, `language_onboarding_completed: false`, assistant audio enabled, and autoplay disabled.

The frontend normalizes preferences in `frontend/src/lib/account-data.ts`. Supported application languages are exactly `en`, `de`, `gsw`, `ru`, `es`, `fr`, and `it`.

For subject chat, `message_then_app` is now enforced at the server boundary: confident detection of the current message wins, otherwise selected app language wins, otherwise English. FastAPI receives the explicit result. Interface language, message language, response language, and TTS locale remain distinct.

Storage capacity cleanup is global and scheduled; `auto_storage_cleanup` is no longer a live default
or a current UI control. Other preferences remain UI/client concerns unless an implemented backend
path explicitly consumes them.
