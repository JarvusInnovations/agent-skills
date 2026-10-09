# Google Docs mechanics (gws-axi)

The workflow maps onto Google Docs tabs: one README tab (the status header), one tab per generation. This file is
what you need to know about driving that with `gws-axi` and where the tool currently falls short.
Check the installed version first; the gaps below are being closed.

```sh
gws-axi --version
gws-axi docs --help
```

## Creating and writing

```sh
# new document, from a markdown file; the first tab is the header
gws-axi docs create --title "<Title> [SNAPSHOT YYYY-MM-DD]" ./header.md --account <you>

# a new generation, into a new tab
gws-axi docs write <docId> ./v2.md --new-tab "v2 YYYY-MM-DD" --account <you>
```

Writes require `--account` whenever more than one Google account is authenticated. `docs write`
replaces the content of exactly one tab; other tabs are untouched.

In this workflow you only ever write **new** tabs: the header at creation, then one tab per
generation. There is no in-place rewrite of an existing tab. gws-axi's markdown round-trip is
lossy on tables (column widths, cell formatting), which is exactly why: a human who has cleaned
up a table will not get it back after a whole-tab rewrite. If you find yourself wanting
`--tab <id>` on a tab a human has touched, stop; that's a new generation or a prompt to the
author, not a write.

## Finding what humans changed

```sh
# the tab as it is now
gws-axi docs read <docId> --tab <tabId> --full --out ./current.md

# the markdown you wrote for it, from the blob in its Source row
BLOB=$(grep -o 'blob:[0-9a-f]*' ./current.md | head -1 | cut -d: -f2)
git cat-file -p $BLOB > ./written.md
diff ./written.md ./current.md

# comments, with the text they quote (not part of tab content)
gws-axi docs comments <docId>

```

The local diff is the only per-tab method. `docs revisions` / `docs diff` operate on Drive
revisions, which export the **whole document with every tab concatenated**, from a sparse
retained sample, with `author` being the same account for you and the author. On a tabbed
document that tells you nothing usable about one tab (a tab-scoped diff is requested in
gws-axi#110). Keep your generation sources somewhere durable; they're what make "edit what you
care about" true for reviewers.

Normalize before you diff: the read-back pads cell delimiters (`|  |`, `| --- |`), escapes some
punctuation, and has no trailing newline, so run both sides through the same filter first or every
table row shows as changed:

```sh
norm(){ sed -e '/^<!-- cols:/d' -e '/^| \*\*Source\*\* |/d' -e 's/\\//g' -e 's/ *| */|/g' -e 's/-\{3,\}/---/g' -e '/^\s*$/d' "$1" | sed '$a\'; }
diff <(norm written.md) <(norm current.md)
```

An empty result means no human edits to the *content*; anything left is one. Width hints and
the Source row are dropped from the comparison (formatting, and injected at write time), but read
the width hint separately and keep it.

```sh
gws-axi docs read <docId> --tab <tabId> --full --out ./current.md
gws-axi docs comments <docId>
```

Comments are not in the tab content; pull them separately with `docs comments` before each round.
They're the reviewers' input in Generating.

## What the markdown writer can represent

Headings, emphasis, code, links, lists, task lists, quotes, tables, rules, images by URL,
footnotes. Anything else is written as text and listed under `lossy[]` in the result; check that
field after every write.

Tables, as of 0.34:

- A `cols` hint on the line before a table sets its column widths. `<!-- cols: fit 1 -->` is
  the one to use on the status table and the stamp: `fit` sizes the label column to its widest
  label (measured as Arial, the Docs default; a tab in another font gets a `help[]` note), and
  the `1` gives the value column everything else. Weights (`1 4`) and percentages (`20% 80%`)
  also work. `docs read` emits the hint back as percentages for any table whose columns are
  fixed and unequal, including columns a human dragged by hand, so a hint in the read-back is a
  human preference: carry it into the next generation's stamp instead of your default. (`fit`
  needs gws-axi ≥ 0.35; on 0.34 use `1 4`.)
- `docs write --help` documents the table dialect under its `markdown:` block, and the write
  response adds a `help[]` line whenever a table went in without a hint; treat that line as a
  reminder you forgot the hint, not as noise.
- `<br>` inside a cell starts a new paragraph in it; `- ` items after a `<br>` make a list. The
  Inputs row is a bulleted list.
- No stray paragraph before a table, no inherited styles in cells, and a table may be the last
  block in a file. The workarounds earlier versions needed (a trailing paragraph, a plain
  sentence after the stamp) are gone; don't add them.

Surgical edits, for the README tab only:

- `docs edit-cell <docId> --tab <id> --row "<label>" --text "<markdown>"` replaces one value
  cell by its row label, leaving widths and every other cell alone. Rows are matched with
  emphasis ignored. The response echoes the previous content.
- `docs replace-text <docId> --tab <id> --find "<text>" --replace "<text>"` changes one literal
  match in one tab, keeping surrounding styles; refuses on 2+ matches unless `--all`.

Both are refused if the Doc changed since you last read it, so list tabs or read first.

## Tab operations

```sh
# list tabs: id, title, index, parent, emoji
gws-axi docs tabs <docId>

# README tab (header table + legend), first, with its icon (creation only)
gws-axi docs write <docId> ./readme.md --new-tab "README" --first --emoji 📋 --account <you>   # H1, cols hint, table, legend

# a new generation, directly after the README tab
BLOB=$(git hash-object ./<doc>.md | cut -c1-12)
sed "s#^| \*\*Prompt\*\* |#| **Source** | <owner>/<repo>@blob:$BLOB:<path> |\n&#" ./<doc>.md > ./tab.md   # inject Source above Prompt
gws-axi docs write <docId> ./tab.md --new-tab "v3 YYYY-MM-DD" --after <readmeTabId> --emoji 💬 --account <you>
git commit -m "draft(<doc>): v3" -m "<changes>" -m "Spun out to <doc URL> as tab \"v3 YYYY-MM-DD\"." \
  --trailer "Doc-Id: <docId>" --trailer "Doc-Tab: <newTabId>" \
  --trailer "Doc-Version: v3" --trailer "Doc-Revision: <revision_id>" -- ./<doc>.md

# the previous generation is now superseded
gws-axi docs tabs update <docId> <v2TabId> --emoji 🗄️ --account <you>

# freeze: rename and re-icon the current generation
gws-axi docs tabs update <docId> <v3TabId> --title "v3 YYYY-MM-DD [REFINING]" --emoji ✏️ --account <you>

# delivered
gws-axi docs tabs update <docId> <v3TabId> --emoji 📤 --account <you>

# remove a tab (only when the author asks; never one with comments)
gws-axi docs tabs delete <docId> <tabId> --account <you>

# title suffix
gws-axi drive rename <docId> --name "<Title> [ONGOING]" --account <you>
```

`tabs update` takes `--title`, `--emoji` / `--no-emoji`, and one placement flag (`--first`,
`--last`, `--before`, `--after`, `--under`, `--top-level`) in a single idempotent call; the
response lists the new tab order and an undo line. Every write is refused if the Doc changed since
you last read it, so list tabs (or read) right before you act.

## Verifying a write

`docs read` round-trips gws-axi's own converter and will show you what you wrote, not how Google
renders it. For a fidelity check on tables or anything that came back `lossy`, use Google's
server-side export:

```sh
gws-axi docs download <docId> --as text/markdown --out ./export.md
```
