# doc-drafting

Two-stage drafting for AI-generated documents that people will review: **Generating**, where the
agent rebuilds whole new versions into fresh tabs, then **Refining**, where one version is frozen and
humans edit it line by line while the agent only observes. Every document in the flow opens with a
**grid** that tells a reader what state it's in, what's wanted from them, who has signed off, and
how it was made.

This README is the playbook for the humans on both sides of a draft. `SKILL.md` teaches an agent to
run the same workflow and to insist on it being run correctly.

## When you'd want it

Any time an agent is producing a document a teammate will review, or that will leave the team:
reports, proposals, policies, memos, slide decks, long-form copy of any kind. It applies whether the
document lives in Google Docs, a deck, or a markdown file in a repo. It is not for email, chat
replies, or code.

## Install

**Recommended scope: global.** Drafting is ambient work; most of the documents it governs have no
repo at all, and the ones that do shouldn't each need the skill installed.

```bash
npx skills add --global JarvusInnovations/agent-skills --skill doc-drafting
```

Then ask an agent for any document that someone else will read and the skill takes over: it sets up
the header, regenerates into new tabs, and stops regenerating when you freeze.

## Why this exists

AI makes producing cheap and reviewing expensive. Every unreviewed artifact you share moves work from
you onto whoever has to read it, and it spends down their trust in everything you send after. The
specific failures this workflow prevents:

- A reviewer spends an hour polishing a draft the author was about to regenerate, and the next
  version is rebuilt without anyone having looked at what they changed.
- A reviewer gets a fifty-page document with same-day turnaround and no idea whether it has been
  read by the person who sent it.
- Something arrives clearly generated, and the expectation turns out to be that it goes to a client
  right after this one review.
- Someone opens a document months later and can't tell whether it describes the system as it is or
  as it was the day the document was made.

The fix is not more review. It is making the state of a document legible before anyone reads it, so
the right kind of attention lands on it at the right time.

## The two stages

**Generating.** The author keeps having the agent rebuild whole new versions: new input goes in,
broad directional feedback goes in, a tighter version comes out. Each version lands in its own tab.
If the author needs other people's input during this stage, the shared document is a *collection
box*: comment, insert, and rewrite anything you feel strongly about, including key wording. Before
each regeneration the agent diffs the tab against what it wrote and treats what humans reworded as
the strongest signal it has, so edits made here do carry forward. What this stage is *not* is a
pass to make the whole thing ready to ship; line-by-line polish on text that's about to be rebuilt
is wasted.

**Refining.** Once the document is mostly there, one version is frozen. From here humans do the
proofreading and word-level editing directly in that tab, and the agent backs off regenerating
entirely. It can keep its own notes current from what humans change, and it can answer questions
about the text, but it does not rewrite.

The move from Generating to Refining is the moment the author has read every line and will stand
behind it. It is the author's call and nobody else's.

The division of labor: in Generating, humans say what matters and the agent does the rebuilding;
in Refining, humans do the finishing and the agent stays out of the way.

Two rules fall out of this:

- **Nothing goes to a client straight from Generating.** If it hasn't been through Refining, it
  isn't done, however good the last generation looked.
- **Never regenerate on top of a tab people have commented on or edited.** That destroys their work
  and the history of the round. A new generation always gets a new tab.

## The grid

Every generation tab opens with one table, the grid: the rows humans own on top, the rows the
agent generates below. It's rendered from the draft file (see *Behind each generation* below), and
humans edit the top rows directly on the current tab.

| | |
|---|---|
| **Stage** | Generating (Ana) |
| **Ask** | Direction on the restructure; don't polish yet. By Tue 10/14. |
| **Timeline** | - **Generating** since 10/6; reviewed: Ben 10/8, Cy 10/8<br>- Refining due 10/13<br>- Delivered due 10/17 |
| **Version** | v3, 2026-10-09, from v2 |
| **Source** | acme/strategy@blob:3f9c2a1b7d4e:drafts/ai-use-policy.md |
| **Prompt** | Draft a short policy from the brainstorm and the notes; fold in the channel history. NEW: restructure as principles plus appendices. |
| **Inputs** | - [Brainstorm notes](#)<br>- [Channel history](#), Jun-Sep<br>- NEW: [Call transcript](#) |
| **Changes** | Restructured as principles plus appendices; #7 split; answered both v2 comments. |
| **Workflow** | ✅ Edits are tracked: rewrite what you care about and the next generation keeps it; sign off on the Timeline line with your name and the date. [doc-drafting playbook](#) |

**The human rows.** `Stage`, with the owner in parentheses: the person staking their reputation on
the document, who moves it between stages. `Ask`: what *this version* wants from readers and by
when; it evolves with the draft instead of being worded once for all time. `Timeline`: one line per
phase, the current one bold, each carrying its dates (`since 10/6`, `due 10/13`) and its sign-offs
(`reviewed: Ben 10/8`), all in characters anyone can type. A sign-off is a name and the date you
finished a pass **on this tab**; when the agent regenerates it carries Stage, Ask and the dates
forward and clears the sign-offs, and the old tab keeps its grid as the record of who reviewed
that version. In Refining there's one tab, so sign-offs accumulate on it.

**The generated rows.** `Version`, `Source` (the exact file this tab was rendered from, by git
blob hash, so anyone with the repo can pull the text and nothing a rebase does can break the
link), `Prompt` (the agent's paraphrase of the *whole* brief so far, with `NEW:` on what this
round added), `Inputs` (everything that went in, linked, `NEW:` on what's new), `Changes` (what
moved this round). `NEW:` always means "since the previous generation." The `Workflow` line is
the one piece of protocol text on the tab, and it's always the same.

A reader who only has ten seconds reads Stage and Ask and knows what to do.

## Generations

Each regeneration goes in a **new tab**, named `vN YYYY-MM-DD`, inserted first, so the newest
generation is always the first tab and its grid is the cover. The agent never writes to a tab
twice: humans edit the grid's status rows and the document on the current tab, and the next
generation is a new tab, so there is no tab where a human's edits or formatting can be trampled.
Older tabs stay as history, re-iconed 🗄️.

Behind each generation is a commit: the draft lives as a markdown file in the project, with the
grid's data as YAML frontmatter at the top (plus fields the grid never shows, like which Doc it's
reviewed in), and the agent commits it with each write, tagged with the document and tab ids, so
the repo's history shows when a draft was spun out and where. The grid's **Source** row points
the other way, from the tab to the exact text it was rendered from, by git blob hash rather than
commit hash so a rebase can't break it. That's what lets the agent diff the tab later and find
what humans changed, which is what makes "edit what you care about" true. No commit, no ✅.

When the author freezes a version, they change Stage to Refining on that tab's grid (or tell the
agent to), and the agent renames the tab `vN YYYY-MM-DD [REFINING]`, sets its icon ✏️, and stops
generating. If review in Refining turns up something structural and the document drops back to
Generating, the next generation is a new tab and its grid says so; the frozen tab keeps its name
so the story stays legible.

## As an author

1. Say which stage you're in, in the grid, before you share. If you haven't read the document
   yourself, say so in the Ask and ask for nothing.
2. Write the Ask yourself. Match it to what you've put in: don't ask for more review time than you
   spent reviewing. For anything large, ask what format and timeline work *before* sending.
3. In Generating, tell reviewers it's a collection box. In Refining, tell them line edits are
   welcome.
4. Move to Refining only when you've read every line: change Stage to Refining on the current
   tab's grid. The agent renames the tab and stops regenerating.
5. Fill in Delivered when it ships, with where it went and a link to the delivered form.

## As a reviewer

- Read Stage and Ask first, then the Workflow line. **✅ Edits are tracked**
  means the agent diffs the draft before regenerating: in Generating, give direction and content,
  and rewrite anything you feel strongly about; it will survive. **⚠️ Edits are not tracked** means
  put everything in comments, including wording you want kept. Either way, don't spend Generating
  effort making the whole thing ship-ready. In Refining, that *is* the job: edit line by line.
- When you've done your pass, add your sign-off to the bold Timeline line on that tab: your name
  and the date. That's how the author knows you're done, and how later reviewers know who has
  looked at this version.
- If an AI-generated document reaches you **without the grid**, don't review it. Send it back with
  "set it up and I'll look." That is the whole enforcement mechanism, and it only works if everyone
  does it.

## Title suffixes

Two independent conventions on the document title, visible in listings, search results and link
previews before anyone opens the file:

- **Freshness:** `[SNAPSHOT 2026-10-08]` for a point-in-time result nobody maintains; `[ONGOING]`
  for a document that describes current state and has someone keeping it current. An untagged
  document is one nobody has vouched for either way.
- **Exposure:** nothing for internal; `[SHARED]` once anyone outside the team has access (edits in
  place are edits to their copy, so material changes get a new version); `[PUBLISHED]` for public
  (treat as immutable; revise by publishing a new version).

They stack: `Operator Guide [ONGOING] [PUBLISHED]`. Two brackets is the ceiling; anything more
belongs in the header.

## Decks and repo documents

**Slide decks** follow the same two stages. The grid is a hidden first slide; generations are
separate files or a versioned filename rather than tabs.

**Markdown in a repo** is the same file with the same frontmatter, which GitHub renders as a table
at the top; the status rows change only as the author directs. The frozen version is the commit the branch is
reviewed at; from there the agent makes only the specific edits asked for.
