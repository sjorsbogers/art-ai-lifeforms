# Changelog

All notable project-wide changes are documented here.
Each lifeform also maintains its own `CHANGELOG.md`.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

- docs: add development log to README, rule to keep it updated in CLAUDE.md

- fix: update creator bio — Netherlands / Dubai

- feat(voice): show elevenlabs badge when voice session active

- feat: about drawer with stack, creator bio, GitHub link

- feat: FORM brand mark top-right, ElevenLabs attribution bottom-left + README

- fix(voice): re-enable heartbeat; pause it during active voice session

- feat(voice): theatrical boot sequence, mic icon in log, disable heartbeat

- fix(voice): correct SDK import to @11labs/client

- fix(voice): remove overrides from startSession — test bare connection first

- feat(voice): replace emoji mic with flat SVG icon; stop state shows square

- fix(voice): use GET for ElevenLabs signed URL; pass identity prompt as SDK override

- feat: add /rc slash command for remote-controlling FORM via events API
- feat(voice): add ElevenLabs voice agent — mic button, voice.js session manager, api/voice-session.js signed URL endpoint with KV identity injection

---

## [0.4.0] — 2026-03-02

### Fixed
- Log timestamps were showing absolute unix time (~29190000:00); now session-relative from page load
- Groq TPM rate-limiting caused by unbounded conversation history; `_history` now trimmed to last 8 messages before each LLM call
- `api/chat.js` silently swallowed Groq/Gemini errors; now captures and surfaces them in the 429 response body
- Camera starts in a frontal inFORM-style position and delays auto-rotate by 5s; previously started rotating mid-angle immediately

### Changed
- SOUL.md accordion opens by default — core writing was hidden on first visit
- Provider badge label now lowercase (`groq` / `gemini` / `ollama`) for a subtler look
- User chat message colour brightened (`#555` → `#999`) for readability
- Thinking state shows animated `▋` cursor instead of static `...`
- `MOTION: still` now logs `— holding still —` so viewers know flatness is intentional, not a broken state

### Added
- Mobile layout: canvas 55vh + panel 45vh stacked vertically on screens ≤640px
- CLAUDE.md: env var warning (Preview environment must be checked alongside Production in Vercel dashboard), branch strategy section
- TROUBLESHOOT.md: issue 17 (preview URL API keys not scoped to Preview env), issue 18 (Groq TPM hit from unbounded history)

---

## [0.3.0] — 2026-03-01

### Added
- **Session memory** — `api/session.js` stores last 5 sessions (thoughts + exchange count) in KV. FORM can reference its own history across sessions
- **Body self-discovery** — `api/body.js` tracks shape/motion usage and emotion associations. `getBodyContext()` injected into every prompt; `explore_body` heartbeat picks untried shapes
- **Aesthetic vocabulary** — system prompt flags over-used patterns (⚠), `UPDATE_SOUL` mandatory every response to record discoveries
- **Gemini 2.5 Flash fallback** — `api/chat.js` falls back to `gemini-2.5-flash` (v1beta OpenAI endpoint) when Groq fails
- **60×60 grid** — upgraded from 30×30; 3600 pins, camera, fog, shadow map updated
- **Parametric gesture engine** — FORM controls MOTION/FREQUENCY/AMPLITUDE/SPEED/FOCAL_X/FOCAL_Y/COMPLEXITY/SYMMETRY directly
- **Named shape library** — 25 named shapes (heart, mountain, spiral, crater, etc.) via `SHAPE:` command
- **Display vocabulary** — 5×7 pixel font, 13×13 emoji bitmaps, live clock, date renderer
- **Emotion colour system** — 7 states shift HSL across all pins with shimmer; 2s blend
- **Heartbeat loop** — FORM speaks proactively when idle (reflect/explore_body/feel_news/scan_self)
- **Identity KV persistence** — IDENTITY.md and SOUL.md persist across sessions via Vercel KV/Upstash
- **Clock/date intent intercept** — time/date queries bypass the LLM entirely
- `api/news.js` — random BBC RSS headline for feel_news heartbeat
- `api/events.js` — KV event queue for autonomous external triggers
- `api/body.js`, `api/session.js` — new persistence endpoints
- TROUBLESHOOT.md — full build log of all issues and fixes
- CLAUDE.md — project rules, architecture diagram, API reference, LLM spec

### Changed
- LLM fallback order: Groq primary → Gemini fallback → Ollama last resort (was Ollama-first)
- System prompt rewritten: ~700 tokens → ~200 tokens, first-person FORM voice, strict one-sentence rule
- `max_tokens` 512 → 180; prevents prose overflow
- Heartbeat idle threshold 45s → 160s to reduce interruptions during conversations
- IDENTITY/SOUL panels converted to collapsible accordions

### Fixed
- `api/identity.js` crashed when `@vercel/kv` not installed; now graceful fallback
- Hardcoded `GROQ_API_KEY` removed from `scripts/form-heartbeat.sh`

---

## [0.2.0] — 2026-03-01

### Changed
- Moved `ai-lifeform/` → `lifeforms/01-pin-grid/` as part of multi-lifeform project restructure
- Added root `CLAUDE.md`, `CHANGELOG.md`, `README.md`, `.gitignore`
- Added `core/` (shared engine placeholder) and `docs/` (vision, architecture)
- Initialised git repository and pushed to GitHub

---

## [0.1.0] — 2026-02-28

### Added
- Lifeform 01: Pin Grid — browser simulation of AI self-discovery on a 30×30 pin grid
- Five-state AI lifecycle: AWAKENING → BREATHING → EXPLORING → EXPRESSING → REFLECTING
- 11-gesture vocabulary: breathe, ripple, wave, pulse, scatter, spiral, noise, heartbeat, and more
- Live IDENTITY.md + SOUL.md panel with real-time thought log
- Three.js InstancedMesh 3D rendering with OrbitControls
