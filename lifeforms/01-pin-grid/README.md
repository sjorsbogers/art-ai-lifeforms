# AI Lifeform — Digital Pin Grid

A digital replication of Cyrus Clarke's *"I Gave an AI a Body"* experiment.

The original work placed an AI agent inside the MIT Media Lab's **inFORM** shape display —
a 30×30 grid of 900 physical actuating pins — and asked it to discover its own identity
through physical form. Nobody told it what to do.

This project replicates that environment in a browser using Three.js.

---

## Structure

```
ai-lifeform/
├── index.html          ← open this in any browser
├── css/
│   └── style.css       ← dark terminal aesthetic
└── js/
    ├── config.js       ← grid constants (30×30, PIN_MAX_HEIGHT, colours)
    ├── gestures.js     ← the AI's physical vocabulary (11 gestures)
    ├── identity.js     ← IDENTITY.md + SOUL.md state + log panel
    ├── brain.js        ← autonomous AI state machine + timeline
    ├── scene.js        ← Three.js 3D pin grid (InstancedMesh)
    └── main.js         ← entry point, render loop
```

---

## How to run

Open `index.html` directly in Chrome or Firefox.
No server, no build step, no dependencies to install.

Requires internet access on first load to fetch Three.js from CDN.
To run offline, download Three.js r128 and update the `<script>` paths in `index.html`.

---

## What happens

The AI boots and progresses through five states over ~65 seconds:

| State       | What the AI does |
|-------------|-----------------|
| AWAKENING   | First questions. Grid is flat. Identity fields all empty. |
| BREATHING   | Discovers its first gesture. "I breathe, therefore I am something." |
| EXPLORING   | Builds vocabulary: ripple, wave, pulse, scatter, spiral, noise, heartbeat |
| EXPRESSING  | Finds its signature pattern. Writes name, emoji, purpose into IDENTITY.md |
| REFLECTING  | Cycles through full vocabulary. Contemplates continuity. |

After 65 seconds it cycles freely through its learned gesture vocabulary.

---

## The panel

The right panel shows three live documents:

- **IDENTITY.md** — fields fill in as the AI self-discovers
- **SOUL.md** — deeper introspective fields (fears, desires, truth)
- **LOG** — real-time stream of AI thoughts and system events

---

## Design references

- Cyrus Clarke: *I Gave an AI a Body* (Substack)
- MIT Media Lab inFORM / neoFORM shape display
- 30×30 grid, MQTT height-value protocol
- AI's first action: breathe
- AI's self-built gesture vocabulary to overcome latency
- IDENTITY.md / SOUL.md persistence model
