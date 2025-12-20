# LiS Chatbot – Test Evaluation Report

## Scope & Method
- Reviewed the Next.js 14 chatbot with OpenAI GPT-4o, Supabase, Deepgram STT, and ElevenLabs TTS integrations.
- Assessment is based on static analysis and code-driven reasoning because required API credentials are absent in this environment; no live calls to OpenAI, Supabase, Deepgram, or ElevenLabs were executed.
- Focus areas: functional accuracy, conversational quality, edge/error handling, integrations, performance, and security/privacy.

## Summary of Findings
| Severity | Area | Observation | Impact | Recommendation |
| --- | --- | --- | --- | --- |
| High | Security | Chat, STT, and TTS endpoints are unauthenticated while the chat route can execute Supabase admin queries via the service role key, exposing sensitive data if deployed publicly. | Potential full data exfiltration and abuse of paid APIs. | Require authentication/authorization and role-scoped queries; gate external API usage with rate limits. |
| High | Integration | OpenAI/Supabase requests depend on environment variables; missing keys trigger runtime errors and block the app. | Service downtime on misconfiguration. | Add startup health checks and clearer operator alerts; fail gracefully in UI. |
| Medium | Performance | Large, multi-hundred-line system prompt and non-streaming responses increase latency; no caching or concurrency safeguards. | Slower responses and degraded experience under load. | Trim/reuse prompt context, enable streaming, and add request throttling. |
| Medium | Edge Handling | Offensive or out-of-scope input has no moderation; ambiguous questions rely solely on prompt guidance. | Risk of unsafe or low-quality replies. | Add input moderation and refusal logic; unit tests for prompt adherence. |
| Medium | UX | Voice mode depends on browser APIs with alerts only; no retry or fallback flow, and localStorage history can grow unbounded. | Breakage on unsupported browsers; potential storage bloat. | Add capability checks before enabling voice UI, show inline errors, and prune history. |
| Low | Observability | No logging/metrics for latency, errors, or model/tool usage beyond console logs. | Hard to diagnose issues or tune cost/quality. | Add structured server logs and basic telemetry. |

## Detailed Assessment

### Functional Testing
- **Chat routing and system behavior:** The server constructs a long, prescriptive system prompt that forces German answers, encourages proactive examples, and mandates read-only database access through Supabase views (e.g., `v_morningplan_full`).【F:app/api/chat/route.ts†L13-L200】 This should be validated with multi-turn flows covering vague queries, date handling, and view-first selection.
- **Tool execution path:** The API accepts arbitrary `messages` from the client, forwards them to OpenAI with tool definitions, executes any requested Supabase queries, and then re-calls OpenAI with tool results.【F:app/api/chat/route.ts†L233-L329】 No guardrails exist for tool-call volume or cost; tests should verify safe handling of malformed tool arguments and empty tool responses.
- **Voice features:** STT accepts uploaded audio and proxies it to Deepgram without authentication or size limits besides Deepgram errors.【F:app/api/stt/route.ts†L9-L99】 TTS forwards arbitrary text to ElevenLabs and streams back audio, again with no caller authentication.【F:app/api/tts/route.ts†L3-L73】 Functional tests should cover valid/invalid payloads, large inputs, and API failure scenarios.

### Conversational Quality
- **Strengths:** Prompt enforces friendly tone, provides schema knowledge, and encourages proactive suggestions for vague questions, which should help with intent coverage.【F:app/api/chat/route.ts†L90-L176】
- **Risks:** No safety/moral guardrails or moderation before sending user text to OpenAI; responses on offensive or sensitive prompts are undefined. Latency may increase because every turn resends the full system prompt and history, and responses are not streamed.

### Edge Case & Error Handling
- **Client voice UX:** The UI tries to polyfill `getUserMedia`, but failures surface as blocking alerts and do not disable recording controls; there is no retry guidance beyond the alert text.【F:components/ChatInterface.tsx†L80-L177】
- **Server errors:** Missing environment variables throw at module import time, causing hard failures before the app can render a helpful message.【F:app/api/chat/route.ts†L5-L11】【F:app/api/stt/route.ts†L3-L7】【F:app/api/tts/route.ts†L3-L8】 API error responses are generic JSON without user-facing remediation tips.
- **Ambiguity and safety:** No moderation or refusal logic; out-of-scope or abusive input could be passed directly to the model. Testing should include nonsense, hostile, or personally identifiable input to verify behavior.

### Integration Testing
- **Supabase:** All database access uses the service role key (`supabaseAdmin`) without user context, meaning any caller can query any table the key permits.【F:lib/supabase.ts†L1-L38】【F:lib/supabase-query.ts†L1-L92】 There is no RLS enforcement or request scoping. Tests should verify least-privilege access and RLS coverage.
- **External APIs:** Deepgram and ElevenLabs are called directly with provided keys and no rate limiting or caching.【F:app/api/stt/route.ts†L40-L89】【F:app/api/tts/route.ts†L21-L63】 Integration tests should simulate API throttling and network errors to ensure graceful degradation.

### Performance & Scalability
- No streaming responses or background processing; each chat turn waits for OpenAI completion and any Supabase queries, which can be slow under load.【F:app/api/chat/route.ts†L201-L329】
- LocalStorage persists full conversation history without size controls, which can degrade browser performance over time.【F:components/ChatInterface.tsx†L38-L63】
- No concurrency limits, caching, or batching are implemented across APIs.

### Security & Privacy
- Public endpoints lack authentication or rate limiting while holding OpenAI, Deepgram, ElevenLabs, and Supabase credentials, enabling unauthenticated abuse and data exfiltration if exposed.【F:app/api/chat/route.ts†L5-L11】【F:app/api/stt/route.ts†L3-L99】【F:app/api/tts/route.ts†L3-L73】【F:lib/supabase.ts†L1-L38】
- Service role access bypasses per-user permissions; there is no audit trail or PII minimization. Messages and transcripts are stored in localStorage without expiry or encryption, making them recoverable on shared devices.【F:components/ChatInterface.tsx†L38-L63】
- No content moderation or prompt-injection defenses; model could execute unintended tool calls if prompted.

## Recommended Next Steps & Test Plan
**Goal:** Ship a secured, observable chatbot that responds quickly, handles voice gracefully, and fails safely under misconfiguration or abuse.

### Phase 1 – Security, Reliability, and Guardrails
1. **Authentication + authorization for all routes**
   - Block unauthenticated access to `/api/chat`, `/api/stt`, and `/api/tts`; gate Supabase usage with end-user identity and RLS-backed views.
   - Add rate limiting and request size caps to prevent abuse.
   - Tests: API contract tests that unauthorized callers receive 401/403; RLS unit tests verifying only view-scoped queries are allowed.
2. **Input validation and moderation**
   - Enforce payload schemas (length, type, MIME) before invoking providers; run toxicity/PII filters on text and transcripts.
   - Tests: table-driven unit tests for validator coverage; negative cases for oversized audio/text; moderation refusals with safe UI messaging.
3. **Robust error surfacing**
   - Add startup health checks for environment variables; return actionable error states to the UI with retry/backoff guidance.
   - Tests: simulate missing keys and provider timeouts to confirm user-facing fallbacks and backoff logic.

### Phase 2 – Performance and UX
1. **Streaming + prompt compaction**
   - Enable OpenAI streaming responses and trim repeated system context; cache schema hints.
   - Tests: integration tests ensuring streamed tokens render incrementally; token-usage snapshot tests to track reductions.
2. **Voice UX resilience**
   - Add capability detection and UI fallbacks for unsupported browsers; include retry with inline errors instead of alerts.
   - Tests: browser automation covering mic-denied, unsupported media, and large/empty audio uploads.

### Phase 3 – Observability and Cost Control
1. **Structured telemetry**
   - Emit logs/metrics for latency, error rates, token/call volume per provider; add dashboards and alerts for anomalies.
   - Tests: log format snapshot tests; health endpoints asserted in CI.
2. **Concurrency and rate governance**
   - Introduce server-side throttles and request queues; consider caching stable Supabase reads.
   - Tests: load tests (locust/k6) for RPS ceilings; regression budget with thresholds in CI.

### Ongoing Regression Suite
- **Unit:** prompt formatting, tool argument shaping, and validation edge cases.
- **Integration:** mock Supabase/Deepgram/ElevenLabs failures, OpenAI error codes, and retry behavior.
- **E2E (browser):** chat happy path, streaming rendering, voice fallbacks, and localStorage pruning.

## Executed Checks (CI surrogate)
- `npm run lint` (passes): Verifies there are no ESLint errors in the Next.js codebase, serving as a fast regression signal in the absence of full integration tests in this environment.
