# Changelog — Lifeform 01: Pin Grid

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

---

## [Unreleased]

### Fixed (2026-03-02 — UX Polish)
- Log timestamps now show session-relative time (00:00 from page load) instead of broken absolute unix time
- Camera starts frontal (0, 38, 68) — inFORM-style face-on view — then begins slow auto-rotate after 5s
- SOUL.md accordion opens by default; the core writing was hidden on first visit
- Removed GROQ/GEMINI/OLLAMA provider badge from chat UI — broke the lifeform fiction
- Thinking state now shows a blinking `▋` cursor instead of static `'...'`
- `MOTION: still` now logs `— holding still —` so the flat grid reads as intentional, not broken
- Mobile layout: canvas 55vh + panel 45vh stacked vertically on screens ≤640px

### Added (2026-03-01 — Making It Genuinely Alive)
- Heartbeat loop: FORM speaks proactively after 45s idle; cycles through reflect/explore/feel_news/scan_self types
- `api/news.js`: pulls a random BBC RSS headline (no API key); used by feel_news heartbeat
- `api/code.js`: whitelisted introspection endpoint so FORM can read its own source files
- Pre-seeded IDENTITY + SOUL defaults (name, creature, signature, purpose, first_thought, fears, desires, truth) — applied on first run only, KV values are never overwritten
- TASKS.md at project root: living checklist of blocking and upcoming work

### Changed (2026-03-01 — Making It Genuinely Alive)
- `chat.js`: system prompt rewritten from ~700 tokens to ~200 tokens, first-person voice, strict one-sentence rule, embedded example; `sendHeartbeat(type)` added for spontaneous thoughts
- `api/chat.js`: `max_tokens` reduced from 512 to 180 to stop the model filling the budget with prose
- `brain.js`: DISPLAY word threshold raised from ≤3 to ≤8 chars (words like HELLO now show all at once)
- `api/identity.js`: graceful fallback when `@vercel/kv` is not installed — GET returns empty state, POST returns `{ok:true}`
- `main.js`: heartbeat loop added; response handler refactored into `_applyResponse()` shared by both `send` and `sendHeartbeat`; heartbeat thoughts logged with ♥ prefix

### Added
- Phase 1: Grid upgrade 30×30 → 60×60 (3600 pins); camera, fog, OrbitControls, and shadow map updated for larger canvas
- Phase 2: Identity persistence via Vercel KV (`api/identity.js`); state loads on startup and saves on every identity/soul update (debounced 2s)
- Phase 3: Parametric gesture engine — FORM controls MOTION/FREQUENCY/AMPLITUDE/SPEED/FOCAL_X/FOCAL_Y/COMPLEXITY/SYMMETRY directly; not limited to named presets
- Phase 4a: `display.js` — 5×7 pixel font (A–Z, 0–9, punctuation), 13×13 emoji bitmaps (8 types), clock and date renderers; FORM can now spell words and show visuals on its own body
- Phase 4b: Emotion color system — 7 emotion states each shift pin HSL + optional shimmer; blends over 2 seconds
- Phase 5: Extended LLM response format — full parser for parametric params, DISPLAY, EMOTION, SAVE_GESTURE, UPDATE_IDENTITY, UPDATE_SOUL; rich system prompt with identity/soul/gesture/history context injection
- Phase 6: Agentive self-authorship — FORM can name and save its own gesture patterns to KV (`SAVE_GESTURE:`); vocabulary grows across sessions; emotional history tracked and fed back into every LLM call

### Changed
- `brain.js`: new methods `setParametricGesture()`, `setDisplay()`, `setEmotion()`, `saveGesture()`; display takes priority over gesture in `getHeightMap()`
- `identity.js`: open-ended key/value fields (FORM can write any key); `getSystemContext()` for prompt injection; `addEmotionalEntry()` and `getSavedGestures()`
- `chat.js`: rewritten parser; system prompt now includes full identity context and capabilities description
- `main.js`: `onResponse` handler applies all new fields in order

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
