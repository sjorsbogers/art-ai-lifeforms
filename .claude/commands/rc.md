Remote-control the live FORM at https://art-ai-lifeforms.vercel.app by posting a command to its event queue.

## How it works
POST { "text": "<raw LLM format>" } to https://art-ai-lifeforms.vercel.app/api/events.
FORM polls every 3 seconds, picks up the command, and runs it through the same parser as a chat response.

## Accepted LLM format (any subset of lines)
```
MOTION: radial|linear|zonal|scatter|still
FREQUENCY: 0–1
AMPLITUDE: 0–1
SPEED: 0–1
FOCAL_X: 0–1   FOCAL_Y: 0–1
COMPLEXITY: 0–1
SYMMETRY: none|mirror|radial
GESTURE: <named-gesture>
SHAPE: <named-shape>
DISPLAY: <text≤8chars>|CLOCK|DATE|EMOJI:happy|sad|surprise|heart|star|fire|wave|sparkle
EMOTION: neutral|excited|shy|proud|sad|happy|angry
<optional thought line — always last>
```

## Your task
1. Interpret $ARGUMENTS:
   - If already in LLM format (lines starting with MOTION/EMOTION/DISPLAY/etc.), use as-is
   - If natural language (e.g. "be excited", "show hello", "slow radial wave"), translate to the appropriate format lines
2. Build the command string (one or more format lines, thought line optional)
3. Run this curl command, substituting COMMAND with your formatted string (escape carefully):
```bash
curl -s -X POST https://art-ai-lifeforms.vercel.app/api/events \
  -H "Content-Type: application/json" \
  -d '{"text": "COMMAND"}'
```
4. Show the command you sent and the API response (should be {"ok":true,"queued":N})
5. Tell the user FORM will respond within ~3 seconds
