#!/usr/bin/env bash
# Smoke check (no npm): required files at repo root after merge.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for f in index.html snippets.json; do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: missing $f" >&2
    exit 1
  fi
done

echo "OK: index.html and snippets.json present."
