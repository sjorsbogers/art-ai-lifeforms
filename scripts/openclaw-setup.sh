#!/usr/bin/env bash
# openclaw-setup.sh
# Step-by-step setup for FORM's OpenClaw + Ollama autonomous brain.
# Run each section manually — do NOT run this script all at once.
#
# Prerequisites: openclaw installed (npm i -g openclaw)

echo "=== FORM OpenClaw Setup Guide ==="
echo "Run each step manually in your terminal."
echo ""

echo "--- STEP 1: Update Ollama ---"
echo "brew install ollama"
echo "# This installs 0.17.0 alongside the old binary."
echo "# After install, the new binary will be at /opt/homebrew/bin/ollama"
echo ""

echo "--- STEP 2: Start Ollama ---"
echo "ollama serve"
echo "# Leave this running in a terminal, or:"
echo "brew services start ollama"
echo ""

echo "--- STEP 3: Pull the FORM model ---"
echo "ollama pull mistral"
echo "# ~4GB download. mistral:7b follows structured output reliably."
echo "# Alternative (smaller, faster): ollama pull llama3.2"
echo ""

echo "--- STEP 4: Initialize OpenClaw workspace ---"
echo "openclaw setup"
echo "# Creates ~/.openclaw/ directory and default config."
echo ""

echo "--- STEP 5: Configure OpenClaw to use Ollama ---"
echo "openclaw models set ollama/mistral"
echo "# Sets Ollama + mistral as the default model."
echo "# The OLLAMA_API_KEY env var is not needed (Ollama has no auth)."
echo ""

echo "--- STEP 6: Create the FORM agent ---"
echo "openclaw agents add --id form"
echo "# Creates an isolated FORM agent workspace at ~/.openclaw/agents/form/"
echo ""

echo "--- STEP 7: Install the FORM skill ---"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
echo "# Find the form agent workspace:"
echo "openclaw agents list"
echo ""
echo "# Copy the FORM skill (adjust path if agents list shows different location):"
echo "mkdir -p ~/.openclaw/agents/form/workspace/skills/form"
echo "cp \"${PROJECT_DIR}/openclaw-skill/SKILL.md\" ~/.openclaw/agents/form/workspace/skills/form/SKILL.md"
echo ""

echo "--- STEP 8: Test the agent ---"
echo "openclaw agent --agent form --local --json --message \"A moment passes. How do you feel?\""
echo "# You should see MOTION: / FREQUENCY: etc. in the output."
echo ""

echo "--- STEP 9: Make the heartbeat script executable ---"
echo "chmod +x \"${PROJECT_DIR}/scripts/form-heartbeat.sh\""
echo ""

echo "--- STEP 10: Test the heartbeat ---"
echo "\"${PROJECT_DIR}/scripts/form-heartbeat.sh\" reflect"
echo "# Should print: Done. and HTTP 200"
echo ""

echo "--- STEP 11: Set up system cron (every 10 minutes) ---"
echo "crontab -e"
echo "# Add this line:"
echo "*/10 * * * * \"${PROJECT_DIR}/scripts/form-heartbeat.sh\" >> /tmp/form-heartbeat.log 2>&1"
echo ""

echo "=== Done! FORM will now think autonomously every 10 minutes. ==="
