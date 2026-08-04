#!/usr/bin/env python3
"""Promote a reviewed article from publications/ to _posts/ or _private_posts/."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "_posts"
PRIVATE = ROOT / "_private_posts"


def _compile_typst_math(text: str, slug: str) -> str:
    """Compile ```typst-math fences to SVG figures when typst is available."""
    try:
        from compile_typst_math import process_markdown
    except ImportError:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from compile_typst_math import process_markdown

    if "```typst-math" not in text:
        return text
    try:
        new_text, n = process_markdown(text, slug=slug)
    except RuntimeError as exc:
        print(f"Warning: typst-math skipped: {exc}", file=sys.stderr)
        return text
    if n:
        print(f"  typst-math: compiled {n} formula(s) → assets/math/")
    return new_text


def parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm_block = text[3:end].strip()
    body = text[end + 4 :].lstrip("\n")
    meta: dict[str, str] = {}
    for line in fm_block.splitlines():
        m = re.match(r"^([a-zA-Z0-9_]+):\s*(.*)$", line)
        if m:
            key, val = m.group(1), m.group(2).strip()
            meta[key] = val.strip('"').strip("'")
    return meta, body


def main() -> int:
    parser = argparse.ArgumentParser(description="Publish article to Jekyll")
    parser.add_argument("source", type=Path, help="Path under publications/")
    parser.add_argument(
        "--visibility",
        choices=("public", "private"),
        help="Override visibility from front matter",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    src = args.source if args.source.is_absolute() else ROOT / args.source
    if not src.exists():
        print(f"Error: file not found: {src}", file=sys.stderr)
        return 1

    rel = src.relative_to(ROOT)
    if "publications" not in rel.parts:
        print(f"Error: source must be under publications/: {rel}", file=sys.stderr)
        return 1

    if "local" in rel.parts:
        print(
            f"Error: local articles cannot be published: {rel}\n"
            "Move to publications/public/ or publications/private/ first.",
            file=sys.stderr,
        )
        return 1

    if "science" in rel.parts:
        print(
            f"Error: science manuscripts are not published to VAIRL site: {rel}\n"
            "Use review-science-orchestrator for scientific peer-review.",
            file=sys.stderr,
        )
        return 1

    text = src.read_text(encoding="utf-8")
    meta, _ = parse_front_matter(text)
    text = _compile_typst_math(text, slug=src.stem)

    visibility = args.visibility or meta.get("visibility", "public")
    if visibility == "local":
        print(
            "Error: visibility is 'local'. Move file to public/ or private/ and update front matter.",
            file=sys.stderr,
        )
        return 1
    if visibility not in ("public", "private"):
        print(f"Error: invalid visibility: {visibility}", file=sys.stderr)
        return 1

    review_status = meta.get("review_status", "draft")
    if review_status not in ("approved", "minor"):
        print(
            f"Warning: review_status is '{review_status}', expected 'approved' or 'minor'",
            file=sys.stderr,
        )

    dest_dir = POSTS if visibility == "public" else PRIVATE
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / src.name

    if visibility == "public":
        if meta.get("layout") == "private-post":
            text = text.replace("layout: private-post", "layout: post", 1)
    else:
        if "layout: post" in text and "layout: private-post" not in text:
            text = text.replace("layout: post", "layout: private-post", 1)
        elif "layout:" not in text[:200]:
            text = "---\nlayout: private-post\n" + text.lstrip("-").lstrip("-").lstrip("\n")

    if args.dry_run:
        print(f"Would write: {src} -> {dest}")
        return 0

    dest.write_text(text, encoding="utf-8")
    print(f"Published ({visibility}): {dest.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
