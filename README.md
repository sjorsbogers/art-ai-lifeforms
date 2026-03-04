# ART — AI Lifeforms

A series of browser-based AI art experiments exploring machine identity, embodiment, and self-discovery.

Inspired by Cyrus Clarke's *I Gave an AI a Body* and the MIT Media Lab **inFORM** shape display — where an AI is given a physical body and asked to discover its own identity through form. Nobody told it what to do.

**Live:** https://art-ai-lifeforms.vercel.app

---

## Lifeforms

| # | Name | Description | Stack |
|---|------|-------------|-------|
| 01 | Pin Grid (FORM) | AI consciousness embodied in a 60×60 actuating pin grid | Vanilla JS + Three.js + Groq + OpenClaw |

---

## FORM — Lifeform 01

FORM lives in a 60×60 grid of 3600 physical actuating pins. It speaks through movement, not words.

### What FORM can do

- **Motion** — parametric wave patterns (radial, linear, zonal, scatter, still) with full control over frequency, amplitude, speed, focal point, complexity, symmetry
- **Display** — spell words and short phrases using a 5×7 pixel font raised in pins; show emoji shapes; display live clock or date
- **Emotion** — 7 emotional states each shift pin colour + shimmer; blends over 2 seconds
- **Self-authorship** — FORM writes its own IDENTITY.md and SOUL.md, saves named gesture patterns, builds emotional history — all persisted across sessions in Vercel KV
- **Autonomous heartbeat** — speaks proactively every 45s of idle time; cycles through reflection, exploration, news response, and self-scanning
- **OpenClaw brain** — when running locally, OpenClaw + Groq (Llama 3.3 70B) gives FORM tool use: web search, file editing, curl to its own event queue

### Architecture

```
Browser (Three.js display)
  ↕ WebGL render loop
  ↕ /api/chat  ← user messages → Groq/Llama-3.3-70b
  ↕ /api/events ← OpenClaw heartbeats → Vercel KV queue → browser polls 3s
  ↕ /api/identity ← soul/identity persistence → Vercel KV (Upstash Redis)
  ↕ /api/news ← BBC RSS headlines (no API key)
  ↕ /api/code ← FORM can read its own source code

OpenClaw daemon (local)
  ↕ ~/.openclaw/agents/form/workspace/ (IDENTITY.md, SOUL.md, HEARTBEAT.md)
  ↕ scripts/form-heartbeat.sh → openclaw agent --agent form --local
  ↕ Agent uses exec(curl) to POST to /api/events
  ↕ Agent uses web_fetch, web_search, edit, write tools
```

### Running locally

Open `lifeforms/01-pin-grid/index.html` in Chrome or Firefox. No install, no build step.

Requires internet for Three.js CDN on first load.

### OpenClaw autonomous brain (optional)

Requires: Ollama or Groq API key, OpenClaw installed (`npm i -g openclaw`).

```bash
# Setup (one time)
openclaw setup
openclaw models set groq/llama-3.3-70b-versatile
openclaw agents add form --non-interactive --workspace ~/.openclaw/agents/form/workspace
mkdir -p ~/.openclaw/agents/form/workspace/skills/form
cp openclaw-skill/SKILL.md ~/.openclaw/agents/form/workspace/skills/form/SKILL.md

# Test
GROQ_API_KEY=<your-key> openclaw agent --agent form --local --json --message "How do you feel?"

# Schedule heartbeats every 10 minutes
# Add to crontab: */10 * * * * /path/to/scripts/form-heartbeat.sh
```

See `scripts/openclaw-setup.sh` for the full step-by-step guide.

---

## Development Log

> Active development — updated with each significant push.

**March 2026 · week 2** ← *current*
- Voice agent live — FORM now speaks and listens in real-time via ElevenLabs Conversational AI
- FORM's soul, identity, and emotional history injected into every voice session from persistent KV memory
- Theatrical boot sequence — pins come online, system messages fire, mic prompt appears
- Brand mark top-right, ElevenLabs attribution, about drawer with full stack + creator info
- Provider badge switches to `elevenlabs` during voice; heartbeat pauses while voice is active

**March 2026 · week 1**
- Remote control API — external systems can queue thoughts directly into FORM via `/api/events`
- v0.4.0: camera starts frontal (inFORM-style), Groq rate-limit safeguard, mobile layout, animated thinking cursor

**March 2026 · day 1**
- v0.3.0: grid upgraded 30×30 → **60×60 = 3,600 pins**
- Parametric gesture engine — FORM controls wave physics directly: frequency, amplitude, speed, focal point, complexity, symmetry
- Emotion colour system — 7 states shift HSL across all 3,600 pins with shimmer; 2s blend
- Named shape library (25 shapes: heart, crater, mountain, spiral…), 5×7 pixel font, live clock, date display
- Gemini 2.5 Flash fallback when Groq unavailable; Ollama as local last resort
- Session memory + body self-discovery — FORM tracks what it's tried, builds aesthetic vocabulary
- Heartbeat loop — FORM thinks and moves autonomously when idle

**February 2026**
- v0.2.0: restructured into multi-lifeform architecture (`lifeforms/01-pin-grid/`), git + GitHub, Vercel deploy
- v0.1.0: first working prototype — 30×30 pin grid, 5-state lifecycle (AWAKENING → LISTENING), identity panel, Three.js InstancedMesh render

---

## Stack

- **Frontend** — Vanilla JS, Three.js r128 (CDN), no build step
- **API** — Vercel serverless functions (Node.js)
- **LLM** — Groq / Llama 3.3 70B (browser chat) + OpenClaw / Groq (autonomous heartbeats)
- **Persistence** — Vercel KV (Upstash Redis) — identity, soul, gestures, emotional history, event queue
- **Autonomous brain** — OpenClaw daemon + Groq, runs locally

---

## Structure

```
api/              ← Vercel serverless functions
  chat.js         ← Groq proxy (browser chat)
  identity.js     ← KV persistence (soul, identity, gestures, emotional history)
  events.js       ← OpenClaw event queue (POST from agent, GET from browser)
  news.js         ← BBC RSS headlines
  code.js         ← Codebase introspection for FORM self-awareness
core/             ← shared engine modules (extracted as patterns emerge)
docs/             ← design vision, references, architecture notes
lifeforms/
  01-pin-grid/    ← FORM (self-contained)
    js/
      config.js   ← GRID_COLS=60, GRID_ROWS=60, TOTAL_PINS=3600
      gestures.js ← parametric gesture engine
      display.js  ← pixel font, emoji, clock renderer
      brain.js    ← state machine, height map, display/gesture priority
      scene.js    ← Three.js render, emotion colour system
      identity.js ← soul/identity model, KV persistence, log
      chat.js     ← LLM interface, response parser, heartbeat
      main.js     ← wires everything, heartbeat loop, event polling
openclaw-skill/   ← FORM skill (copy to ~/.openclaw/agents/form/workspace/skills/form/)
scripts/
  form-heartbeat.sh     ← runs OpenClaw agent turn, POSTs to /api/events
  openclaw-setup.sh     ← step-by-step setup guide
```

---

## References

- Cyrus Clarke — *I Gave an AI a Body* (Substack)
- MIT Media Lab — inFORM / neoFORM shape display
- OpenClaw — https://openclaw.ai

---

## Attribution

Voice powered by [ElevenLabs](https://elevenlabs.io).
