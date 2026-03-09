# LiS-Chatbot — Missing Features & Improvements

> **Last updated:** 2026-03-09

---

## ✅ What's Already Solid

- Chat API with OpenAI GPT-4o + tool calling (query, insert, update, delete)
- Speech-to-Text (Deepgram) + Text-to-Speech (ElevenLabs)
- Supabase auth, database integration, views
- RBAC (role-based access control)
- Rate limiting, validation, error handling, audit logging
- Chat persistence (Supabase), sidebar, search, export
- Dark/light mode, mobile-responsive design
- E2E tests (Playwright), Storybook
- Sentry error tracking, middleware tracing

---

## 🔴 Missing / Incomplete

### 1. `ChatInterface.tsx` is still massive (2,184 lines)

Refactoring started — `MarkdownRenderer`, `ChatSidebar`, `ChatHeader`, `ChatInput`, `ChatMessageList`, `VoiceOverlay`, and `MessageActions` were extracted — but the main file is still **78 KB / 2,184 lines**. Audio recording, voice activity detection, playback logic, and core state management remain monolithic. Further extraction into custom hooks (`useChat`, `useVoiceMode`, `useAudioPlayback`) is needed.

### 2. Remaining `any` types

Work began on replacing `any` types, but several remain:

- `ChatInterfaceProps.user?: any`
- `deleteRow` filters param: `Record<string, any>`
- `queryTableWithJoin` filters param: `Record<string, any>`
- Scattered `any` in event handlers and MediaRecorder callbacks

### 3. No unit tests

E2E tests (Playwright) and integration test scripts exist, but **no unit tests** for core logic modules (`inference.ts`, `tool-handlers.ts`, `validation.ts`, `supabase-query.ts`). Vitest is already in devDependencies.

### 4. No file upload / image handling in chat

The schema references `t_project_note_media` (with `image_base64`) and `t_inspection_photos` (with URLs), but there's **no file upload UI or image preview** in the chat interface.

### 5. No real-time / live updates

No Supabase Realtime subscriptions. Chat data and project changes don't push to the client — users must refresh to see updates from other users.

### 6. No user management UI

`t_users` table with roles (Admin/Secretary/Planner/Supervisor/Worker) and RBAC logic exist, but there's **no admin panel** to manage users, assign roles, or view activity.

### 7. No multi-language support (i18n)

Everything is hardcoded in German. No i18n framework (e.g., `next-intl`) is in place.

### 8. No PWA setup despite `next-pwa` dependency

`next-pwa` is in dependencies, but there's no `manifest.json`, no service worker config, and no offline support.

### 9. No notification system

No push notifications, in-app notifications, or email alerts for project assignments, inspection reminders, etc.

### 10. Middleware only adds tracing headers

The middleware injects request/correlation IDs but performs **no auth protection** on routes. `auth-middleware.ts` exists as a lib but isn't integrated into the Next.js middleware.

### 11. No data export / reporting beyond chat export

Chat export exists, but no ability to **export project data, reports, or KPIs** as PDF/CSV.

### 12. Missing dashboard / landing page

`app/page.tsx` is the chat page. There's no **dashboard view** with project summaries, upcoming inspections, or KPIs at a glance.

---

## 🟡 Nice-to-Haves

| Feature | Status |
|---------|--------|
| Chat message reactions/feedback | ❌ Not implemented |
| Typing indicators | ❌ Not implemented |
| Chat sharing | Schema exists (`is_shared`, `shared_with_user_ids`) but no UI |
| Contact management UI | Schema exists (`contacts` table) but no UI |
| Undo/rollback for DB mutations | ❌ Not implemented |
| Rate history visualization | Schema exists but no charts |
| Batch CSV import | Staging tables exist (`tmp_employees`, `tmp_projects`) but no import UI |
