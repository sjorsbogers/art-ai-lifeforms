# Changelog

All notable project-wide changes are documented here.
Each lifeform also maintains its own `CHANGELOG.md`.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

- Add best practices: expand CLAUDE.md with 8 architecture/API/LLM/rules sections, add .claude/ settings and slash commands

### Added
- **Session memory (Phase 1)** — FORM now remembers what it thought in past sessions. `api/session.js` stores last 5 sessions (thoughts + exchange count) in KV. `identity.js` collects thoughts during a session, saves on page unload via `sendBeacon`, and auto-saves every 5 exchanges. Session summaries are injected into the system prompt so FORM can reference its own history. (2026-03-01)
- **Body self-discovery (Phase 2)** — FORM tracks which shapes and motions it has used and how many times, and which emotions it associated with them. `api/body.js` stores usage data in KV. `identity.js` exposes `recordBodyUse()`, `getBodyContext()` (injected into every prompt), and `getUntriedShapes()`. New heartbeat type `explore_body` picks 3 untried shapes from the 60×60 vocabulary and asks FORM to use one. (2026-03-01)
- **Aesthetic vocabulary (Phase 3)** — System prompt now actively tells FORM to avoid over-used patterns (flagged with ⚠ in body context) and develop a personal style. `UPDATE_SOUL` is now mandatory every response, encouraging FORM to record aesthetic discoveries. (2026-03-01)
- **Gemini 2.5 Flash fallback** — `api/chat.js` now falls back to Gemini 2.5 Flash (`gemini-2.5-flash` on the `v1beta` OpenAI-compatible endpoint) when Groq fails. Requires `GEMINI_API_KEY` in Vercel env vars. Provider badge in UI shows which model responded. (2026-03-01)
- **Clock/date intent intercept** — `chat.js` `_checkIntent()` bypasses the LLM entirely for "what time is it" / "what date" type queries, responding instantly with `DISPLAY: CLOCK` or `DISPLAY: DATE`. (2026-03-01)
- **Accordion UI for IDENTITY/SOUL panels** — panels are now collapsible accordions at the top of the side panel, collapsed by default to give more space to the log. (2026-03-01)
- **Ollama fallback in browser chat** — `chat.js` now tries local Ollama (`localhost:11434/mistral`) first with a 2.5s timeout; falls back to Groq/Llama-3.3-70B via Vercel if Ollama is not available. Eliminates rate-limit errors when running locally. (2026-03-01)
- **OpenClaw switched to Ollama** — `openclaw models set ollama/mistral`; heartbeat script no longer requires `GROQ_API_KEY`. Autonomous heartbeats are now fully free and unlimited. (2026-03-01)
- **README rewrite** — reflects full architecture: 60×60 grid, OpenClaw/Groq brain, Vercel KV (Upstash), all API endpoints, OpenClaw setup guide. (2026-03-01)
- **TROUBLESHOOT.md** — build log documenting all issues encountered and how they were resolved. (2026-03-01)

### Changed
- Heartbeat rotation expanded: `reflect → explore_body → feel_news → scan_self → explore → explore_body`. Body exploration appears twice for more frequent vocabulary discovery. (2026-03-01)
- Heartbeat idle threshold raised from 45s → 160s (2m40s). Reduces interruptions during active conversations. (2026-03-01)
- LLM priority order: Groq (primary, 14k req/day) → Gemini 2.5 Flash (free fallback) → Ollama (local). Removed Ollama-first ordering; Vercel deployment now correctly uses Groq as primary. (2026-03-01)

### Removed
- `openclaw-skill/SKILL.md` and `scripts/openclaw-setup.sh` — removed as no longer needed. (2026-03-01)

### Fixed
- Hardcoded `GROQ_API_KEY` removed from `scripts/form-heartbeat.sh`; key is now read from environment. (2026-03-01)
- 429 rate-limit errors from Groq now show a helpful message pointing the user to Ollama. (2026-03-01)

---

### Previous session (2026-03-01)

- feat(track-b): OpenClaw + autonomous brain — api/events.js event queue, FORM skill (openclaw-skill/SKILL.md), form-heartbeat.sh shell script, browser polling every 3s
- feat: FORM genuinely alive — system prompt rewrite (200 tokens, first-person), max_tokens 512→180, pre-seeded soul/identity defaults, display threshold fix (≤8 chars), KV graceful fallback, 45s heartbeat loop (reflect/explore/feel_news/scan_self)
- feat: api/news.js (BBC RSS, no API key), api/code.js (codebase self-introspection), TASKS.md
- feat: FORM Expansion — 60×60 grid, parametric gestures (MOTION/FREQUENCY/…), display vocabulary, emotion colors, KV identity persistence
- feat: Vercel KV wired via Upstash Redis marketplace integration (region: fra1)
- fix: switch from NVIDIA/Kimi to Groq/Llama-3.3-70B
- feat: enable streaming — Edge runtime proxy, live log entry
- fix: disable thinking mode on Kimi K2.5 to prevent 504 timeout

### Planned
- Extract shared pin grid engine to `core/`
- Crontab setup for form-heartbeat.sh (every 10 minutes)

---

## [0.2.0] — 2026-03-01

### Changed
- Moved `ai-lifeform/` → `lifeforms/01-pin-grid/` as part of project restructure
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
