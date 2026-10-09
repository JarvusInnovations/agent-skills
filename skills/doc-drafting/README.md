# doc-drafting

Two-stage drafting for AI-generated documents that people will review: **Generating**, where the
agent rebuilds whole new versions into fresh tabs, then **Refining**, where one version is frozen and
humans edit it line by line while the agent only observes. Every document in the flow opens with a
small **header table** that tells a reader what state it's in, what's wanted from them, and who has
signed off; every generation opens with a **stamp** that says how it was made.

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

## The header

Every document in the flow opens with this table. In Google Docs it lives on its own **front tab,
named `README`**, under an H1 of `Generated Document Status: <title>`, so regenerating the other
tabs can never overwrite it; a short standing legend under the table says where the newest draft
is, how to sign off, what the tab icons mean, and links back to this playbook. In a deck it is a hidden first slide. In a
markdown file it is the first thing in the file.

<!-- cols: 1 4 -->
| Stage | Refining (Ana) |
|---|---|
| **Ask** | Line edits through Fri 10/10. Flag anything you'd refuse to follow. |
| **Generating** | 10/6-10/9; Ben v3, Cy v2 |
| **Refining** | v4, 10/9-, due 10/13; Ben 10/10, Cy pending |
| **Delivered** | due 10/14 |

Every row is written by a human. The agent writes this table once, when it creates the document,
and never again; where the document came from lives in the stamp on each generation (below), so
nothing the agent does later can disturb the formatting or the sign-offs here.

Row by row:

- **Stage.** One word, `Generating` or `Refining`, followed by the owner in parentheses. The owner is
  the person staking their reputation on the document: they move it between stages, and they are
  who a bounced document goes back to.
- **Ask.** What you want from the reader and by when, in one or two lines. Written by the author,
  never generated. Whether a reader does the review themselves or runs it through their own agent
  is their call; say so only when a human read specifically matters.
- **Generating / Refining / Delivered.** The timeline, one row per phase, each carrying its own
  sign-offs. Written entirely in characters anyone can type:
  - `10/6-10/9` happened, both ends. `10/9-` open-ended. `due 10/13` a target, wherever it appears.
  - Semicolon separates dates from people; commas separate people.
  - In Generating, a sign-off names the **version** reviewed (`Ben v3`), because dates are
    ambiguous when several generations land in a day. A reviewer re-reviews by bumping their
    version number.
  - In Refining there is one frozen version, so sign-offs go back to **dates** (`Ben 10/10`):
    the question is no longer "which version did you see" but "have you done your pass".
  - The Refining row starts with the version that was frozen (`v4`), the durable record of which
    generation became the document.
  - Delivered, once it ships: `10/14; to the team via #channel; [link](#)`. We rarely deliver the
    document the editing happened in, so this is the record of what actually went where.

A reader who only has ten seconds reads Stage and Ask and knows what to do.

## Generations

Each regeneration goes in a **new tab**, named `vN YYYY-MM-DD`, inserted at position 1, directly
after the header tab, so the newest generation is always the first thing after the header. Every
generation tab opens with the document's title and then a stamp table that says how *that
generation* was made:

<!-- cols: 1 4 -->
| Version | v4, 2026-10-09, from v3 |
|---|---|
| **Prompt** | Draft a short policy from my notes; fold in the channel history; restructure as one-page principles with appendices. NEW: keep the header as an appendix. |
| **Inputs** | - [Brainstorm notes](#)<br>- [Channel history](#), Jun-Sep<br>- NEW: [Call transcript](#) |
| **Changes** | #7 split; title-suffix convention under #2; header moved to its own tab |

**Prompt** is the agent's paraphrase of the *whole* brief that produced this generation, rewritten
each round into the tightest accurate version rather than appended to, so a reader on any tab gets
the full intent without walking back through older tabs. **Inputs** is the full list of sources,
linked. Whatever the latest round introduced is prefixed `NEW:` in both rows, and the marker drops
on the next round, so `NEW:` always means "since the previous generation." **Changes** is the
per-round delta, the one thing you can't reconstruct by reading the tab.

Prompt and Inputs live here rather than in the header because they're a property of a generation,
not of the document: what produced v3 is not what produced v4. It also means the agent never
rewrites a tab after creating it. The header is written once; each generation is written once;
there is no tab where a human's edits or formatting can be trampled.

Behind each generation is a commit: the agent keeps the markdown it wrote as a file in the project
and commits it with the write, tagged with the document and tab ids. That commit is what lets it
diff the tab later and find what humans changed, which is what makes "edit what you care about"
true. No commit, no ✅.

When the author freezes a version, they update the header (Stage, the Generating end date, the
Refining row's version and start) and the agent renames that tab `vN YYYY-MM-DD [REFINING]` and
stops generating. Older generation tabs stay as history. If review in Refining turns up something
structural and the document drops back to Generating, the next generation is a new tab and the
header's Stage row says so; the frozen tab keeps its name so the story stays legible.

## As an author

1. Say which stage you're in, in the header, before you share. If you haven't read the document
   yourself, say so in the Ask and ask for nothing.
2. Write the Ask yourself. Match it to what you've put in: don't ask for more review time than you
   spent reviewing. For anything large, ask what format and timeline work *before* sending.
3. In Generating, tell reviewers it's a collection box. In Refining, tell them line edits are
   welcome.
4. Move to Refining only when you've read every line: set Stage to Refining, close the Generating
   row's dates, start the Refining row with the version you froze. The agent renames the tab and
   stops regenerating.
5. Fill in Delivered when it ships, with where it went and a link to the delivered form.

## As a reviewer

- Read Stage and Ask first, then the bold line at the top of the legend. **✅ Edits are tracked**
  means the agent diffs the draft before regenerating: in Generating, give direction and content,
  and rewrite anything you feel strongly about; it will survive. **⚠️ Edits are not tracked** means
  put everything in comments, including wording you want kept. Either way, don't spend Generating
  effort making the whole thing ship-ready. In Refining, that *is* the job: edit line by line.
- When you've done your pass, add your sign-off to the open phase's row: your name and the version
  (Generating) or the date (Refining). That's how the author knows you're done, and how later
  reviewers know who has looked.
- If an AI-generated document reaches you **without a header**, don't review it. Send it back with
  "add the header and I'll look." That is the whole enforcement mechanism, and it only works if
  everyone does it.

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

**Slide decks** follow the same two stages. The header is a hidden first slide; generations are
separate files or a versioned filename rather than tabs, and the stamp is the first hidden slide of
each generation.

**Markdown in a repo** keeps the header at the top of the file and the stamp directly under it;
both are rewritten by the agent on each generation commit (the header only as the author directs),
and the Changes row doubles as the commit body. The frozen version is the commit the branch is
reviewed at; from there the agent makes only the specific edits asked for.
