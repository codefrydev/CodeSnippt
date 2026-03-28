#!/usr/bin/env bash
# Automatic smoke check (no npm): required files + CodeMirror CDN reachable.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for f in index.html snippets.json; do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: missing $f" >&2
    exit 1
  fi
done

grep -q 'cdnjs.cloudflare.com/ajax/libs/codemirror' index.html || { echo "FAIL: index.html should load CodeMirror from cdnjs" >&2; exit 1; }

check_url() {
  local url="$1"
  local code
  code="$(curl -sf -o /dev/null -w "%{http_code}" "$url")" || true
  if [[ "$code" != "200" ]]; then
    echo "FAIL: HTTP $code for $url" >&2
    exit 1
  fi
}

check_url "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/codemirror.min.js"
check_url "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.17/mode/clike/clike.min.js"

echo "OK: index.html and CodeMirror 5 CDN endpoints."
