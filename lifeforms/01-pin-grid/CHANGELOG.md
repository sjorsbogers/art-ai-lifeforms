# Changelog — Lifeform 01: Pin Grid

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

---

## [Unreleased]

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
