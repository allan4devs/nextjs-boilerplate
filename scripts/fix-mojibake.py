"""
Fix classic UTF-8-as-Latin-1 mojibake (e.g. dÃ­as -> días)
and normalize curly quotes / dashes that often look broken on mobile.
"""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules", ".next", ".git", "dist", ".claude", "mcps", "terminals"}
EXTS = {".ts", ".tsx", ".js", ".jsx", ".css", ".md", ".json", ".html"}

FANCY = {
    "\u201c": '"',  # “
    "\u201d": '"',  # ”
    "\u2018": "'",  # ‘
    "\u2019": "'",  # ’
    "\u2014": "-",  # —
    "\u2013": "-",  # –
    "\u2026": "...",  # …
}


def fix_text(text: str) -> tuple[str, bool]:
    changed = False
    lines_out: list[str] = []
    for line in text.splitlines(keepends=True):
        if "\u00c3" in line or "\u00c2" in line:  # Ã or Â
            try:
                candidate = line.encode("latin-1").decode("utf-8")
                if candidate.count("\u00c3") < line.count("\u00c3"):
                    line = candidate
                    changed = True
            except (UnicodeDecodeError, UnicodeEncodeError):
                pass
        lines_out.append(line)
    text2 = "".join(lines_out)
    for src, dst in FANCY.items():
        if src in text2:
            text2 = text2.replace(src, dst)
            changed = True
    return text2, changed


def main() -> None:
    fixed: list[str] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            path = Path(dirpath) / name
            if path.suffix.lower() not in EXTS:
                continue
            try:
                raw = path.read_bytes()
                text = raw.decode("utf-8")
            except Exception:
                continue
            if "caracteres corruptos" in text:
                continue
            new, changed = fix_text(text)
            if changed and new != text:
                # Preserve UTF-8 without BOM; normalize newlines to \n
                path.write_text(new.replace("\r\n", "\n"), encoding="utf-8", newline="\n")
                fixed.append(str(path.relative_to(ROOT)))

    print(f"fixed {len(fixed)} files")
    for f in fixed:
        print(f)


if __name__ == "__main__":
    main()
