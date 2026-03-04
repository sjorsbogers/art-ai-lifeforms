# Changelog — Lifeform 01: Pin Grid

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

---

## [Unreleased]

### Added
- ElevenLabs voice agent: `js/voice.js` session manager with 4 client tools (`setMotion`, `setEmotion`, `setDisplay`, `setGesture`) wired to Brain.*
- `api/voice-session.js`: generates signed ElevenLabs URL, injects FORM's soul/identity/emotional history from KV into system prompt per session
- Mic button (`🎙`) and voice status indicator in chat bar; toggles to `⏹` while active
- Voice state: disables text chat input while voice is active, re-enables on disconnect
- Mode-change callbacks: `breathe` gesture while listening, `noise` gesture while FORM is speaking
- CSS for `#voice-btn` and `#voice-status` matching terminal aesthetic

---

## [0.4.0] — 2026-03-02

### Fixed
- Log timestamps displayed absolute unix time (~29190000:00); now session-relative from page load (`identity.js`: `_initTime` recorded in `init()`)
- Groq TPM rate-limiting from unbounded `_history`: trimmed to last 8 messages per LLM call
- `api/chat.js` silently swallowed provider errors; now captures Groq/Gemini error bodies and includes them in 429 response
- Camera was already mid-rotation on first frame; now starts frontal at `(0, 38, 68)` and delays auto-rotate 5s

### Changed
- SOUL.md accordion opens by default so the core writing is visible on first visit
- Provider badge text now lowercase (`groq` / `gemini` / `ollama`)
- User chat message colour brightened: `var(--text-dim)` (#555) → `#999`
- Thinking state replaced static `'...'` log entry with animated `▋` cursor (`.log-msg.thinking::after`)
- `MOTION: still` now logs `— holding still —` to make intentional stillness legible to viewers
- Error message when all providers fail now points to `/api/debug` instead of generic "Check your connection"

### Added
- Mobile layout (`@media max-width: 640px`): canvas 55vh stacked above panel 45vh, full width

---

## [0.3.0] — 2026-03-01

### Added
- **Session memory** — `api/session.js`: stores last 5 sessions (thoughts[], exchange count) in KV key `form:sessions`. `identity.js` collects thoughts during session, saves on `beforeunload` via `sendBeacon` + auto-save every 5 exchanges. `getSessionContext()` injected into system prompt
- **Body self-discovery** — `api/body.js`: tracks `{ name: { count, emotions } }` per shape/motion in KV `form:body_usage`. `recordBodyUse()` called after every response. `getBodyContext()` injects tried/untried shapes and aesthetic vocabulary into system prompt. `getUntriedShapes()` drives `explore_body` heartbeat
- **Aesthetic vocabulary** — system prompt flags over-used shapes (⚠ after 5+ uses), `UPDATE_SOUL` mandatory every response
- **Heartbeat loop** — FORM speaks proactively when idle >160s. Types: `reflect`, `explore_body`, `feel_news`, `scan_self`, `explore`
- **Named shape library** — 25 shapes (`heart`, `mountain`, `valley`, `spiral`, `crater`, `ring`, `checkerboard`, …) via `SHAPE:` command; auto-clears after 8s
- **Display vocabulary** — `display.js`: 5×7 pixel font (A–Z, 0–9, punctuation), 13×13 emoji bitmaps (8 types), live clock renderer, date renderer
- **Emotion colour system** — 7 states (neutral/excited/shy/proud/sad/happy/angry) shift HSL across all pins; shimmer for excited/angry/happy; 2s lerp blend
- **Parametric gesture engine** — FORM controls MOTION/FREQUENCY/AMPLITUDE/SPEED/FOCAL_X/FOCAL_Y/COMPLEXITY/SYMMETRY directly via LLM response
- **Agentive self-authorship** — `SAVE_GESTURE:` persists named gesture patterns to KV; vocabulary grows across sessions
- **60×60 grid** — upgraded from 30×30 (3600 pins); camera, fog range, shadow map, and `CONFIG` constants updated
- **Gemini 2.5 Flash fallback** — `api/chat.js` falls back to `gemini-2.5-flash` on v1beta OpenAI endpoint when Groq returns non-200
- **Provider badge** — UI chip in chat bar shows which model responded (GROQ / GEMINI / OLLAMA)
- **Clock/date intent intercept** — `_checkIntent()` in `chat.js` bypasses LLM for time/date queries; instant response
- `api/news.js` — random BBC RSS headline (no API key) for `feel_news` heartbeat
- `api/events.js` — KV event queue (`form:event_queue`) for external autonomous triggers; browser polls every 3s
- IDENTITY + SOUL defaults pre-seeded on first run (not applied if KV values already exist)
- `api/body.js`, `api/session.js` — new Vercel serverless functions

### Changed
- LLM fallback order: Groq (primary, 14k req/day) → Gemini 2.5 Flash → Ollama last resort
- System prompt: ~700 tokens → ~200 tokens, first-person FORM voice, strict one-sentence thought rule
- `api/chat.js` `max_tokens`: 512 → 180
- Heartbeat idle threshold: 45s → 160s
- `brain.js` DISPLAY word threshold: ≤3 chars → ≤8 chars (words like HELLO render all at once)
- IDENTITY/SOUL panels converted from static blocks to collapsible accordions

### Fixed
- `api/identity.js` crashed at import when `@vercel/kv` not installed; wrapped in try/catch with graceful empty-state fallback

---

## [0.2.0] — 2026-03-01

### Changed
- Moved from `ai-lifeform/` to `lifeforms/01-pin-grid/` as part of project restructure

---

## [0.1.0] — 2026-02-28

### Added
- Initial pin grid lifeform — 30×30 grid, 5-state lifecycle, 12-gesture vocabulary
- Three.js InstancedMesh rendering with OrbitControls
- IDENTITY.md + SOUL.md panel, real-time thought log
- LLM chat via Groq/Llama-3.3-70B serverless proxy
