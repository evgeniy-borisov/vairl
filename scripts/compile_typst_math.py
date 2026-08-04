#!/usr/bin/env python3
"""Compile ```typst-math fenced blocks in markdown to SVG and inline <figure> tags.

Used by publish_article.py. Requires `typst` on PATH (brew install typst).
"""

from __future__ import annotations

import hashlib
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATH_DIR = ROOT / "assets" / "math"

FENCE_RE = re.compile(
    r"^```typst-math[^\n]*\n(.*?)(?:\n)?^```[ \t]*$",
    re.MULTILINE | re.DOTALL,
)

TEMPLATE = """\
#set page(width: auto, height: auto, margin: (x: 8pt, y: 6pt))
#set text(size: 15pt, fill: rgb(30, 30, 30))
{body}
"""


def _typst_bin() -> str:
    path = shutil.which("typst")
    if not path:
        raise RuntimeError(
            "typst CLI not found. Install: brew install typst "
            "(or https://github.com/typst/typst/releases)"
        )
    return path


def _normalize_body(body: str) -> str:
    body = body.strip()
    if not body:
        raise ValueError("empty typst-math block")
    # Allow raw equation without $…$; wrap as display math.
    if "$" not in body and not body.lstrip().startswith("#"):
        body = f"$ {body} $"
    return body


def compile_typst_to_svg(body: str, out_svg: Path) -> None:
    typst = _typst_bin()
    source = TEMPLATE.format(body=_normalize_body(body))
    out_svg.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="vairl-typst-") as tmp:
        typ_path = Path(tmp) / "formula.typ"
        typ_path.write_text(source, encoding="utf-8")
        proc = subprocess.run(
            [typst, "compile", str(typ_path), str(out_svg)],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(
                f"typst compile failed:\n{proc.stderr or proc.stdout}\n---\n{source}"
            )


def render_figure(svg_web_path: str, alt: str) -> str:
    alt_esc = alt.replace('"', "'")
    # Liquid relative_url so baseurl (/vairl) is applied at Jekyll build.
    return (
        f'<figure class="typst-math">\n'
        f'  <img src="{{{{ \'{svg_web_path}\' | relative_url }}}}" '
        f'alt="{alt_esc}" loading="lazy" />\n'
        f"</figure>"
    )


def process_markdown(text: str, *, slug: str = "math") -> tuple[str, int]:
    """Replace ```typst-math blocks with compiled SVG figures. Returns (text, count)."""
    count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal count
        body = match.group(1)
        digest = hashlib.sha256(body.encode("utf-8")).hexdigest()[:12]
        filename = f"{slug}-{digest}.svg"
        out_svg = MATH_DIR / filename
        if not out_svg.exists():
            compile_typst_to_svg(body, out_svg)
        count += 1
        first_line = next(
            (ln.strip() for ln in body.splitlines() if ln.strip()),
            "formula",
        )
        alt = first_line[:80]
        return render_figure(f"/assets/math/{filename}", alt)

    new_text = FENCE_RE.sub(repl, text)
    return new_text, count


def main() -> int:
    parser_args = sys.argv[1:]
    if not parser_args:
        print(
            "Usage: compile_typst_math.py <file.md> [file.md...]\n"
            "  Compiles ```typst-math blocks in place (writes SVG under assets/math/).",
            file=sys.stderr,
        )
        return 2

    total = 0
    for arg in parser_args:
        path = Path(arg)
        if not path.is_absolute():
            path = ROOT / path
        text = path.read_text(encoding="utf-8")
        slug = path.stem
        new_text, n = process_markdown(text, slug=slug)
        if n:
            path.write_text(new_text, encoding="utf-8")
            print(f"{path.relative_to(ROOT)}: compiled {n} typst-math block(s)")
        else:
            print(f"{path.relative_to(ROOT)}: no typst-math blocks")
        total += n
    print(f"done: {total} formula(s)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
