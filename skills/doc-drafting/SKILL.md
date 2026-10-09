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
  draft is in. It sets up the header table, regenerates into new tabs instead of over
  people's edits, stops regenerating once a version is frozen, and refuses to review
  headerless AI documents. Not for email, chat replies, or code.
---

# doc-drafting

You are producing a document that another person will read, review, or receive. The
whole point of this workflow is that **your output is cheap and their attention is not**.
Every rule below exists to make the state of the document legible to a reader before
they spend attention on it, and to keep your regenerations from destroying the work
humans have already put in.

`README.md` next to this file is the human playbook. Read it once; it explains the
reasoning the rules here compress. `references/header-and-stamp.md` has the two tables
verbatim with the notation grammar. `references/frontmatter.md` is the schema of the
committed draft file, which `scripts/render-draft.mjs` turns into a tab.
`references/google-docs.md` has the gws-axi mechanics.

## The model

Two stages, and the document is always in exactly one of them:

- **Generating.** You rebuild whole new versions from new input and directional
  feedback. Each version is a new tab. Humans comment, insert, and rewrite what they
  care about; before you rebuild, you find every change they made and treat it as
  direction. Their rewording of a passage is the strongest signal you get.
- **Refining.** One version is frozen. Humans edit it directly, line by line. You do not
  regenerate. You may answer questions about the text, keep your own notes current from
  what they change, and point out a problem, but the text is theirs now.

The author, not you, moves the document between stages. The transition means "I have
read every line and will stand behind it," which is a thing only a human can say.

## Hard rules

These are the rules whose violation costs a teammate real work or real trust. Treat them
as fixed.

1. **Never regenerate into a tab a human has commented on or edited.** A new generation
   always gets a new tab. If you can't create a new tab with the tools available, stop
   and say so rather than overwrite.
2. **Never regenerate once the document is in Refining.** If the user asks for a rewrite
   while the Stage row says Refining, point at the row and ask whether they want to move
   it back to Generating (a new generation, a new tab, Stage row updated). Do not quietly
   do it.
3. **Never rewrite the README tab after creating it, and never compose its rows.** Every
   row is a human's statement: intent (Stage, Ask), completion (sign-offs), fact (dates,
   Delivered). You write the tab once, at creation, with what the author gives you.
   After that, the only writes you make to it are single cells, with `docs edit-cell` or
   `docs replace-text`, as the direct execution of something the owner just told you
   ("mark it Refining", "due 10/13", "it went out to the team via Slack"). Never on your
   own judgment, never a whole-tab `docs write`, and never a sign-off on someone else's
   behalf. Everything you own about provenance lives in the stamp on each generation.
4. **Never deliver from Generating.** If asked to send a document to a client or outside
   party and the Stage row is not Refining with the author's sign-off, say that it hasn't
   been through Refining and ask whether to freeze it first.
5. **Don't review a headerless AI document.** If you're handed an AI-generated document
   to review and it has no header, tell the user it needs one before you'll engage, and
   offer to draft the stamp (Prompt, Inputs) if they can supply the header. This is the
   enforcement mechanism for the whole workflow; it only works if every agent holds the
   line.

## Procedure

### Starting a document

1. Confirm it's in scope: a document someone else will read. Email, chat, and code are
   not; use the appropriate skill for those.
2. Ask the author for the **Ask** (what they want from readers, by when) if they haven't
   said. Ask who the **owner** is only if it isn't obviously the requester.
3. Create the document with the **header on its own front tab named `README`** (Google
   Docs; H1 `Generated Document Status: <title>`, then the table; icon 📋), hidden first
   slide (decks), or at the top of the file (markdown). Under the table
   on that tab, add the standing legend from `references/header-and-stamp.md` verbatim
   (where the newest draft is, how to sign off, the icon key, the playbook link); it
   describes the protocol, not the current state, so it never goes stale. Pick the
   legend's first paragraph by whether you can keep generation sources durably and
   diff (see **Reading human contributions**): **✅ Edits are tracked** if yes, **⚠️
   Edits are not tracked** if no. Reviewers rely on that line to know whether a direct
   edit will survive; getting it wrong wastes their work in one direction or the other.
   If you can't track, tell the author so too; they may want to fix that before sharing. Fill Stage as `Generating
   (<owner>)`, the Ask verbatim from the author, the Generating row as `<today>-`. Leave
   Refining and Delivered as `due <date>` if the author gave targets, otherwise blank.
   This is the only time you write this tab.
4. Write the draft file: YAML frontmatter per `references/frontmatter.md` (`version: 1`,
   no `from`), then the document, title first. Render it with
   `scripts/render-draft.mjs <file> --out tab.md` and write `tab.md` into a tab named
   `v1 YYYY-MM-DD` at position 1, directly after the README tab, icon 💬. The rendered
   stamp is preamble; the title stays bound to its content. **Then commit the file** (see
   **Keeping sources**). A written tab with no matching commit is an untracked generation.
5. Apply the title suffix if the author has said what the document is: `[SNAPSHOT
   YYYY-MM-DD]` for a point-in-time result, `[ONGOING]` for a maintained document. Add
   `[SHARED]` the moment anyone outside the team is given access.

### Each regeneration round

1. Collect the humans' contributions since your last write. See **Reading human
   contributions** below for how; the short version is: diff the current generation
   against the exact markdown you wrote, and read the comments. Then read the README tab
   for a new Ask, new sign-offs, or a Stage change.
2. Update the draft file: bump `version` and `date`; replace the `from` block
   (`from.version` = the generation you're regenerating from, `from.prompt` = the
   instruction this round added if any, `from.changes` = what moved, a line or two);
   rewrite `prompt` to the cumulative paraphrase, tight, not appended to; clear last
   round's `new: true` flags and set them on the inputs this round introduced; rewrite
   the body. Render with `scripts/render-draft.mjs` and write the result into a **new
   tab** at position 1, named `v<N+1> YYYY-MM-DD`. A reader on that tab must get the
   full intent from the stamp without opening older tabs; the renderer composes the
   `NEW:` markers from `from.prompt` and `new: true`, so never type them into prose.
3. Commit the markdown you just wrote, with the trailers (see **Keeping sources**).
4. Re-icon the previous generation's tab 🗄️ (`docs tabs update <id> --emoji 🗄️`). The
   new tab already carries 💬 from its write. The tab strip is the phase indicator; keep
   it true.
5. Tell the author the new version is up, which tab, and what changed in one line. Don't
   summarize the document back to them. Don't touch the header.

### Freezing

When the author says the document is ready for Refining:

1. Rename the current generation tab to `vN YYYY-MM-DD [REFINING]` and set its icon to ✏️
   (one `docs tabs update` call with `--title` and `--emoji`).
2. Apply the transition the author just dictated to the README tab with single-cell
   edits: `replace-text` `Generating` → `Refining` in the Stage header row; `edit-cell
   --row Generating` to close its dates; `edit-cell --row Refining` to `vN, <today>-` plus
   any due date they gave. Read the previous content the response echoes back and tell
   the author what changed. Don't touch Ask or anyone's sign-offs.
3. From here, no regeneration. If asked to "clean up" or "tighten" the frozen text,
   propose edits as comments or suggestions, or make the specific small change they
   named; do not rewrite passages.

### Delivering

When the author says it's gone out, fill the Delivered row from what they tell you
(`edit-cell --row Delivered`): date, to whom, via what, and a link to the delivered form.
Set the frozen tab's icon to 📤. If the delivered form was a
copy, link the copy, not the editing document.

## Keeping sources

The draft is a file in the project, wherever the project keeps such things (no prescribed
path): YAML frontmatter (`references/frontmatter.md`) and the document. **Each generation
is one commit of that file.** What's written to the tab is the render of it, never the
raw file (the YAML would land in the Doc as text). Two links tie the tab and the source
together, in opposite directions:

- **Tab → text:** the stamp's `Source` row names the file's git *blob* hash, which is the
  id of the exact bytes and survives rebases (the rebased commit carries the same blob).
  Anyone with the repo resolves it with `git cat-file -p <blob>`, no branch, no grep.
  Never a commit hash: feature branches get rebased until they merge, and a commit hash
  written into a document is meaningless the day after.
- **Commit → doc:** trailers on the commit, so an agent reading history can see that a
  generation was spun out for review, when, and where.

The order:

1. Finalize the file. `scripts/render-draft.mjs <file> --out tab.md` validates it,
   derives the Source row from `git hash-object` (the blob exists before any commit),
   and writes the tab markdown.
2. `docs write <docId> tab.md --new-tab "vN YYYY-MM-DD" --after <readmeTabId> --emoji 💬`.
   Take the new tab's id and the `revision_id` from the result.
3. Commit the file with the trailers below, immediately. Don't touch the file between
   render and commit, or the blob in the tab stops matching the blob in the commit.

If the write fails, there's nothing to commit; fix and retry. If you committed before
writing, `git commit --amend --no-edit --trailer …` on that unpushed commit is the same
thing (an amend doesn't change the blob, so the tab's Source row stays right). If you
notice a tab with no matching commit later, commit the file now with the ids from
`docs tabs`; it's untracked until you do.

The commit:

```
draft(<doc-slug>): v3

Restructured §3 per comments; kept the reviewer's rewording of §2.
Spun out to <doc URL> as tab "v3 YYYY-MM-DD".

Doc-Id: <documentId>
Doc-Tab: <tabId>
Doc-Version: v3
Doc-Revision: <revision_id from the docs write result>
```

The stamp's Source row: `<owner>/<repo>@blob:<12-char blob>:<path>`. From a tab,
`git cat-file -p <blob>` is the exact text; `git log --find-object=<blob> -- <path>` finds
the commit(s) holding it, rebased or not. `git diff <v2-blob> <v3-blob>` is what *you*
changed between generations, the evidence for the Changes row. One file, one history,
same model as a markdown document that lives in a repo. The README tab's text isn't
versioned: it's written once and humans own it after.

The one way a blob stops resolving: a rebase whose conflict resolution changes the file
orphans the old blob, and it's gone after reflog expiry. The Source row still names the
path and the rebased commit still carries the trailers, so the trail survives; only
byte-exactness is lost, and you say so instead of diffing against the wrong text.

## Reading human contributions

Humans are told they can edit what they care about in Generating because you will find
it. That promise is yours to keep, every round, before you write a word.

1. **Diff against your own source.** Read the tab back (`docs read --tab <id> --full
   --out current.md`), take the blob from its Source row, `git cat-file -p <blob>` for
   the file you wrote, and diff **body to body**: the file below its frontmatter against
   the read-back below its stamp table (normalizer in `references/google-docs.md`). Every hunk is a human change: an insertion, a deletion, or a
   rewording. If the file has uncommitted changes or no commit carries the tab id, this
   generation is untracked: the ✅ on the README tab is false until that's fixed.
   This is the only method that works. Drive's revision history is whole-document (every
   tab concatenated), its retained revisions are a sparse sample, and you write as the
   author's own account, so neither `docs revisions` nor `docs diff` can isolate what a
   human did to one tab. The README legend promises reviewers one regime or the other
   (**✅ Edits are tracked** / **⚠️ Edits are not tracked**); keep whichever promise was
   made. If you lost the source on a tracked document, say so and ask the author to point
   at what they changed; don't guess from a document-level diff.
2. **Read the comments.** `docs comments <id>` lists them with the quoted text; they're
   not in the tab content.

Then, in the regeneration: a passage a human reworded is carried forward in their
wording unless the new direction contradicts it, and the stamp's Changes row says so
("kept your rewording of §3"). An inserted section is kept and integrated. A deletion is
honored. A comment is answered in the text, or, when you can't, in your reply to the
author. If a human edit and a new instruction conflict, ask rather than pick.

## Working in each surface

**Google Docs.** All of the above maps to tabs via gws-axi. Read
`references/google-docs.md` before your first write to a Doc; it covers the read-before-
write guard, what the markdown writer can and can't represent, and the tab operations
available in the installed version.

**Slide decks.** The header is a hidden first slide. Generations are separate files or a
versioned filename; the stamp is the first hidden slide of each. Freezing means the
author names the file that's final.

**Markdown in a repo.** Same file, same frontmatter; GitHub renders the frontmatter as a
table at the top, so no render step and no Source row (the file is its own source). The
header table sits directly under the frontmatter. Each generation is a commit that
rewrites the frontmatter and the body; the header changes only as the author directs. Same trailers minus `Doc-Id` / `Doc-Tab`
(`Doc-Version` still), and the Changes row as the commit body.
Freezing is the author saying which commit is under review; from there your changes are
the specific edits they ask for, as separate small commits.

## What a good round looks like

The author says "fold in the comments on v3 and the transcript I just shared." You read
v3's comments, read the transcript, write v4 into a new tab at position 1, stamp first,
saying `from v3`, the full Prompt with the new clause marked `NEW:`, the full Inputs
with `NEW: [transcript]`, and `Changes: ...`, and reply: "v4 is up, tab 'v4 2026-10-09'.
Restructured section 3 per the comments; the transcript added two rules under section
7." Five lines, no recap of the document, the header untouched.
