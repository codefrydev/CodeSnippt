#!/usr/bin/env python3
"""Merge data/*.json into snippets.json at the repository root (generated; gitignored)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _get_ci(d: dict, name: str):
    """Case-insensitive key lookup (matches System.Text.Json PropertyNameCaseInsensitive)."""
    for k, v in d.items():
        if k.lower() == name.lower():
            return v
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-r",
        "--repo-root",
        type=Path,
        default=None,
        help="Repository root (default: current working directory)",
    )
    args = parser.parse_args()
    repo_root = (args.repo_root.resolve() if args.repo_root else Path.cwd().resolve())
    data_dir = repo_root / "data"
    output_path = repo_root / "snippets.json"

    if not data_dir.is_dir():
        print(f"Data directory not found: {data_dir}", file=sys.stderr)
        return 1

    json_files = sorted(data_dir.glob("*.json"), key=lambda p: p.name.lower())
    if not json_files:
        print(f"No JSON files in {data_dir}", file=sys.stderr)
        return 1

    categories: list[dict] = []
    seen_ids: set[str] = set()

    for path in json_files:
        try:
            text = path.read_text(encoding="utf-8")
            cat = json.loads(text)
        except (OSError, json.JSONDecodeError) as ex:
            print(f"Failed to read {path}: {ex}", file=sys.stderr)
            return 1

        if not isinstance(cat, dict):
            print(f"Invalid or empty JSON: {path}", file=sys.stderr)
            return 1

        category = (_get_ci(cat, "category") or "").strip()
        icon_key = (_get_ci(cat, "iconKey") or "").strip()
        snippets = _get_ci(cat, "snippets")

        if not category:
            print(f"Missing category in {path}", file=sys.stderr)
            return 1
        if not icon_key:
            print(f"Missing iconKey in {path}", file=sys.stderr)
            return 1
        if not isinstance(snippets, list) or len(snippets) == 0:
            print(f"No snippets in {path}", file=sys.stderr)
            return 1

        for i, raw in enumerate(snippets):
            if not isinstance(raw, dict):
                print(f"Snippet at index {i} in {path} is not an object", file=sys.stderr)
                return 1
            sid = str(_get_ci(raw, "id") or "").strip()
            title = str(_get_ci(raw, "title") or "").strip()
            code = str(_get_ci(raw, "code") or "").strip()
            desc = str(_get_ci(raw, "desc") or "").strip()

            if not sid:
                print(f"Snippet at index {i} in {path} has empty id", file=sys.stderr)
                return 1
            if sid in seen_ids:
                print(f"Duplicate snippet id '{sid}' (in {path})", file=sys.stderr)
                return 1
            seen_ids.add(sid)
            if not title:
                print(f"Snippet '{sid}' in {path} has empty title", file=sys.stderr)
                return 1
            if not code:
                print(f"Snippet '{sid}' in {path} has empty code", file=sys.stderr)
                return 1
            if not desc:
                print(f"Snippet '{sid}' in {path} has empty desc", file=sys.stderr)
                return 1

        categories.append(cat)

    categories.sort(
        key=lambda c: str(_get_ci(c, "category") or "").lower(),
    )

    out_models = []
    for c in categories:
        out_models.append(
            {
                "category": _get_ci(c, "category"),
                "iconKey": _get_ci(c, "iconKey"),
                "snippets": _normalize_snippets(_get_ci(c, "snippets")),
            }
        )

    try:
        output_path.write_text(
            json.dumps(out_models, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    except OSError as ex:
        print(f"Failed to write {output_path}: {ex}", file=sys.stderr)
        return 1

    print(f"Wrote {len(out_models)} categories to {output_path}")
    return 0


def _normalize_snippets(snippets: list) -> list[dict]:
    """Emit stable key order per snippet for readable diffs."""
    out = []
    for raw in snippets:
        if not isinstance(raw, dict):
            continue
        out.append(
            {
                "id": _get_ci(raw, "id"),
                "title": _get_ci(raw, "title"),
                "code": _get_ci(raw, "code"),
                "desc": _get_ci(raw, "desc"),
            }
        )
    return out


if __name__ == "__main__":
    raise SystemExit(main())
