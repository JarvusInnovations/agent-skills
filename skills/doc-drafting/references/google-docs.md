# Google Docs mechanics (gws-axi)

The workflow maps onto Google Docs tabs: one header tab, one tab per generation. This file is
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

**Reading.** `docs write` to an existing tab is refused if the Doc changed since you last read
it; that guard matters less now that you don't rewrite tabs, but reading is still how you pick
up what changed: comments, contributed sections, header updates.

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

Three gotchas in 0.33 that hit this workflow's tables directly:

- **A file whose last block is a table fails** (`Insert text requests must specify text to
  insert`), and with `--new-tab` the empty tab is left behind. The README tab's legend under
  the header table keeps it from being that shape; if you ever write a table-only tab, end it
  with a paragraph holding a single non-breaking space. (gws-axi#104)
- **Table cells inherit the text style of the paragraph that follows the table.** A heading or a
  bold-leading paragraph after a table bolds every cell. On a generation tab, put the document's
  H1 *above* the stamp and start the body with a plain paragraph (no bold lead-in, no heading
  directly under the stamp). (gws-axi#105)
- **No multi-line cells.** `<br>` is written as literal text. Write the Inputs row as one line,
  semicolon-separated, `NEW:` still in front of new items. (gws-axi#106)

Column widths can't be set from markdown (gws-axi#107); the author sets them by hand on the
header tab once, which is safe because that tab is never rewritten.

## Tab operations (0.33+)

```sh
# list tabs: id, title, index, parent, emoji
gws-axi docs tabs <docId>

# README tab (header table + legend), first, with its icon (creation only)
gws-axi docs write <docId> ./readme.md --new-tab "README" --first --emoji 📋 --account <you>

# a new generation, directly after the header tab
gws-axi docs write <docId> ./v3.md --new-tab "v3 YYYY-MM-DD" --after <headerTabId> --emoji 💬 --account <you>

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

Surgical edits (`edit-cell`, `replace-text`) are not implemented yet (gws-axi#108). Until they
are, a sign-off or a Delivered line is the human's edit; give them the exact text to paste.

## Verifying a write

`docs read` round-trips gws-axi's own converter and will show you what you wrote, not how Google
renders it. For a fidelity check on tables or anything that came back `lossy`, use Google's
server-side export:

```sh
gws-axi docs download <docId> --as text/markdown --out ./export.md
```
