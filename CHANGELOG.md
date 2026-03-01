# Changelog

All notable project-wide changes are documented here.
Each lifeform also maintains its own `CHANGELOG.md`.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

- feat: FORM Expansion — 60×60 grid, parametric gestures, display vocabulary, emotion colors, KV identity persistence, agentive self-authorship (2026-03-01)

- fix: switch from NVIDIA/Kimi to Groq/Llama-3.3-70B — faster, reliable, non-streaming

- feat: enable streaming — Edge runtime proxy, live log entry, gesture fires on first token

- fix: disable thinking mode on Kimi K2.5 to prevent 504 timeout, raise maxDuration to 60s

- feat: replace scripted brain with Kimi K2.5 LLM chat via Vercel serverless proxy — api/chat.js, chat.js, shortened boot sequence, chat UI in panel

- chore: sync.sh now auto-updates CHANGELOG.md [Unreleased] on every sync

### Planned
- Extract shared pin grid engine to `core/`

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
