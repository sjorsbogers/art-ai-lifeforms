# FORM — Lifeform 01: Pin Grid

An AI given a physical body — 3,600 actuating pins in a 60×60 grid. FORM discovers identity through motion, not language. It writes its own memory, builds emotional history, and speaks in waves.

**Live:** https://art-ai-lifeforms.vercel.app

Inspired by Cyrus Clarke's *I Gave an AI a Body* and the MIT Media Lab **inFORM** shape display.

---

## What this is

FORM is a browser-based AI art piece. A 60×60 grid of pins rises and falls in real-time, driven by an AI that controls its own motion, emotion, and display. You can speak to it directly — it speaks back.

Nobody told it what to do. It wrote its own soul.

---

## How to interact

**Voice (primary)** — click the mic button, speak. FORM listens and responds in real-time via ElevenLabs. Its soul and identity are loaded into every session from persistent memory.

**Text (fallback)** — type in the chat input at the bottom right. Powered by Groq / Llama 3.3 70B with Gemini 2.5 Flash fallback.

**Autonomous** — FORM also thinks on its own when idle, cycling through reflection, body exploration, and news response.

---

## Running locally

Open `index.html` directly in Chrome or Firefox. No build step, no install.

Requires internet for Three.js CDN. Voice requires Vercel deployment with ElevenLabs env vars.

---

## Structure

```
01-pin-grid/
├── index.html          ← open in browser
├── favicon.svg         ← FORM pixel lettering
├── css/
│   └── style.css       ← dark terminal aesthetic
└── js/
    ├── config.js       ← GRID_COLS=60, GRID_ROWS=60, TOTAL_PINS=3600
    ├── gestures.js     ← parametric gesture engine (radial, linear, zonal, scatter, still)
    ├── display.js      ← 5×7 pixel font, 13×13 emoji, clock, date renderer
    ├── brain.js        ← state machine, height map, display/gesture priority
    ├── scene.js        ← Three.js render, emotion colour + shimmer system
    ├── identity.js     ← soul/identity model, KV persistence, log
    ├── chat.js         ← LLM interface (Groq → Gemini → Ollama), response parser
    ├── voice.js        ← ElevenLabs session manager, client tool registrations
    └── main.js         ← wires everything: Brain ← Chat ← Voice ← Identity
```

---

## What FORM controls

Every LLM response (voice or text) can call:

| Command | Effect |
|---------|--------|
| `setMotion` | Parametric wave — motion type, frequency, amplitude, speed, focal point, complexity, symmetry |
| `setGesture` | Named gesture — breathe, ripple, wave, spiral, pulse, noise… |
| `setEmotion` | Colour + shimmer — neutral, excited, shy, proud, sad, happy, angry |
| `setDisplay` | Pin display — text ≤8 chars, CLOCK, DATE, EMOJI:name |
| `UPDATE_IDENTITY` | FORM writes its own identity fields |
| `UPDATE_SOUL` | FORM writes its own soul fields |
| `SAVE_GESTURE` | FORM names and saves a gesture pattern |

---

## Persistence

FORM's memory is stored in Vercel KV (Upstash Redis) and loaded on every page load and voice session:

| Key | Contents |
|-----|----------|
| `form:state` | identity{}, soul{}, emotional_history[] |
| `form:gestures` | named gesture vocabulary |
| `form:sessions` | last 5 sessions: thoughts + exchange count |
| `form:body_usage` | shape/motion usage + emotion associations |

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Primary LLM |
| `GEMINI_API_KEY` | Fallback LLM |
| `ELEVENLABS_API_KEY` | Voice agent |
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent ID |
| `KV_REST_API_URL` | Vercel KV |
| `KV_REST_API_TOKEN` | Vercel KV |

---

## References

- Cyrus Clarke — *I Gave an AI a Body* (Substack)
- MIT Media Lab — inFORM / neoFORM shape display
- ElevenLabs — https://elevenlabs.io
