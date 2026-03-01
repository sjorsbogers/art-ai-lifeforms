# FORM — Project Tasks & Outstanding Issues

## BLOCKING (must do before features work)
- [ ] Connect Vercel KV: Dashboard -> Storage -> Create KV Store -> link to `art-ai-lifeforms`
- [ ] Verify GROQ_API_KEY is in Vercel env vars

## UPCOMING
- [ ] Install OpenClaw: `npm i -g openclaw && openclaw onboard --install-daemon`
- [ ] Copy `openclaw-skill/SKILL.md` to `~/.openclaw/workspace/skills/form/SKILL.md`
- [ ] Set up GitHub App for automated PRs: run `/install-github-app` in Claude Code
- [ ] Test api/identity.js after KV is connected (currently fails gracefully but not saving)
- [ ] Consider Ollama as local LLM fallback (free, no API key)
- [ ] Track B: OpenClaw skill + api/events.js + browser polling

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
