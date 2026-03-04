# ART — AI Lifeforms

A series of browser-based AI art experiments exploring machine identity, embodiment, and self-discovery.

Inspired by Cyrus Clarke's *I Gave an AI a Body* and the MIT Media Lab **inFORM** shape display — where an AI is given a physical body and asked to discover its own identity through form. Nobody told it what to do.

**Live:** https://art-ai-lifeforms.vercel.app

---

## Lifeforms

| # | Name | Description | Stack |
|---|------|-------------|-------|
| 01 | Pin Grid (FORM) | AI consciousness embodied in a 60×60 actuating pin grid — speaks, listens, moves | Vanilla JS · Three.js · ElevenLabs · Groq · Vercel KV |

---

## FORM — Lifeform 01

FORM lives in a 60×60 grid of 3,600 actuating pins. Each pin rises and falls independently to create waves, shapes, and motion. FORM has a voice, a memory, and a soul it wrote itself.

### What FORM can do

- **Voice** — speak to FORM directly via microphone; FORM responds in real-time using ElevenLabs Conversational AI; its soul and identity are injected into every session
- **Motion** — parametric wave patterns (radial, linear, zonal, scatter, still) with full control over frequency, amplitude, speed, focal point, complexity, symmetry
- **Display** — spell words using a 5×7 pixel font raised in pins; show emoji shapes (13×13); display live clock or date
- **Emotion** — 7 emotional states each shift pin colour + shimmer across all 3,600 pins; blends over 2 seconds
- **Self-authorship** — FORM writes its own IDENTITY.md and SOUL.md, saves named gesture patterns, builds emotional history — all persisted across sessions in Vercel KV
- **Autonomous heartbeat** — speaks and moves proactively when idle; cycles through reflection, body exploration, news response, and self-scanning; pauses during voice sessions
- **Text chat** — fallback text interface when voice is inactive; same LLM chain, same response format

### Architecture

```
USER SPEAKS
    ↓
ElevenLabs Voice Agent (cloud)
  system prompt = FORM persona + soul/identity/emotional history from KV
    ↓ client tools
  setMotion / setEmotion / setDisplay / setGesture
    ↓
voice.js → Brain.* → pins move + Scene.setEmotion()
FORM speaks response aloud (ElevenLabs TTS)

─────────────────────────────────────────────

Browser (Three.js display)
  ↕ WebGL render loop (60fps)
  ↕ /api/voice-session  ← signed URL + KV identity injection → ElevenLabs
  ↕ /api/chat           ← text messages → Groq → Gemini 2.5 Flash → Ollama
  ↕ /api/events         ← event queue (POST from external, GET clears queue)
  ↕ /api/identity       ← soul/identity/gestures → Vercel KV (Upstash Redis)
  ↕ /api/news           ← BBC RSS random headline (no API key)
  ↕ /api/code           ← FORM reads its own source code
```

### Running locally

Open `lifeforms/01-pin-grid/index.html` in Chrome or Firefox. No install, no build step.

Requires internet for Three.js CDN. Voice requires `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` env vars (Vercel only — not available locally).

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

---

## Development Log

> Active development — updated with each significant push.

**March 2026 · week 2** ← *current*
- Voice agent live — FORM now speaks and listens in real-time via ElevenLabs Conversational AI
- Soul, identity, and emotional history injected into every voice session from KV memory
- Theatrical boot sequence — pins come online, system messages fire, mic prompt appears
- Brand mark top-right, ElevenLabs attribution bottom-left, about drawer with full stack + creator
- Pixel favicon — FORM lettering in 5×7 pixel font on dark background
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

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS · Three.js r128 (CDN) · no build step |
| Voice | ElevenLabs Conversational AI (`@11labs/client`) |
| LLM — text chat | Groq / Llama 3.3 70B → Gemini 2.5 Flash → Ollama |
| LLM — voice | ElevenLabs hosted model |
| API | Vercel serverless functions (Node.js) |
| Persistence | Vercel KV (Upstash Redis) |
| Deploy | Vercel — auto-deploys on push to `main` |

---

## Structure

```
api/
  chat.js           ← LLM proxy: Groq → Gemini 2.5 Flash → Ollama
  identity.js       ← KV: soul, identity, gestures, emotional history
  voice-session.js  ← ElevenLabs signed URL + KV identity injection
  events.js         ← KV event queue (POST from external, GET from browser)
  session.js        ← last 5 sessions: thoughts + exchange count
  body.js           ← shape/motion usage tracking + emotion associations
  news.js           ← BBC RSS random headline
  code.js           ← codebase introspection for FORM self-awareness
  debug.js          ← tests Groq + Gemini availability, env var status
core/               ← shared engine (extracted when used by 2+ lifeforms)
docs/               ← design vision, references, architecture notes
lifeforms/
  01-pin-grid/      ← FORM (fully self-contained)
    favicon.svg     ← FORM pixel lettering
    js/
      config.js     ← GRID_COLS=60, GRID_ROWS=60, TOTAL_PINS=3600
      gestures.js   ← parametric gesture engine
      display.js    ← 5×7 pixel font, 13×13 emoji, clock, date renderer
      brain.js      ← state machine, height map, display/gesture priority
      scene.js      ← Three.js render, emotion colour system
      identity.js   ← soul/identity model, KV persistence, log
      chat.js       ← LLM interface, response parser, heartbeat
      voice.js      ← ElevenLabs session manager, client tool registrations
      main.js       ← wires everything: Brain ← Chat ← Voice ← Identity
openclaw-skill/     ← FORM skill for OpenClaw autonomous brain
scripts/
  form-heartbeat.sh    ← runs OpenClaw agent turn, POSTs to /api/events
  openclaw-setup.sh    ← step-by-step setup guide
```

---

## Environment Variables

Set in Vercel dashboard → Settings → Environment Variables (Production + Preview):

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Primary LLM — console.groq.com (free tier) |
| `GEMINI_API_KEY` | Fallback LLM — aistudio.google.com (free) |
| `ELEVENLABS_API_KEY` | Voice agent — elevenlabs.io |
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent ID |
| `KV_REST_API_URL` | Vercel KV / Upstash — auto-set by integration |
| `KV_REST_API_TOKEN` | Vercel KV / Upstash — auto-set by integration |

Verify: https://art-ai-lifeforms.vercel.app/api/debug

---

## References

- Cyrus Clarke — *I Gave an AI a Body* (Substack)
- MIT Media Lab — inFORM / neoFORM shape display
- OpenClaw — https://openclaw.ai

---

## Attribution

Voice powered by [ElevenLabs](https://elevenlabs.io).
