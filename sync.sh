#!/bin/bash
# sync.sh — commit everything and push to GitHub
# Usage: ./sync.sh
#        ./sync.sh "your commit message"

set -e

cd "$(dirname "$0")"

if git diff --quiet && git diff --cached --quiet; then
  echo "Nothing to sync — working tree is clean."
  exit 0
fi

MSG="${1:-sync: $(date '+%Y-%m-%d %H:%M')}"

git add .
git commit -m "$MSG"
git push

echo "Synced to GitHub."
