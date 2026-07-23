"""Find and fix string literals broken when curly quotes became straight quotes."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"node_modules", ".next", ".git", "dist", "scripts"}

# Common pattern after bad replace: "... → "Text" ..."
# Fix: replace inner "word" with «word» or 'word' inside double-quoted strings.

def fix_line(line: str) -> str:
    # Only touch lines that look like broken nested double quotes
    if line.count('"') < 4:
        return line
    # Skip import paths and classNames-heavy lines with many quotes already escaped
    if "className=" in line and line.count('\\"') == 0 and line.count('"') > 6:
        # still may be broken message lines without className
        pass

    # Pattern: open string ... "Inner phrase" ... close string
    # Use Spanish guillemets for inner quotes (mobile-safe, valid UTF-8)
    # Only when → or words suggest UI copy, not code.

    def repl_inner(m: re.Match[str]) -> str:
        inner = m.group(1)
        # Don't touch empty or code-looking
        if not inner or re.fullmatch(r"[\w./#-]+", inner):
            return m.group(0)
        return f"«{inner}»"

    # Replace "Something with spaces or accents" that appears mid-string
    # after → or after : or after space following non-escape
    new = re.sub(
        r'(?<=[→:\s])"([^"]{2,80})"(?=[\s,.]|[yYaAeEoO])',
        repl_inner,
        line,
    )
    return new


def main() -> None:
    fixed_files: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP for part in path.parts):
            continue
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines(keepends=True)
        out: list[str] = []
        changed = False
        for line in lines:
            new = fix_line(line)
            if new != line:
                changed = True
            out.append(new)
        if changed:
            path.write_text("".join(out), encoding="utf-8", newline="\n")
            fixed_files.append(str(path.relative_to(ROOT)))
    print("fixed", len(fixed_files))
    for f in fixed_files:
        print(f)


if __name__ == "__main__":
    main()
