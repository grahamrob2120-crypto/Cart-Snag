#!/usr/bin/env python3
"""Zero-dependency smoke checks for the existing Cart Snag static frontend."""
from html.parser import HTMLParser
from pathlib import Path
import sys

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.duplicates = set()
        self.scripts = []
        self.title = False
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if "id" in values:
            if values["id"] in self.ids:
                self.duplicates.add(values["id"])
            self.ids.add(values["id"])
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"])
        if tag == "title":
            self.title = True

def main():
    root = Path(__file__).resolve().parents[1]
    page = root / "index.html"
    if not page.is_file():
        raise AssertionError("index.html missing")
    html = page.read_text(encoding="utf-8")
    parser = PageParser()
    parser.feed(html)
    parser.close()
    assert parser.title, "Missing document title"
    assert not parser.duplicates, f"Duplicate element IDs: {sorted(parser.duplicates)}"
    assert "Cart Snag" in html, "Brand name missing"
    for src in parser.scripts:
        if src.startswith(("https://", "http://", "//", "data:")):
            continue
        path = src.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        assert (root / path).is_file(), f"Missing local script: {src}"
    print(f"Static frontend smoke checks passed ({len(parser.ids)} unique IDs).")

if __name__ == "__main__":
    try:
        main()
    except (AssertionError, OSError, UnicodeError) as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
