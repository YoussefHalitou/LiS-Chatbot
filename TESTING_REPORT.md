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
1. **Add access controls and rate limits** on all API routes; require user identity before invoking Supabase or external providers.
2. **Introduce input validation and moderation** (length limits, toxicity/PII filters) before forwarding to OpenAI or speech providers.
3. **Implement streaming and prompt compaction** to cut latency; measure token usage per turn.
4. **Improve error surfacing**: runtime config checks with health endpoints, user-friendly UI to show degraded modes when keys are missing, and retries/backoff for transient provider errors.
5. **Expand automated tests**: unit tests for prompt formatting and tool payloads; integration tests mocking Supabase/Deepgram/ElevenLabs failures; browser tests for voice UX fallbacks.
6. **Add observability**: structured logs, latency metrics, and cost monitoring for external API calls.
