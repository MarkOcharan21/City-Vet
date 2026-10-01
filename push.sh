#!/bin/bash
# Quick commit & push script
# Usage: ./push.sh "commit message"

cd "C:/xampp/htdocs/pet-vet-system revise" || exit 1

MSG="${1:-Auto-update: $(date '+%Y-%m-%d %H:%M')}"

git add -A
git commit -m "$MSG"
git push origin main

echo "✅ Pushed: $MSG"