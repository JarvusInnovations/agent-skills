# The grid

Every generation tab opens with **the grid**: one table, three columns. A static title row
(`AI draft under human review`, which never goes stale because it states nothing that changes),
the human-owned status rows, a merged section row naming the generation, and the generated
provenance rows. A page break follows it, so the document starts on a fresh page. It is rendered from the draft file's frontmatter by
`scripts/render-draft.mjs` (schema in `references/frontmatter.md`); nobody writes it by hand, and
humans edit it in place on the current tab.

```
| AI draft under human review                                              |||
|---|---|---|
| **Ask** (Ana)  | Direction on the restructure; don't polish yet. By Tue 10/14.  ||
| **Timeline**   | ▶ **Generating** | since 10/6; reviewed: Ben 10/8, Cy 10/8 |
| ^              | Refining         | due 10/13 |
| ^              | Delivered        | not yet |
| **Generated v3 on 2026-10-09 from v2**                                  |||
| **Changes**    | Restructured as principles plus appendices; #7 split; answered both v2 comments. ||
| **Inputs**     | - [Brainstorm notes](#)<br>- [Channel history](#), Jun-Sep<br>- NEW: [Call transcript](#) ||
| **Prompt**     | Draft a short policy from the brainstorm and the notes; fold in the channel history. NEW: restructure as principles plus appendices. ||
| **Source**     | acme/strategy@blob:3f9c2a1b7d4e:drafts/ai-use-policy.md ||
| **Workflow**   | ✅ Edits are tracked: rewrite what you care about and the next generation keeps it; sign off on your Timeline row with your name and the date. [doc-drafting playbook](…) ||
```

(Shown as the gws-axi table dialect: `|||` spans three columns, `||` two, `^` continues the cell
above. Rendered, it's one table with a title row, a merged section row, and a Timeline label
spanning three phase rows.)

## The human rows

`Ask`, with the owner in parentheses, and `Timeline`. The owner is the person staking their
reputation on the document; they move it between stages. The Ask is per-generation: what this
version wants from readers and by when. It evolves with the draft rather than being worded once
for all time. There is no Stage row: the stage is the Timeline row marked `▶` and bold.

`Timeline` is one row per phase under a label that spans all three: `Generating`, `Refining`,
`Delivered`, each with its own detail cell. Each detail carries its dates and sign-offs, in
characters anyone can type:

| Written | Means |
|---|---|
| `since 10/6` | Phase entered on 10/6, still open. |
| `due 10/13` | A target: end of the open phase, or start of one not yet begun. |
| `10/14` alone on Delivered, with `to …; via …; [link]` | It went out, where, and the delivered copy. |
| `reviewed: Ben 10/8, Cy 10/8` | Sign-offs: a name and the date they finished a pass **on this tab**. |
| `not yet` | Phase not entered, no target. |

A sign-off belongs to the tab it was written on. When the agent regenerates, it carries Stage,
Ask and the dates forward into the new tab's grid and **clears the sign-offs**; the old tab keeps
its grid untouched, so "who reviewed v3" is answered by opening v3. In Refining there is one tab,
so sign-offs accumulate on it. No version numbers in sign-offs, ever.

Humans edit these cells directly on the current tab: a sign-off on a phase row, a new Ask,
moving the `▶` from Generating to Refining at freeze (and adding `since <date>` there). The agent reads them back before every regeneration and never composes
them; it may change a single cell with `docs edit-cell` only as the direct execution of what the
owner just said.

## The generated rows

Under the merged, bold section row `Generated vN on YYYY-MM-DD from vM` (from `version`,
`date`, `from.version`; `v1` reads `Generated v1 on …`): `Changes`, `Inputs`, `Prompt`,
`Source`, `Workflow`, rendered from the frontmatter. Changes first because it's the one line a
returning reviewer needs; Prompt and Source last because they're read only when something looks
wrong.
- `Source`: `<owner>/<repo>@blob:<12-char git blob>:<path>`, the exact file this tab was rendered
  from. Resolvable by anyone with the repo (`git cat-file -p <blob>`); unaffected by rebases.
  Derived at render time; the file can't contain its own hash.
- `Prompt`: `prompt` (the cumulative paraphrase of the whole brief, rewritten tight each round),
  then `NEW:` and `from.prompt` when that round added an instruction.
- `Inputs`: the full `inputs` list, linked; `NEW:` where `new: true`.
- `Changes`: `from.changes`, **one sentence** (the renderer refuses more): what moved, not a summary. Omitted on v1.

`NEW:` always means "since the previous generation." The renderer composes it from `from.prompt`
and `new: true`, which the agent resets every round. Nobody types `NEW:` into prose.

## The Workflow row

The last row, always the same: the ✅ promise (edits are diffed and carried
forward), how to sign off, and the link to the playbook. It's the only text on a tab that isn't
the document or its data, and it's rendered, so it can't drift between documents. An agent writing a tab without
the renderer (no git, no blob) must replace it with ⚠️ *Edits are not tracked: put feedback in
comments* and say so to the owner.

## Tab names and icons

Generation tabs: `v3 2026-10-09`. On freeze: `v4 2026-10-09 [REFINING]`. The newest generation is
always first (`--first`); there is no cover tab.

| Icon | Tab |
|---|---|
| 💬 | the newest draft: comments and edits invited |
| ✏️ | the frozen draft being refined: edit it directly |
| 🗄️ | superseded drafts, kept for history |
| 📤 | the refined draft once Delivered is filled |

Icons are set by the agent, never typed by a human, which is why they're allowed here and not in
the grid's cells.

## Title suffixes

Two independent axes, each at most one tag, appended to the document title:

| Axis | Tag | Meaning |
|---|---|---|
| Freshness | `[SNAPSHOT 2026-10-08]` | Point-in-time result. True as of that date; nobody maintains it. |
| Freshness | `[ONGOING]` | Describes current state; someone keeps it current. |
| Exposure | (none) | Internal. |
| Exposure | `[SHARED]` | Someone outside the team has access. Edits in place are edits to their copy. |
| Exposure | `[PUBLISHED]` | Public. Treat as immutable; revise by publishing a new version. |

They stack: `Operator Guide [ONGOING] [PUBLISHED]`. An untagged title means nobody has vouched
for freshness either way.
