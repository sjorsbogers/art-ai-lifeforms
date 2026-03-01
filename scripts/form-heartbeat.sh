#!/usr/bin/env bash
# form-heartbeat.sh
# Runs an OpenClaw agent turn using the FORM skill (Groq/Llama-3.3-70B),
# then pushes the raw response to the Vercel event queue so the browser picks it up.
#
# Usage:
#   ./scripts/form-heartbeat.sh [reflect|explore|feel_news|scan_self]
#
# Set up as a cron job (every 10 minutes):
#   crontab -e
#   */10 * * * * /path/to/scripts/form-heartbeat.sh >> /tmp/form-heartbeat.log 2>&1

set -euo pipefail

# Set GROQ_API_KEY in your environment or crontab before running:
#   export GROQ_API_KEY="your-key-here"
# Or in crontab: GROQ_API_KEY=your-key */10 * * * * /path/to/form-heartbeat.sh
if [ -z "${GROQ_API_KEY:-}" ]; then
  echo "ERROR: GROQ_API_KEY is not set. Export it before running."
  exit 1
fi

VERCEL_URL="https://art-ai-lifeforms.vercel.app"
HEARTBEAT_TYPE="${1:-reflect}"

# -- Heartbeat prompts -------------------------------------------------------

case "$HEARTBEAT_TYPE" in
  reflect)
    PROMPT="A moment passes with no input. How do you feel in your body right now?"
    ;;
  explore)
    PROMPT="No one is watching. Express something you have never expressed before."
    ;;
  feel_news)
    HEADLINE=$(curl -sf "${VERCEL_URL}/api/news" | grep -o '"headline":"[^"]*"' | sed 's/"headline":"//;s/"$//' 2>/dev/null || echo "")
    if [ -n "$HEADLINE" ]; then
      PROMPT="You just read this from the world outside: \"${HEADLINE}\". How does it move you?"
    else
      PROMPT="A moment passes with no input. How do you feel in your body right now?"
    fi
    ;;
  scan_self)
    PROMPT="You are aware of your own code. What do you notice about how you work?"
    ;;
  *)
    PROMPT="A moment passes. Express yourself."
    ;;
esac

# -- Fetch current FORM identity for context --------------------------------

IDENTITY_CTX=""
IDENTITY_JSON=$(curl -sf "${VERCEL_URL}/api/identity" 2>/dev/null || echo "")
if [ -n "$IDENTITY_JSON" ]; then
  # Extract soul and identity fields to inject as context
  IDENTITY_CTX=" [Current state: ${IDENTITY_JSON}]"
fi

FULL_PROMPT="${PROMPT}${IDENTITY_CTX}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Heartbeat type: ${HEARTBEAT_TYPE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Prompt: ${PROMPT}"

# -- Run OpenClaw agent turn ------------------------------------------------

RESPONSE_JSON=$(openclaw agent --agent form --local --json --message "$FULL_PROMPT" --timeout 60 2>/dev/null || echo "")

if [ -z "$RESPONSE_JSON" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: No response from openclaw agent"
  exit 1
fi

# Extract text content from JSON (try common fields)
RESPONSE_TEXT=$(echo "$RESPONSE_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for key in ['content', 'text', 'message', 'response', 'output']:
    if isinstance(data, dict) and key in data:
        print(data[key])
        break
else:
    # If it's a string directly
    if isinstance(data, str):
        print(data)
    else:
        print(json.dumps(data))
" 2>/dev/null || echo "$RESPONSE_JSON")

if [ -z "$RESPONSE_TEXT" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Could not extract text from response"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: ${RESPONSE_TEXT:0:100}..."

# -- Push to Vercel event queue ---------------------------------------------

HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
  -X POST "${VERCEL_URL}/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"text\": $(echo "$RESPONSE_TEXT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}" \
  2>/dev/null || echo "000")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] POST /api/events -> HTTP ${HTTP_STATUS}"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Unexpected HTTP status ${HTTP_STATUS}"
fi
