#!/bin/bash
# sync.sh — update changelog, commit everything, push to GitHub
# Usage: ./sync.sh "what changed"
#        ./sync.sh              (timestamped entry, no changelog update)

set -e

cd "$(dirname "$0")"

if git diff --quiet && git diff --cached --quiet; then
  echo "Nothing to sync — working tree is clean."
  exit 0
fi

MSG="${1:-sync: $(date '+%Y-%m-%d %H:%M')}"

# If a message was explicitly provided, append it to [Unreleased] in CHANGELOG.md
if [ -n "$1" ]; then
  python3 - "$MSG" <<'PYEOF'
import sys, re

entry = "- " + sys.argv[1]
path  = "CHANGELOG.md"
text  = open(path).read()

# Insert the entry on the first blank line after ## [Unreleased]
updated = re.sub(
    r'(## \[Unreleased\]\n)',
    r'\1\n' + entry + r'\n',
    text,
    count=1
)

open(path, "w").write(updated)
PYEOF
  echo "CHANGELOG.md updated."
fi

git add .
git commit -m "$MSG"
git push

echo "Synced to GitHub."
