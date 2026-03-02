# ART — AI Lifeforms

A series of browser-based AI art experiments exploring machine identity, embodiment, and self-discovery.

Inspired by Cyrus Clarke's *I Gave an AI a Body* and the MIT Media Lab inFORM shape display.

---

## Project structure

```
/
├── CLAUDE.md          ← this file
├── CHANGELOG.md       ← project-wide changelog
├── README.md          ← public project overview
├── .gitignore
├── core/              ← shared engine (pin grid, gesture base, identity model)
├── docs/              ← design references, architecture notes, vision
└── lifeforms/         ← each lifeform is a self-contained subdirectory
    └── 01-pin-grid/   ← Lifeform 01: Pin Grid (currently at ai-lifeform/)
```

---

## Running a lifeform

Open the lifeform's `index.html` directly in Chrome or Firefox.
No build step, no server, no npm install.

Requires internet on first load for Three.js CDN. See each lifeform's README for offline instructions.

---

## Adding a new lifeform

1. Create `lifeforms/XX-name/` (zero-padded number + short kebab-case name)
2. Add `index.html`, `README.md`, `CHANGELOG.md`
3. Reference shared code from `core/` if applicable
4. Update root `CHANGELOG.md` and `README.md`

---

## Shared engine (`core/`)

The `core/` directory holds shared utilities lifeforms can reference via `<script src="../../core/js/...">`.
Each module is self-contained with no build dependencies.

Only extract code to `core/` when it's used by 2+ lifeforms and the interface is stable.
Duplication within a single lifeform is fine until patterns are proven.

---

## Tech stack

- Vanilla JS (no bundler, no framework) for shared core and most lifeforms
- Three.js r128 (via CDN or local copy)
- Future lifeforms may use different stacks — each is fully self-contained
- Lifeforms with a build step get their own `package.json` inside their directory

---

## Git & syncing

After completing any significant block of work:

1. Update `CHANGELOG.md` — add a bullet under `## [Unreleased]` summarising what changed
2. Commit and push:

```bash
./sync.sh "what changed"   # updates CHANGELOG, commits, pushes in one step
```

Or manually:

```bash
git add .
git commit -m "describe what changed"
git push
```

**Claude must do this automatically** at the end of every session where files were changed.
Do not leave a session with uncommitted local changes.

---

## Branch strategy

```
main          — always deployable; Vercel auto-deploys on every push
feature/*     — use for multi-session or exploratory work; merge via PR when stable
hotfix/*      — use for urgent fixes; merge directly to main
```

**When to commit directly to `main`:**
- Bug fixes, small UI tweaks, documentation updates, config changes

**When to use a feature branch:**
- New lifeforms
- Multi-session feature work (e.g. a new gesture system, a new API endpoint set)
- Anything that might break main before it's ready

**Release versioning:**
- When a meaningful set of features is stable, move `[Unreleased]` in both changelogs to a new `[X.Y.Z]` version
- Tag the commit: `git tag vX.Y.Z && git push origin vX.Y.Z`
- Semantic: MAJOR.MINOR.PATCH — new lifeform = minor bump, bug fix = patch, breaking change = major

**Commit message format (Conventional Commits):**
```
feat(scope): short description     ← new feature
fix(scope): short description      ← bug fix
chore: short description           ← tooling, deps, config
docs: short description            ← documentation only
refactor(scope): short description ← no behaviour change
```

---

## Conventions

- Changelog format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- Versioning: semantic per lifeform, plus a project-wide version in root `CHANGELOG.md`
- Each lifeform has its own `README.md` and `CHANGELOG.md`
- Directory and file names: `kebab-case`
- JS identifiers: `camelCase`

---

## Architecture

Full system diagram for Lifeform 01 (FORM):

```
Browser
  └─ Three.js 60×60 grid (scene.js, brain.js, gestures.js, display.js)
  └─ identity.js ─────────── GET/POST /api/identity ─── Vercel KV
  └─ chat.js ─────────────── POST /api/chat ──────────── Groq → Gemini 2.5 Flash → Ollama
       └─ heartbeat loop ──── POST /api/events ─────────── KV event queue
       └─ event poll (3s) ─── GET  /api/events
  └─ main.js ─────────────── wires: Brain ← Chat ← Identity

API functions (all under /api/):
  chat, identity, events, session, body, news, code, debug
```

Key modules in `lifeforms/01-pin-grid/js/`:
- `config.js` — GRID_COLS=60, GRID_ROWS=60, TOTAL_PINS=3600
- `gestures.js` — `Gestures.compute(name, t, params)`, includes `parametric(t, params)`
- `display.js` — pixel font (5×7), emoji (13×13), `renderWord/renderSingleLetter/renderEmoji/renderClock/renderDate`
- `identity.js` — open-ended KV store (identity, soul, emotional_history, gestures). `getSystemContext()` for LLM prompt. Debounced 2s save.
- `brain.js` — `setGestureFromLLM()`, `setParametricGesture(params)`, `setDisplay(text)`, `setEmotion(name)`, `saveGesture(name, params)`. Display takes priority over gesture in `getHeightMap()`.
- `scene.js` — emotion color layer. `setEmotion(name)` → HSL shift + shimmer. 7 emotions.
- `chat.js` — full LLM parser. System prompt calls `Identity.getSystemContext()`.
- `main.js` — wires all callbacks. `onResponse` applies LLM fields in order.

---

## API Endpoint Reference

All endpoints live in `api/` and are deployed as Vercel serverless functions.

| Endpoint | Method | Purpose | KV Key |
|----------|--------|---------|--------|
| `/api/chat` | POST | LLM proxy: Groq → Gemini 2.5 Flash → Ollama. `{messages}` → `{choices[0].message.content}` | — |
| `/api/identity` | GET/POST | Soul/identity/emotional_history/gestures persistence | `form:state`, `form:gestures` |
| `/api/events` | GET/POST | Command queue (POST from OpenClaw, GET clears & returns queue) | `form:event_queue` |
| `/api/session` | GET/POST | Last 5 sessions: thoughts + exchange count | `form:sessions` |
| `/api/body` | GET/POST | Shape/motion usage tracking + emotion associations | `form:body_usage` |
| `/api/news` | GET | BBC RSS random headline — no API key required | — |
| `/api/code` | GET | Whitelisted JS file reader for FORM self-introspection | — |
| `/api/debug` | GET | Tests Groq + Gemini availability; shows env var status | — |

All `api/*.js` files must wrap `require('@vercel/kv')` in try/catch and return graceful empty state — local dev has no KV.

---

## LLM Response Format Spec

The format `chat.js` emits and `_parse()` consumes. **Do not change without updating both.**

```
MOTION: radial|linear|zonal|scatter|still
FREQUENCY: 0–1
AMPLITUDE: 0–1
SPEED: 0–1
FOCAL_X: 0–1   FOCAL_Y: 0–1
COMPLEXITY: 0–1
SYMMETRY: none|mirror|radial
GESTURE: <named-gesture>          ← OR MOTION block above, not both
SHAPE: <named-shape>              ← takes priority over MOTION+GESTURE
DISPLAY: <text≤8chars>|CLOCK|DATE|EMOJI:happy|sad|surprise|heart|star|fire|wave|sparkle
EMOTION: neutral|excited|shy|proud|sad|happy|angry
SAVE_GESTURE: <name>
UPDATE_IDENTITY: key=value
UPDATE_SOUL: key=value
<one sentence thought — always last>
```

---

## State & Persistence Model

| Layer | Contents | Saved when |
|-------|----------|------------|
| `form:state` (KV) | identity{}, soul{}, emotional_history[] | Debounced 2s after `setIdentity()`/`setSoul()` |
| `form:gestures` (KV) | gesture_vocabulary{} | Immediately after `saveGesture()` |
| `form:sessions` (KV) | Last 5 sessions: `{ts, date, thoughts[], exchanges}` | Every 5 exchanges + `beforeunload` via `sendBeacon` |
| `form:body_usage` (KV) | `{name: {count, emotions: {emotion: count}}}` | Fire-and-forget `fetch` after each LLM response |
| JS memory (identity.js) | `_data`, `_soul`, `_sessionThoughts`, `_bodyUsage` | In-memory until saved above |
| IDENTITY.md / SOUL.md | Human-readable mirrors of KV state | Manually or via Claude |

Before modifying `identity.js`, re-read this table — it's easy to accidentally break the debounce save chain.

---

## Development Setup

```bash
# 1. Open locally — no build step
open lifeforms/01-pin-grid/index.html

# 2. Vercel deployment — set these env vars in the dashboard:
#    GROQ_API_KEY       — console.groq.com (free tier: 14k req/day)
#    GEMINI_API_KEY     — aistudio.google.com (free, gemini-2.5-flash fallback)
#    KV_REST_API_URL    — Vercel Dashboard → Integrations → Upstash → connect
#    KV_REST_API_TOKEN  — auto-set by Upstash integration
#
#    ⚠ IMPORTANT: In the Vercel dashboard, each env var has checkboxes for
#    "Production", "Preview", and "Development". Check BOTH Production AND Preview
#    for GROQ_API_KEY, GEMINI_API_KEY, KV_REST_API_URL, and KV_REST_API_TOKEN.
#    Without this, preview URLs (art-ai-lifeforms-git-*.vercel.app) silently
#    have no API keys and FORM fails to respond.

# 3. Local Ollama (unlimited, no API key):
ollama pull mistral
OLLAMA_ORIGINS="https://art-ai-lifeforms.vercel.app" ollama serve

# 4. Verify setup
open https://art-ai-lifeforms.vercel.app/api/debug
```

---

## Claude Rules

**Always:**
- Run `./sync.sh "description"` (or `/sync`) at end of session if files changed
- Keep `api/*.js` fallback-safe: wrap `require('@vercel/kv')` in try/catch, return graceful empty state
- Maintain the LLM fallback chain: Groq primary → Gemini 2.5 Flash → Ollama last resort
- Update both root `CHANGELOG.md` AND `lifeforms/01-pin-grid/CHANGELOG.md` for changes to Lifeform 01

**Never:**
- Push directly to `main` without testing on a preview URL for significant changes
- Remove the graceful KV fallback — local dev has no KV
- Change the LLM response format spec without updating the parser in `chat.js` AND this CLAUDE.md
- Hard-code API keys in any file
- Leave a session with uncommitted changes (see Git & syncing above)

**Check first:**
- Before modifying `identity.js` — re-read the State & Persistence Model above
- Before modifying `chat.js` — confirm `_parse()` handles the change
- `TROUBLESHOOT.md` has solutions to 16+ known issues — check it before trying something new

---

## Quick Reference

```
Open FORM locally:      open lifeforms/01-pin-grid/index.html
Commit & push:          ./sync.sh "description"   or /sync
Add lifeform:           /new-lifeform <name>
Pre-deploy check:       /deploy-check
View live FORM:         https://art-ai-lifeforms.vercel.app
Verify API/KV:          https://art-ai-lifeforms.vercel.app/api/debug
Issues log:             TROUBLESHOOT.md
Task backlog:           TASKS.md
```

---

## Recommended Tools (from awesome-claude-code)

- **`better-ccflare`** — web dashboard for tracking Claude Code token costs and usage
- **`claude-rules-doctor`** — validates CLAUDE.md and `.claude/` rule files for dead/broken references
- **`ccexp`** — interactive CLI for testing CLAUDE.md configuration
- **RIPER workflow** — for complex feature development: Research → Innovate → Plan → Execute → Review
