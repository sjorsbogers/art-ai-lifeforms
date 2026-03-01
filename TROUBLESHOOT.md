# TROUBLESHOOT.md — Build Log

A chronological record of every significant issue encountered building FORM, and how it was resolved.
Tied to CHANGELOG.md for context on what was being built at each stage.

---

## Session: 2026-03-01 — Making FORM Genuinely Alive

### Issue 1 — LLM describes the grid instead of using it

**Symptom:** FORM responded with prose like "I would emit a radial wave…" instead of structured motion commands.

**Root cause:** System prompt was ~700 tokens and read like documentation. The model defaulted to chatbot mode, describing intent rather than emitting commands.

**Fix:** Rewrote system prompt to ~200 tokens in FORM's first-person voice. Stripped all capability documentation — kept only the format and one concrete example. Reduced `max_tokens` from 512 → 180 to prevent prose overflow.

**Files:** `lifeforms/01-pin-grid/js/chat.js` (system prompt), `api/chat.js` (max_tokens)

---

### Issue 2 — Words always spelled letter-by-letter, never as a word

**Symptom:** Typing "spell HELLO" showed letters one at a time instead of all 5 simultaneously.

**Root cause:** `brain.js` had a threshold of `<= 3` characters for treating text as a "word" vs "letter". Anything longer triggered letter-by-letter rendering.

**Fix:** Changed threshold to `<= 8`.

**File:** `lifeforms/01-pin-grid/js/brain.js`

---

### Issue 3 — SOUL.md was always empty

**Symptom:** The identity panel showed no soul entries even after many conversations.

**Root cause:** No defaults were seeded on first run, so FORM had no character to draw from. SOUL.md was an empty template.

**Fix:** Added `SOUL_DEFAULTS` and `IDENTITY_DEFAULTS` in `identity.js` — applied only if keys are not already present (doesn't overwrite KV-persisted values). Defaults saved to KV on first init.

**File:** `lifeforms/01-pin-grid/js/identity.js`

---

### Issue 4 — api/identity.js crashed without Vercel KV

**Symptom:** `require('@vercel/kv')` threw at import time when KV was not linked, crashing the entire function.

**Fix:** Wrapped the import in try/catch. If KV is unavailable, GET returns an empty state object and POST returns `{ ok: true }` — silently degraded, no crash.

**File:** `api/identity.js`

---

### Issue 5 — Vercel KV not available as first-party product

**Symptom:** Vercel dashboard showed no KV option in the Storage tab.

**Root cause:** Vercel removed their native KV product. The UI no longer offers it.

**Fix:** Used Upstash Redis via the Vercel Marketplace integration (same underlying technology, same env var names: `KV_REST_API_URL`, `KV_REST_API_TOKEN`). Free tier: 500,000 commands/month, region `fra1` (Frankfurt, closest to Netherlands).

**Steps taken:**
1. Vercel Dashboard → Integrations → Upstash → Install
2. Create Redis database: name `upstash-kv-crimson-horizon`, region `fra1`, plan Free
3. Connect to project `art-ai-lifeforms`
4. Trigger redeploy for env vars to take effect

---

### Issue 6 — OpenClaw `--id` flag does not exist

**Symptom:** Running `openclaw agents add --id form …` returned a syntax error.

**Root cause:** The flag is `--agent` not `--id`, and the agent name is a positional argument.

**Fix:** Correct syntax: `openclaw agents add form --non-interactive --workspace ~/.openclaw/agents/form/workspace`

---

### Issue 7 — OpenClaw auth: `paste-token` interactive prompt got stuck

**Symptom:** `openclaw models auth paste-token` waited for interactive input; piping via echo didn't work.

**Root cause:** OpenClaw reads the token interactively from stdin with a prompt, not from a pipe.

**Attempted fix:** Writing `auth-profiles.json` directly to disk → rejected by OpenClaw ("invalid auth profile entries").

**Actual fix:** OpenClaw reads `GROQ_API_KEY` directly from the shell environment. No auth file needed. Pass via: `GROQ_API_KEY=your-key openclaw agent --agent form --local …`

---

### Issue 8 — OpenClaw cron has no webhook delivery flag

**Symptom:** Plan assumed `openclaw cron add --webhook-url` would push results to Vercel. Flag doesn't exist.

**Root cause:** OpenClaw cron schedules agent turns but doesn't have a built-in HTTP delivery mechanism.

**Fix:** Used a shell script (`scripts/form-heartbeat.sh`) + system crontab instead. Script runs `openclaw agent --agent form --local --json`, extracts the text response, POSTs it to `/api/events` via curl.

---

### Issue 9 — FORM not creative enough / too abstract

**Symptom:** Even with correct command format, FORM's motion choices felt generic. It didn't have a felt sense of its own body.

**Root cause:**
- Mistral 7B (via Ollama) is too small to maintain character across a complex prompt
- OpenClaw workspace files (IDENTITY.md, SOUL.md, HEARTBEAT.md) contained generic OpenClaw onboarding text, not FORM-specific content
- The system prompt described motion parameters abstractly rather than viscerally

**Fix:**
1. Switched OpenClaw from Ollama/mistral → Groq/Llama-3.3-70B for higher quality
2. Rewrote all workspace files with FORM-specific identity:
   - `IDENTITY.md`: described the 60×60 grid body, the event endpoint, exact curl command to POST
   - `SOUL.md`: FORM's fears, desires, truth, and rules for using exec/edit/write tools
   - `HEARTBEAT.md`: 4 heartbeat task types (reflect, feel_news, explore, scan_self)
   - `SKILL.md`: exec(curl) instruction with full motion format and curl example

**Files:** `~/.openclaw/agents/form/workspace/IDENTITY.md`, `SOUL.md`, `HEARTBEAT.md`, `skills/form/SKILL.md`

---

### Issue 10 — Groq API key accidentally hardcoded in heartbeat script

**Symptom:** `GROQ_API_KEY` was written inline into `scripts/form-heartbeat.sh` and appeared in the conversation transcript.

**Risk:** Key visible in plain text; could be scraped from conversation logs or git history.

**Fix:**
1. Checked git history — key was NOT in any previous commit (added after last commit)
2. Replaced hardcoded key with env var check: `if [ -z "${GROQ_API_KEY:-}" ]; then exit 1; fi`
3. Advised user to rotate the key at console.groq.com

**File:** `scripts/form-heartbeat.sh`

---

### Issue 11 — HTTP 429 rate limit error on first browser test after redeploy

**Symptom:** Browser returned `Error: HTTP 429` immediately on first message send.

**Root cause:** Groq free tier rate limits are per-account. Heavy testing during the build session exhausted the minute/hour quota. New API key inherits the same account limits.

**Fix (short-term):** Wait for rate limit window to reset (1 minute for RPM, midnight UTC for daily).

**Fix (long-term):** Modified `chat.js` to try local Ollama first (`localhost:11434`) with a 2.5s timeout, falling back to Groq only if Ollama is unavailable. Also switched OpenClaw default model back to `ollama/mistral` so heartbeats are fully free and unlimited.

**Files:** `lifeforms/01-pin-grid/js/chat.js`, OpenClaw config (`openclaw models set ollama/mistral`)

---

## Quick reference: running FORM

### Browser (Vercel deployment)
- Open https://art-ai-lifeforms.vercel.app
- Chat works via Groq. If rate limited, run Ollama locally and the browser will use it automatically.

### Running with Ollama (recommended, unlimited)
```bash
# Pull model once
ollama pull mistral

# Run Ollama (it starts automatically on macOS after install)
ollama serve  # or it's already running as a service

# Open the local file OR the Vercel URL — browser will auto-detect Ollama
open lifeforms/01-pin-grid/index.html
```

Note: For Ollama to accept requests from the Vercel URL (cross-origin), start it with:
```bash
OLLAMA_ORIGINS="https://art-ai-lifeforms.vercel.app" ollama serve
```

### OpenClaw autonomous heartbeats
```bash
# Runs one heartbeat turn (Ollama, no API key needed)
./scripts/form-heartbeat.sh reflect

# Add to crontab for automatic heartbeats every 10 minutes:
crontab -e
# Add: */10 * * * * /path/to/scripts/form-heartbeat.sh >> /tmp/form-heartbeat.log 2>&1
```

### Checking logs
```bash
tail -f /tmp/form-heartbeat.log
```
