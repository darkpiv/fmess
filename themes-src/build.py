#!/usr/bin/env python3
"""Build fMess themes from their sources.

    python3 -I build.py                 # every theme in THEMES, into the repo
    python3 -I build.py <src.css> <out.css>

Placeholders, resolved relative to the source file's folder:

  {{include:file.css}}  the file's text (placeholders inside it are resolved too)
  {{icon:name}}         url("data:image/svg+xml,...") of octicons/<name>.svg
                        (looked up next to the source, then in github/octicons)
  {{font:path.woff2}}   url("data:font/woff2;base64,...")

The output is byte-identical between runs. fMess's limits (themes.rs): at most
2 MB, no @import, url() only with data:, five hex preview colours.
"""
import base64
import re
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent / "src-tauri" / "themes"
THEMES = {
    "github/github.src.css": "github.css",
    "github/github-split.src.css": "github-split.css",
    "terminal/terminal.src.css": "terminal.css",
    "terminal/terminal-green.src.css": "terminal-green.css",
    "terminal/terminal-amber.src.css": "terminal-amber.css",
    "terminal/terminal-crt.src.css": "terminal-crt.css",
}


def icon(folder: Path, name: str) -> str:
    for place in (folder / "octicons", ROOT / "github" / "octicons"):
        path = place / f"{name}.svg"
        if path.exists():
            svg = re.sub(r'\s(width|height)="\d+"', "", path.read_text().strip())
            return 'url("data:image/svg+xml,' + quote(svg, safe=" =:/,.-") + '")'
    sys.exit(f"no icon {name}")


def resolve(path: Path) -> str:
    folder = path.parent
    text = path.read_text()
    text = re.sub(r"\{\{include:([\w./-]+)\}\}", lambda m: resolve(folder / m.group(1)), text)
    text = re.sub(r"\{\{icon:([\w-]+)\}\}", lambda m: icon(folder, m.group(1)), text)
    text = re.sub(
        r"\{\{font:([\w./-]+)\}\}",
        lambda m: 'url("data:font/woff2;base64,' + base64.b64encode((folder / m.group(1)).read_bytes()).decode() + '")',
        text,
    )
    return text


def check(css: str) -> None:
    if "{{" in css:
        sys.exit("unreplaced placeholder: " + css[css.index("{{") : css.index("{{") + 40])
    body = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    if "@import" in body.lower():
        sys.exit("@import is not allowed")
    for url in re.findall(r"(?i)\b(?:url|src)\(\s*(.{0,6})", body):
        if not url.startswith('"data:'):
            sys.exit("non-data url(): " + url)
    if re.search(r"(?i)(?<![\w-])(image-set|-webkit-image-set|image|cross-fade|element|expression)\(", body):
        sys.exit("a loading function")
    head = css.lstrip()[2:].split("*/")[0]
    fields = {l.split(":", 1)[0].strip().lower(): l.split(":", 1)[1].strip() for l in head.splitlines() if ":" in l}
    colours = fields.get("preview", "").split()
    if not fields.get("name") or len(colours) != 5 or not all(re.fullmatch(r"#[0-9a-fA-F]{3,8}", c) for c in colours):
        sys.exit("needs a name and five hex preview colours")
    if len(css.encode()) > 2 * 1024 * 1024:
        sys.exit("over fMess's 2 MB limit")


def build(src: Path, out: Path) -> None:
    css = resolve(src)
    check(css)
    out.write_text(css)
    print(f"{out}: {len(css.encode()):,} bytes")


if __name__ == "__main__":
    if len(sys.argv) == 3:
        build(Path(sys.argv[1]).resolve(), Path(sys.argv[2]))
    elif len(sys.argv) == 1:
        for src, out in THEMES.items():
            build(ROOT / src, REPO / out)
    else:
        sys.exit(__doc__)
