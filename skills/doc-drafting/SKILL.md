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
verbatim with the notation grammar. `references/google-docs.md` has the gws-axi
mechanics and the current tool gaps.

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
3. **Never rewrite the header tab after creating it.** Every row on it is a human's
   statement: intent (Stage, Ask), completion (sign-offs), fact (dates, Delivered). You
   write it once, at creation, with what the author gives you, and from then on you only
   *prompt* for changes ("Stage still says Generating; update it and the dates when you
   freeze"). Humans also fix its formatting, and a whole-tab rewrite would undo that.
   Everything you own about provenance lives in the stamp on each generation.
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
   Docs), hidden first slide (decks), or at the top of the file (markdown). Under the table
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
4. Write the first generation into a tab named `v1 YYYY-MM-DD` at position 1, directly
   after the header tab: the document's title as H1, then the stamp table (Version as its
   header row, then Prompt as your paraphrase of the brief, Inputs linked, Changes omitted on
   v1), then the body. Nothing else goes between or under the tables; the protocol lives inside them.
   **In the same step, commit the markdown you wrote** (see **Keeping sources**). A
   written tab with no matching commit is an untracked generation.
5. Apply the title suffix if the author has said what the document is: `[SNAPSHOT
   YYYY-MM-DD]` for a point-in-time result, `[ONGOING]` for a maintained document. Add
   `[SHARED]` the moment anyone outside the team is given access.

### Each regeneration round

1. Collect the humans' contributions since your last write. See **Reading human
   contributions** below for how; the short version is: diff the current generation
   against the exact markdown you wrote, and read the comments. Then read the README tab
   for a new Ask, new sign-offs, or a Stage change.
2. Produce the new generation into a **new tab** at position 1, named `v<N+1>
   YYYY-MM-DD`: H1 title, then the stamp table, then the body. Stamp rows:
   - **Version** (the header row): `v<N+1>, <date>, from v<N>`.
   - **Prompt**: the cumulative paraphrase of the whole brief, rewritten tight, not
     appended to. Prefix the clause this round introduced with `NEW:`. A reader on this
     tab must get the full intent without reading older tabs.
   - **Inputs**: the full linked list; new sources prefixed `NEW:`.
   - **Changes**: what moved this round, a line or two. Not a summary of the document.
   Last round's `NEW:` markers drop; the marker always means "since the previous
   generation."
3. Commit the markdown you just wrote, with the trailers (see **Keeping sources**).
4. Tell the author the new version is up, which tab, and what changed in one line. Don't
   summarize the document back to them. Don't touch the header.

### Freezing

When the author says the document is ready for Refining:

1. Rename the current generation tab to `vN YYYY-MM-DD [REFINING]`.
2. Ask the author to update the header: Stage to `Refining (<owner>)`, the Generating
   row's end date, the Refining row starting `vN, <today>-` plus any due date. Give them
   the exact text to paste. You don't write it.
3. From here, no regeneration. If asked to "clean up" or "tighten" the frozen text,
   propose edits as comments or suggestions, or make the specific small change they
   named; do not rewrite passages.

### Delivering

When the author says it's gone out, fill the Delivered row from what they tell you:
date, to whom, via what, and a link to the delivered form. If the delivered form was a
copy, link the copy, not the editing document.

## Keeping sources

The markdown you write to a generation tab is a file in the project, wherever the project
keeps such things (no prescribed path), and **each generation is one commit of that
file**. The commit, not the filename, is what links the source to the tab, through
trailers, and the order is fixed because the trailers need values only the write
produces:

1. Write the file.
2. `docs write … --new-tab "vN YYYY-MM-DD" --after <readmeTabId> --emoji 💬`. Take the
   new tab's id and the `revision_id` from the result.
3. Commit the file with the trailers below, immediately. Nothing else happens between
   the write and the commit.

If the write fails, there's nothing to commit; fix and retry. If you committed before
writing, `git commit --amend --no-edit --trailer …` on that unpushed commit is the same
thing. If you notice a tab with no matching commit later, commit the file now with the
ids from `docs tabs`; it's untracked until you do.

The commit:

```
draft(<doc-slug>): v3

Restructured §3 per comments; kept the reviewer's rewording of §2.

Doc-Id: <documentId>
Doc-Tab: <tabId>
Doc-Version: v3
Doc-Revision: <revision_id from the docs write result>
```

So the source for any tab is a query: `git log --grep='^Doc-Tab: <tabId>' --format=%H`
finds the commit, `git show <sha> --name-only` the path, `git show <sha>:<path>` the exact
text. `git diff <v2-sha> <v3-sha> -- <path>` is what *you* changed between generations,
which is the evidence for the stamp's Changes row. One file, one history, same model as a
markdown document that lives in a repo. The README tab's text isn't versioned: it's
written once and humans own it after.

## Reading human contributions

Humans are told they can edit what they care about in Generating because you will find
it. That promise is yours to keep, every round, before you write a word.

1. **Diff against your own source.** Get the committed text for the current tab by its
   `Doc-Tab` trailer, read the tab back (`docs read --tab <id> --full --out current.md`),
   and diff locally. Every hunk is a human change: an insertion, a deletion, or a
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

**Markdown in a repo.** The header table sits at the top of the file with the stamp
directly under it. Each generation is a commit that rewrites the stamp and the body; the
header changes only as the author directs. Same trailers minus `Doc-Id` / `Doc-Tab`
(`Doc-Version` still), and the Changes row as the commit body.
Freezing is the author saying which commit is under review; from there your changes are
the specific edits they ask for, as separate small commits.

## What a good round looks like

The author says "fold in the comments on v3 and the transcript I just shared." You read
v3's comments, read the transcript, write v4 into a new tab at position 1 with a stamp
that says `from v3`, the full Prompt with the new clause marked `NEW:`, the full Inputs
with `NEW: [transcript]`, and `Changes: ...`, and reply: "v4 is up, tab 'v4 2026-10-09'.
Restructured section 3 per the comments; the transcript added two rules under section
7." Five lines, no recap of the document, the header untouched.
