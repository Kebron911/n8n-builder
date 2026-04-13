#!/bin/bash
# Build a .plugin zip excluding deep eval/workspace dirs that exceed Cowork's 10-level depth limit.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="/tmp/n8n-builder.plugin"

cd "$REPO_ROOT"

rm -f "$OUTPUT"

zip -r "$OUTPUT" . \
  -x '.git/*' \
  -x '.claude/skills/*/evals/*' \
  -x '.claude/skills/*-workspace/*' \
  -x 'scripts/build-plugin-zip.sh' \
  -x 'node_modules/*' \
  -x '*.plugin' \
  -x 'zigbfJtz'

# Verify no file exceeds depth 10
MAX_DEPTH=$(unzip -l "$OUTPUT" | awk '/----/{found=1;next} found && NF>=4{print $NF}' | awk -F/ '{print NF}' | sort -rn | head -1)
if [ "$MAX_DEPTH" -gt 10 ] 2>/dev/null; then
  echo "WARNING: max depth is $MAX_DEPTH (limit is 10). Offending files:"
  unzip -l "$OUTPUT" | awk '/----/{found=1;next} found && NF>=4{print $NF}' | awk -F/ 'NF > 10'
  exit 1
fi

echo "Built $OUTPUT (max depth: $MAX_DEPTH)"
ls -lh "$OUTPUT"
