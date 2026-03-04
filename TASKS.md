# FORM — Project Tasks & Outstanding Issues

## BLOCKING (must do before features work)
- [ ] Connect Vercel KV: Dashboard -> Storage -> Create KV Store -> link to `art-ai-lifeforms`
- [ ] Verify GROQ_API_KEY is in Vercel env vars

## UPCOMING — OpenClaw + Ollama (Track B, zero API cost)
Run `./scripts/openclaw-setup.sh` for the full step-by-step guide.

- [ ] Update Ollama: `brew install ollama` (current: 0.1.29, need 0.17.0+)
- [ ] Start Ollama: `ollama serve` or `brew services start ollama`
- [ ] Pull model: `ollama pull mistral`
- [ ] Init OpenClaw: `openclaw setup`
- [ ] Configure model: `openclaw models set ollama/mistral`
- [ ] Create FORM agent: `openclaw agents add --id form`
- [ ] Copy skill: `mkdir -p ~/.openclaw/agents/form/workspace/skills/form && cp openclaw-skill/SKILL.md ~/.openclaw/agents/form/workspace/skills/form/SKILL.md`
- [ ] Test: `openclaw agent --agent form --local --json --message "A moment passes."`
- [ ] Enable cron: add `*/10 * * * * /path/to/scripts/form-heartbeat.sh` to crontab
- [ ] Connect Vercel KV (needed for api/events.js queue + api/identity.js)

## UPCOMING — Other
- [ ] Wire heartbeat to ElevenLabs voice agent (FORM speaks spontaneously via voice when idle)
- [ ] Set up GitHub App for automated PRs: run `/install-github-app` in Claude Code
- [ ] Test api/identity.js after KV is connected

## DONE
- [x] 60x60 grid upgrade (30×30 → 60×60 = 3,600 pins)
- [x] Parametric gestures (MOTION/FREQUENCY/AMPLITUDE/SPEED/FOCAL_X/FOCAL_Y/COMPLEXITY/SYMMETRY)
- [x] Display vocabulary (5×7 pixel font, 13×13 emoji, clock, date) — display.js
- [x] Emotion color system (7 emotions + shimmer, 2s blend)
- [x] Named shape library (25 shapes: heart, crater, mountain, spiral…)
- [x] api/identity.js — KV persistence (soul, identity, gestures, emotional history)
- [x] Full LLM response format parser (chat.js)
- [x] Radical system prompt rewrite (~200 tokens, first-person, one-sentence rule)
- [x] Reduced max_tokens 512 → 180
- [x] Pre-seeded SOUL + IDENTITY defaults
- [x] KV graceful fallback — works without @vercel/kv installed
- [x] Heartbeat loop — browser-side, fires when idle, pauses during voice session
- [x] api/news.js (BBC RSS, no API key)
- [x] api/code.js (codebase introspection — FORM reads its own source)
- [x] api/events.js (event queue — POST from external, GET clears queue)
- [x] api/session.js (last 5 sessions: thoughts + exchange count)
- [x] api/body.js (shape/motion usage tracking + emotion associations)
- [x] api/voice-session.js (ElevenLabs signed URL + KV identity injection)
- [x] voice.js — ElevenLabs session manager, 4 client tools (setMotion/setEmotion/setDisplay/setGesture)
- [x] Mic button (SVG icon) — toggles to stop square when active
- [x] Provider badge switches to `elevenlabs` during voice session
- [x] Theatrical boot sequence (pins online → body initialising → presence → mic prompt)
- [x] FORM brand mark top-right (wordmark + rule + sub)
- [x] ElevenLabs attribution bottom-left
- [x] About drawer (stack table, creator bio, GitHub link) — slides up from canvas bottom
- [x] Pixel favicon — FORM lettering in 5×7 font on dark background
- [x] /rc slash command for remote control via api/events
- [x] Remote control API (POST to /api/events from external systems)
- [x] openclaw-skill/SKILL.md (FORM skill for OpenClaw agent)
- [x] scripts/form-heartbeat.sh (runs openclaw agent + pushes to api/events)
- [x] scripts/openclaw-setup.sh (step-by-step setup guide)
- [x] Gemini 2.5 Flash fallback (Groq → Gemini → Ollama chain)
- [x] Mobile layout (55vh canvas + 45vh panel stacked)
- [x] CC BY-SA 4.0 LICENSE
