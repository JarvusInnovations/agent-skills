# Header and stamp tables

Copy these verbatim. Both are plain two-column tables so they survive every renderer and so
humans can edit them without reaching for characters they can't type. The header is written by
the agent once, at creation, and by humans thereafter. The stamp is written by the agent once per
generation and never again. No tab is ever rewritten.

## The header (README tab, hidden first slide, or top of file)

The README tab opens with an H1, `Generated Document Status: <document title>`, then the table.
`Stage` is the table's header row (the mandatory header row carrying real content), and the
`<!-- cols: fit 1 -->` hint before the table sizes the label column to its widest label and gives
the value column the rest, so nobody has to drag column borders. Use the same hint on the stamp.

Blank template:

<!-- cols: fit 1 -->
| Stage | Generating (owner) |
|---|---|
| **Ask** | |
| **Generating** | MM/DD- |
| **Refining** | |
| **Delivered** | |

Filled example, mid-Refining:

<!-- cols: fit 1 -->
| Stage | Refining (Ana) |
|---|---|
| **Ask** | Line edits through Fri 10/10. Flag anything you'd refuse to follow. |
| **Generating** | 10/6-10/9; Ben v3, Cy v2 |
| **Refining** | v4, 10/9-, due 10/13; Ben 10/10, Cy pending |
| **Delivered** | due 10/14 |

Filled example, delivered:

<!-- cols: fit 1 -->
| Stage | Refining (Ana) |
|---|---|
| **Ask** | None; delivered. |
| **Generating** | 10/6-10/9; Ben v3, Cy v3 |
| **Refining** | v4, 10/9-10/13; Ben 10/10, Cy 10/12 |
| **Delivered** | 10/14; to the team via #general; [delivered copy](#) |

## Who writes which row

| Row | Written by | Notes |
|---|---|---|
| Stage | human (owner) | One word plus owner in parentheses. The owner changes it at freeze or reopen; the agent prompts for it and supplies the text to paste. |
| Ask | human (owner) | Never composed by the agent. At creation the agent asks for it and inserts it verbatim. |
| Generating / Refining / Delivered | humans | Sign-offs by the reviewers themselves; dates and the frozen version by the owner. The agent fills only the Generating start date, at creation. |

At creation the agent writes the whole table from what the author gives it. After that the agent
does not write this tab. Where the document came from is in the stamp, below.

## Notation

Everything is typeable on any keyboard: digits, slash, hyphen, semicolon, comma, the word
`due`, and words for statuses.

| Written | Means |
|---|---|
| `10/6-10/9` | Phase ran from 10/6 to 10/9, both happened. |
| `10/9-` | Phase started 10/9, still open. |
| `due 10/13` | A target, wherever it appears: end of the open phase, or start of a phase not yet begun. |
| `10/9-, due 10/13` | Open since 10/9, targeted to end 10/13. |
| `v4, 10/9-` | Refining only: the version that was frozen, then the dates. |
| `;` | Separates the dates from the people. |
| `,` | Separates people. |
| `Ben v3` | Generating only: Ben signed off on version 3. Stale if a later version exists. |
| `Ben 10/10` | Refining only: Ben finished a pass on 10/10. |
| `Ben reviewing` / `Ben pending` | Status words instead of a date or version: in progress, or asked and not started. |

A sign-off is a name with a version or a date. A name with a word is a status, not a sign-off.
Reviewers update their own entry; to re-review in Generating, bump the version.

## The stamp (first thing on every generation tab, above the document's title)

<!-- cols: fit 1 -->
| Version | v4, 2026-10-09, from v3 |
|---|---|
| **Source** | themightychris/hari@blob:3f9c2a1b7d4e:drafts/ai-use-policy.md |
| **Prompt** | Draft a short policy from my notes; fold in the channel history; restructure as one-page principles with appendices. NEW: keep the header as an appendix. |
| **Inputs** | - [Brainstorm notes](#)<br>- [Channel history](#), Jun-Sep<br>- NEW: [Call transcript](#) |
| **Changes** | #7 split guest-community vs. repos we maintain; title-suffix convention under #2; header moved to its own front tab |

- `Version` is the table's header row, so the mandatory header row carries real content instead
  of a caption or a blank line. Always present; `v1` has no `from`.
- `Source` is `<owner>/<repo>@blob:<12-char git blob>:<path>`: the exact bytes this tab was
  written from, resolvable by anyone with the repo (`git cat-file -p <blob>`) and unaffected by
  rebases. The agent injects it at write time; the committed file doesn't carry it.
- `Prompt` is the agent's paraphrase of the **whole brief** that produced this generation,
  rewritten each round into the tightest accurate version. Not a log of instructions; a reader on
  this tab gets the full intent without opening older tabs.
- `Inputs` is the **full** list of sources, linked wherever a link exists.
- `NEW:` prefixes whatever this round introduced, in either row. It drops on the next round, so it
  always means "since the previous generation."
- `Changes` is what moved this round, in a line or two. Not a summary of the document. Omit on v1.
- A pure tightening round has no `NEW:` markers and a one-line Changes.

## Tab names and icons

Generation tabs: `v3 2026-10-09`. On freeze: `v4 2026-10-09 [REFINING]`. The README tab is named
`README`; it is always first, and generation tabs are inserted at position 1 so the newest is
directly after it.

Because the README tab sits outside the content being worked on, it carries a standing legend under
the table. That text describes the protocol, never the current state, so it can't go stale.
Generation tabs carry nothing outside the stamp and the document.

The legend's first paragraph comes in **two variants**, and the agent picks one at creation based on
whether it can keep the exact markdown of every generation somewhere durable and diff the tab
against it before each regeneration. Reviewers move between documents that do and don't have that,
so the variant is called out in bold at the top where it can't be missed.

Variant A, edits tracked (the agent keeps its generation sources and diffs):

> **✅ Edits are tracked.** The newest draft is the tab right after this one. While Stage says
> Generating, give broad-strokes feedback: comments, insertions, rewrites of anything you feel
> strongly about. Before each regeneration the agent diffs this tab against what it wrote and treats
> your rewording as the strongest signal it has, so edit what you care about; the job just isn't
> "make this whole thing ready to ship." When Stage says Refining, that is the job: edit the marked
> tab directly, line by line.

Variant B, edits not tracked (no durable source to diff against):

> **⚠️ Edits are not tracked.** The newest draft is the tab right after this one. While Stage says
> Generating, put feedback in **comments**, including any wording you'd want kept; edits made
> directly to the draft are not diffed and will not reach the next generation. When Stage says
> Refining, edit the marked tab directly, line by line.

The rest of the legend is the same in both:
>
> Reviewers: add your sign-off to the open phase row above. Name plus version in Generating
> (`Ben v3`), name plus date in Refining (`Ben 10/10`). A name with a word (`pending`, `reviewing`)
> is a status, not a sign-off.
>
> Tab icons:
>
> - 📋 this README
> - 💬 the newest draft, open for comments and edits
> - ✏️ the frozen draft being refined, edit it directly
> - 🗄️ superseded drafts, kept for history
> - 📤 delivered
>
> This document follows the `doc-drafting` workflow; the playbook for authors and reviewers is
> [here](https://github.com/JarvusInnovations/agent-skills/blob/main/skills/doc-drafting/README.md).

Where the tooling can set tab icons, use one per state so the tab strip reads as a phase
indicator without opening anything:

| Icon | Tab |
|---|---|
| 📋 | the README tab (header table plus legend) |
| 💬 | the current Generating draft: comments and contributed sections invited |
| ✏️ | the Refining tab: edit it directly |
| 🗄️ | superseded generations |
| 📤 | the Refining tab once the Delivered row is filled |

The pencil goes on Refining, not Generating, on purpose: that is the tab we want humans typing
in. The speech bubble on the current draft says "talk to it, don't edit it."

Icons are set by the agent, never typed by a human, which is why they're allowed here and not in
the table cells.

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
