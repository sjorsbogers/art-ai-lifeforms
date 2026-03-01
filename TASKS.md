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
- [ ] Set up GitHub App for automated PRs: run `/install-github-app` in Claude Code
- [ ] Test api/identity.js after KV is connected

## DONE
- [x] 60x60 grid upgrade
- [x] Parametric gestures (MOTION/FREQUENCY/AMPLITUDE/etc.)
- [x] Display vocabulary (pixel font, emoji, clock) — display.js
- [x] Emotion color system (7 emotions + shimmer)
- [x] api/identity.js scaffolded (needs KV connected)
- [x] Full LLM response format parser
- [x] Radical system prompt rewrite (~200 tokens, first-person, one-sentence rule)
- [x] Reduced max_tokens 512 -> 180
- [x] Pre-seeded SOUL + IDENTITY defaults (applied on first run, not overwriting KV)
- [x] Fixed DISPLAY threshold: words up to 8 chars shown all at once
- [x] KV graceful fallback: api/identity.js works without @vercel/kv installed
- [x] Heartbeat loop (browser-side, 45s idle) with 4 types: reflect/explore/feel_news/scan_self
- [x] api/news.js (BBC RSS, no API key)
- [x] api/code.js (codebase introspection — FORM can read its own source)
- [x] api/events.js (OpenClaw -> Vercel KV -> browser command queue)
- [x] openclaw-skill/SKILL.md (FORM skill for OpenClaw agent)
- [x] scripts/form-heartbeat.sh (runs openclaw agent + pushes to api/events)
- [x] scripts/openclaw-setup.sh (step-by-step setup guide)
- [x] main.js 3s polling for api/events (Chat.processRaw)
- [x] chat.js processRaw() public method
