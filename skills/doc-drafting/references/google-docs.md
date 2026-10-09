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

Known defect at 0.32: **every cell in a written table comes out bold**, including cells with no
emphasis in the source. The header and stamp tables are affected. Until it's fixed, mention it to
the author once (one select-all on the table and Ctrl+B clears it) and don't try to work around it
in the markdown; adding or removing `**` changes nothing.

## Tab operations

At 0.32, `--new-tab` **appends** the new tab last and there is no way to reorder, rename, delete,
or set an icon on a tab from the CLI. So, at this version:

- The newest generation lands at the bottom. Tell the author which tab to read; the
  "highest version number is current" rule covers the gap until they reorder by hand.
- Renaming to `[REFINING]` at freeze is a manual step for the author; ask them to do it.
- Superseded tabs stay; deleting is manual.

A gws-axi release with full tab management is in progress (reorder, insert at a position, rename,
delete, icons; tracked in JarvusInnovations/gws-axi#101). When the installed version has `docs tabs`
subcommands, the procedure becomes:

- insert each generation at **position 1**, directly after the header tab;
- rename the frozen tab to `vN YYYY-MM-DD [REFINING]` yourself;
- set icons per `references/header-and-stamp.md` (📋 header, 💬 current draft, ✏️ refining,
  🗄️ superseded, 📤 delivered);
- delete superseded generations only when the author asks.

Confirm the exact flags from `gws-axi docs tabs --help` rather than from this file.

## Verifying a write

`docs read` round-trips gws-axi's own converter and will show you what you wrote, not how Google
renders it. For a fidelity check on tables or anything that came back `lossy`, use Google's
server-side export:

```sh
gws-axi docs download <docId> --as text/markdown --out ./export.md
```
