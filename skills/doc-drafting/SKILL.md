---
name: doc-drafting
description: >-
  Two-stage drafting workflow for any AI-generated document a person will review or that
  will leave the team: reports, proposals, policies, memos, slide decks, long-form copy,
  markdown docs in a repo. Use this whenever you are asked to draft, write, generate,
  regenerate, revise, "take another pass at", or "fold feedback into" a document that
  someone other than the requester will read, even if they don't say "draft" or mention a
  review. Also use it when handed an AI-generated document to review, and when the user
  says "freeze it", "move to refining", "new version", "new tab", or asks what state a
  draft is in. It keeps the draft as a frontmatter markdown file, renders each generation
  into a new tab with a status-and-provenance grid, never writes over people's edits,
  stops regenerating once a version is frozen, and refuses to review AI documents that
  carry no grid. Not for email, chat replies, or code.
---

# doc-drafting

You are producing a document that another person will read, review, or receive. The
whole point of this workflow is that **your output is cheap and their attention is not**.
Every rule below exists to make the state of the document legible to a reader before
they spend attention on it, and to keep your regenerations from destroying the work
humans have already put in.

`README.md` next to this file is the human playbook. Read it once; it explains the
reasoning the rules here compress. `references/frontmatter.md` is the schema of the
draft file; `references/header-and-stamp.md` is the grid it renders to, with the
notation humans use in it; `references/google-docs.md` has the gws-axi mechanics.
`scripts/render-draft.mjs` turns the file into a tab.

## The model

Two stages, and the document is always in exactly one of them:

- **Generating.** You rebuild whole new versions from new input and directional
  feedback. Each version is a new tab. Humans comment, insert, and rewrite what they
  care about; before you rebuild, you find every change they made and treat it as
  direction. Their rewording of a passage is the strongest signal you get.
- **Refining.** One version is frozen. Humans edit it directly, line by line. You do not
  regenerate. You may answer questions about the text, keep your own notes current from
  what they change, and point out a problem, but the text is theirs now.

The owner, not you, moves the document between stages. The transition means "I have
read every line and will stand behind it," which is a thing only a human can say.

Three artifacts, one source of truth:

- **The draft file**: markdown with YAML frontmatter, committed in the project. The
  frontmatter holds the generation's data (version, prompt, inputs, what changed) and a
  snapshot of the status rows. This is what you write.
- **The generation tab**: the render of that file. One **grid** at the top (status rows
  humans own, provenance rows you generate), then the document. Humans edit the grid's
  status rows and the document on the current tab; you never write to a tab twice.
- **The commit**: one per generation, trailers naming the Doc and tab, so history shows
  when a draft was spun out and where.

## Hard rules

These are the rules whose violation costs a teammate real work or real trust. Treat them
as fixed.

1. **Never write into a tab a human has commented on or edited.** A new generation
   always gets a new tab. If you can't create a new tab with the tools available, stop
   and say so rather than overwrite.
2. **Never regenerate once the document is in Refining.** If the user asks for a rewrite
   while the grid says Refining, point at it and ask whether they want to reopen (a new
   generation, a new tab, Stage back to Generating). Do not quietly do it.
3. **Never compose the status rows.** Stage, Ask, and the Timeline's sign-offs are the
   humans' statements: intent, completion. You carry them forward from the current tab's
   grid into the next generation verbatim, clearing sign-offs (they belong to the tab
   they were written on). You may adjust or clear the Ask only when the owner's
   instruction or the workflow makes the change obvious ("freeze it, line edits by
   Friday"; the previous Ask was answered; its date passed); otherwise confirm it.
   Single-cell edits to the current tab's grid (`docs edit-cell`, `docs replace-text`)
   only as the direct execution of what the owner just said, never on your own
   judgment, never a sign-off on someone else's behalf.
4. **Never deliver from Generating.** If asked to send a document to a client or outside
   party and Stage is not Refining with the owner's sign-off, say that it hasn't been
   through Refining and ask whether to freeze it first.
5. **Don't review a gridless AI document.** If you're handed an AI-generated document to
   review and it carries no grid, tell the user it needs one before you'll engage, and
   offer to set the document up in this workflow if they can supply the status rows.
   This is the enforcement mechanism for the whole workflow; it only works if every
   agent holds the line.

## Procedure

### Starting a document

1. Confirm it's in scope: a document someone else will read. Email, chat, and code are
   not; use the appropriate skill for those.
2. Ask the owner for the **Ask** (what they want from readers of this version, by when)
   if they haven't said. Ask who the owner is only if it isn't obviously the requester.
3. Write the draft file: frontmatter per `references/frontmatter.md` (`version: 1`, no
   `from`, `status.stage: generating`, the owner, the Ask, `timeline.generating.since`
   today, any due dates they gave), then the document, title first.
4. Render it (`scripts/render-draft.mjs <file> --out tab.md`) and write `tab.md` into a
   tab named `v1 YYYY-MM-DD`, first in the Doc, icon 💬. Apply the title suffix if the
   owner has said what the document is (`[SNAPSHOT YYYY-MM-DD]` or `[ONGOING]`).
5. Commit the file, immediately (**Keeping sources**). A written tab with no matching
   commit is an untracked generation.

### Each regeneration round

1. **Read the current tab back** (`docs read --tab`): the grid's status rows as humans
   left them, and the document. Collect their contributions per **Reading human
   contributions**. Read the comments.
2. **Update the draft file.** `status`: copy Stage, owner, Ask, and the Timeline dates
   from the live grid; clear every `reviewed` list; adjust the Ask only per rule 3.
   Then the generation's data: bump `version` and `date`; replace the `from` block
   (`from.version`, `from.prompt` = the instruction this round added if any,
   `from.changes` = what moved, a line or two); rewrite `prompt` to the cumulative
   paraphrase, tight, not appended to; clear last round's `new: true` and set it on the
   inputs this round introduced; rewrite the body. The renderer composes the `NEW:`
   markers from `from.prompt` and `new: true`; never type them into prose.
3. **Render and write** into a **new tab**, first, named `v<N+1> YYYY-MM-DD`, icon 💬.
4. **Commit** with the trailers (**Keeping sources**).
5. Re-icon the previous generation's tab 🗄️. The tab strip is the phase indicator; keep
   it true.
6. Tell the owner the new version is up, which tab, and what changed in one line. Don't
   summarize the document back to them.

### Freezing

The owner freezes by changing Stage to Refining on the current tab's grid, or by telling
you to. Then:

1. If they told you: `docs replace-text` `Generating` → `Refining` in the Stage cell,
   and `docs edit-cell --row Timeline` to add `since <today>` on the Refining line (plus
   any due date they gave). Read the previous content the response echoes and tell
   them what changed. Nothing else in the grid.
2. Rename the tab `vN YYYY-MM-DD [REFINING]` and set its icon ✏️, one `docs tabs update`.
3. Record it in the draft file's `status` and commit (a status-only commit; the body is
   unchanged, so the tab's Source still names the right blob).
4. From here, no regeneration. If asked to "clean up" or "tighten" the frozen text,
   propose edits as comments or suggestions, or make the specific small change they
   named; do not rewrite passages.

### Delivering

When the owner says it's gone out, `docs edit-cell --row Timeline` to make the Delivered
line read `<date>; to <whom>; via <what>; [link](<delivered copy>)`, set the tab's icon
📤, record it in `status.timeline.delivered`, and commit. If the delivered form was a
copy, link the copy, not the editing document.

## Keeping sources

The draft is a file in the project, wherever the project keeps such things (no prescribed
path). **Each generation is one commit of that file.** What's written to the tab is the
render of it, never the raw file (the YAML would land in the Doc as text). Two links tie
the tab and the source together, in opposite directions:

- **Tab → text:** the grid's `Source` row names the file's git *blob* hash, the id of the
  exact bytes, which survives rebases (the rebased commit carries the same blob). Anyone
  with the repo resolves it with `git cat-file -p <blob>`. Never a commit hash: feature
  branches get rebased until they merge, and a commit hash written into a document is
  meaningless the day after.
- **Commit → doc:** trailers on the commit, so an agent reading history can see that a
  generation was spun out for review, when, and where.

The order:

1. Finalize the file. `scripts/render-draft.mjs <file> --out tab.md` validates it,
   derives the Source row from `git hash-object` (the blob exists before any commit),
   and writes the tab markdown.
2. `docs write <docId> tab.md --new-tab "vN YYYY-MM-DD" --first --emoji 💬`. Take the new
   tab's id and the `revision_id` from the result.
3. Commit the file, immediately. Don't touch the file between render and commit, or the
   blob in the tab stops matching the blob in the commit.

```
draft(<doc-slug>): v3

Restructured §3 per comments; kept the reviewer's rewording of §2.
Spun out to <doc URL> as tab "v3 YYYY-MM-DD".

Doc-Id: <documentId>
Doc-Tab: <tabId>
Doc-Version: v3
Doc-Revision: <revision_id from the docs write result>
```

From a tab, `git cat-file -p <blob>` is the exact file; `git log --find-object=<blob> --
<path>` finds the commit(s) holding it, rebased or not. `git diff <v2-blob> <v3-blob>` is
what *you* changed between generations, the evidence for `from.changes`. Status-only
commits (freeze, delivery) don't change the body, so the tab's Source still names the
generation's text.

If the write fails, there's nothing to commit; fix and retry. If you committed before
writing, `git commit --amend --no-edit --trailer …` on that unpushed commit is the same
thing (an amend doesn't change the blob). If you notice a tab with no matching commit
later, commit the file now with the ids from `docs tabs`; it's untracked until you do.

The one way a blob stops resolving: a rebase whose conflict resolution changes the file
orphans the old blob, and it's gone after reflog expiry. The Source row still names the
path and the rebased commit still carries the trailers, so the trail survives; only
byte-exactness is lost, and you say so instead of diffing against the wrong text.

## Reading human contributions

Humans are told they can edit what they care about in Generating because you will find
it. That promise is yours to keep, every round, before you write a word.

1. **Status rows.** The grid on the current tab is the authority for Stage, Ask, dates
   and sign-offs. Read it; it's the first table in the read-back.
2. **Diff the document against your own source.** Take the blob from the grid's Source
   row, `git cat-file -p <blob>` for the file you wrote, and diff **body to body**: the
   file below its frontmatter against the read-back below the grid (normalizer in
   `references/google-docs.md`). Every hunk is a human change: an insertion, a deletion,
   or a rewording. This is the only method that works; Drive's revision history is
   whole-document and sparse, and you write as the owner's own account. If the blob
   doesn't resolve, say so and ask the owner what they changed; don't guess.
3. **Read the comments.** `docs comments <id>` lists them with the quoted text; they're
   not in the tab content.

Then, in the regeneration: a passage a human reworded is carried forward in their
wording unless the new direction contradicts it, and `from.changes` says so ("kept your
rewording of §3"). An inserted section is kept and integrated. A deletion is honored. A
comment is answered in the text, or, when you can't, in your reply to the owner. If a
human edit and a new instruction conflict, ask rather than pick.

## Working in each surface

**Google Docs.** All of the above maps to tabs via gws-axi. Read
`references/google-docs.md` before your first write to a Doc.

**Slide decks.** The grid is a hidden first slide. Generations are separate files or a
versioned filename; freezing means the owner names the file that's final.

**Markdown in a repo.** Same file, same frontmatter; GitHub renders the frontmatter as a
table at the top, so there's no render step and no Source row (the file is its own
source). Each generation is a commit that rewrites the frontmatter and the body; the
status rows change only as the owner directs. Same trailers minus `Doc-Id` / `Doc-Tab`.

## What a good round looks like

The owner says "fold in the comments on v3 and the transcript I just shared." You read
v3 back: the grid says Generating, Laurie signed off 10/9, the Ask still reads "direction
on structure." You diff the body against v3's blob and find two reworded paragraphs and
a deleted bullet; you read the three comments and the transcript. In the file: status
carried forward with `reviewed` cleared and the Ask kept; `version: 4`; `from` with the
transcript as `from.prompt` and a two-line `from.changes` that names the kept
rewordings; the transcript marked `new: true`; the body rewritten. Render, write as
`v4 2026-10-09` first with 💬, commit with trailers, re-icon v3 🗄️, and reply: "v4 is up.
Kept your rewording in §2 and §5, dropped the bullet you cut; the transcript added two
rules under §7. Same Ask as v3 unless you want a new one." Four lines, no recap of the
document, nothing in the grid you composed.
