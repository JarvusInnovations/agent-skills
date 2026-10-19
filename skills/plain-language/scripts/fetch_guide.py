#!/usr/bin/env python3
"""Fetch the digital.gov Plain Language Guide and write it as Markdown reference files.

Usage:  python3 scripts/fetch_guide.py [output_dir]

Writes one file per guide section (principles, writing, design, test) plus the
Plain Writing Act resource page into the references/ folder next to this
script, or into output_dir if given. Each file keeps
the source URL of every page so the text can be checked against the site.

Requires: requests-free (uses urllib), beautifulsoup4, pandoc on PATH.
"""
import pathlib
import re
import subprocess
import sys
import urllib.request

from bs4 import BeautifulSoup

BASE = "https://digital.gov/guides/plain-language"

# section -> (file name, [(page title override or None, url)])
SECTIONS = {
    "principles": [
        f"{BASE}/principles",
        f"{BASE}/principles/write-for-reader",
        f"{BASE}/principles/organize",
        f"{BASE}/principles/short-simple",
        f"{BASE}/principles/avoid-jargon",
    ],
    "writing": [
        f"{BASE}/writing",
        f"{BASE}/writing/clear-short",
        "https://digital.gov/guides/writing-understanding/familiar-terms",
        f"{BASE}/writing/style",
        f"{BASE}/writing/special-cases",
    ],
    "design": [
        f"{BASE}/design",
        f"{BASE}/design/headings",
        f"{BASE}/design/lists",
        f"{BASE}/design/tables",
        f"{BASE}/design/visuals",
        f"{BASE}/design/links",
    ],
    "testing": [
        f"{BASE}/test",
        f"{BASE}/test/paraphrase-testing",
        f"{BASE}/test/usability-testing",
        f"{BASE}/test/comparative-studies",
    ],
    "plain-writing-act": [
        "https://digital.gov/resources/plain-writing-act",
    ],
}

SECTION_TITLES = {
    "principles": "Principles of plain language",
    "writing": "Writing for understanding",
    "design": "Design for understanding",
    "testing": "Test for understanding",
    "plain-writing-act": "Requirements for plain writing (Plain Writing Act of 2010)",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "plain-language-skill/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def page_to_markdown(html: str, url: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    # The guide pages mark the current subpage in the menu bar; use it as the page heading.
    current = soup.find("a", class_="dg-current")
    page_name = current.get("title") if current else None
    if url.rstrip("/").endswith("/design/tables"):
        page_name = "Tables"  # the site's menu mislabels this page as "Design"
    body = soup.find("div", class_="dg-guide__content-body")
    if body is None:  # resource pages use a different layout
        body = soup.find("main") or soup.find("div", id="main-content") or soup.body
        for sel in ["nav", ".usa-breadcrumb", ".dg-promos", ".touchpoints-form-container", "header", "footer", ".dg-promos__wrapper"]:
            for t in body.select(sel):
                t.decompose()
        h1 = body.find("h1")
        if h1:
            page_name = h1.get_text(strip=True)
            h1.decompose()
    for img in body.find_all("img"):
        img.decompose()
    for t in body.find_all("span"):
        t.unwrap()
    for a in body.find_all("a"):
        href = a.get("href", "")
        if href.startswith("/"):
            href = "https://digital.gov" + href
        a.attrs = {"href": href}
    # Do/don't tables: flatten cell content so pandoc emits pipe tables.
    for th in body.find_all("th"):
        th.string = th.get_text(" ", strip=True)
    for td in body.find_all("td"):
        parts = []
        for child in td.children:
            if getattr(child, "name", None) in ("ul", "ol"):
                parts.append(" ".join("• " + li.get_text(" ", strip=True) for li in child.find_all("li")))
            else:
                t = child.get_text(" ", strip=True) if hasattr(child, "get_text") else str(child).strip()
                if t:
                    parts.append(t)
        td.clear()
        td.append(" ".join(parts))
    for t in body.find_all(["colgroup", "caption"]):
        t.decompose()
    md = subprocess.run(
        ["pandoc", "-f", "html", "-t", "gfm", "--wrap=none"],
        input=str(body), text=True, capture_output=True, check=True,
    ).stdout
    md = re.sub(r"\{\.usa-table[^}]*\}", "", md)
    md = re.sub(r"<img[^>]*>\s*", "", md)  # inline icons in callout headings
    md = re.sub(r"<div[^>]*>|</div>", "", md)
    md = re.sub(r"^#{1,6}\s*$", "", md, flags=re.M)
    md = re.sub(r"\\\n", "\n", md)
    # Demote headings so section file has one H1 and each page is an H2.
    md = re.sub(r"^(#{1,4}) ", lambda m: "#" * min(len(m.group(1)) + 1, 6) + " ", md, flags=re.M)
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return f"## {page_name or 'Overview'}\n\nSource: {url}\n\n{md}\n"


def main() -> None:
    default_dir = pathlib.Path(__file__).resolve().parent.parent / "references"
    out_dir = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else default_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    for section, urls in SECTIONS.items():
        chunks = [f"# {SECTION_TITLES[section]}\n\nScraped from digital.gov's Plain Language Guide series ({BASE}). "
                  "Text is reproduced as published (U.S. Government work, public domain); headings were "
                  "renumbered so each page sits under one section heading.\n"]
        for url in urls:
            print(f"fetching {url}", file=sys.stderr)
            chunks.append(page_to_markdown(fetch(url), url))
        (out_dir / f"{section}.md").write_text("\n\n".join(chunks))
        print(f"wrote {out_dir / (section + '.md')}", file=sys.stderr)


if __name__ == "__main__":
    main()
