# Header and stamp tables

Copy these verbatim. Both are plain two-column tables so they survive every renderer and so
humans can edit them without reaching for characters they can't type.

## The header (front tab, hidden first slide, or top of file)

Blank template:

| | |
|---|---|
| **Stage** | Generating (owner) |
| **Ask** | |
| **Generating** | MM/DD- |
| **Refining** | |
| **Delivered** | |
| **Prompt** | |
| **Inputs** | - |

Filled example, mid-Refining:

| | |
|---|---|
| **Stage** | Refining (Ana) |
| **Ask** | Line edits through Fri 10/10. Flag anything you'd refuse to follow. |
| **Generating** | 10/6-10/9; Ben v3, Cy v2 |
| **Refining** | v4, 10/9-, due 10/13; Ben 10/10, Cy pending |
| **Delivered** | due 10/14 |
| **Prompt** | Draft a short policy from my notes; fold in the channel history; restructure as principles plus appendices after the call. |
| **Inputs** | - [Brainstorm notes](#)<br>- [Channel history](#), Jun-Sep<br>- [Call transcript](#) |

Filled example, delivered:

| | |
|---|---|
| **Stage** | Refining (Ana) |
| **Ask** | None; delivered. |
| **Generating** | 10/6-10/9; Ben v3, Cy v3 |
| **Refining** | v4, 10/9-10/13; Ben 10/10, Cy 10/12 |
| **Delivered** | 10/14; to the team via #general; [delivered copy](#) |
| **Prompt** | ... |
| **Inputs** | ... |

## Who writes which row

| Row | Written by | Notes |
|---|---|---|
| Stage | human (owner) | One word plus owner in parentheses. The agent updates it only when the owner says to freeze or to reopen. |
| Ask | human (owner) | Never composed by the agent. The agent may ask for it and insert it verbatim. |
| Generating / Refining / Delivered | human, with agent assistance on dates | Sign-offs are written by the reviewers themselves. The agent fills the start date when it creates the document, the end date and the frozen version when told to freeze, and the Delivered line from what the author reports. |
| Prompt | agent | Cumulative paraphrase of the instructions so far. Rewritten every round. |
| Inputs | agent | Cumulative, linked, bulleted. Appended every round. |

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

## The stamp (top of every generation tab)

| | |
|---|---|
| **Version** | v3, 2026-10-09, from v2 |
| **Prompt** | added "restructure as one-page principles with appendices; keep the header as an appendix" |
| **Added inputs** | [Call transcript](#) |
| **Changes** | #7 split guest-community vs. repos we maintain; title-suffix convention under #2; header moved to its own front tab |

- `Version` is always present. `v1` has no `from`.
- `Prompt` is the **delta** for this round, quoted or paraphrased. The header's Prompt row is the
  cumulative paraphrase; the two are not the same text.
- `Added inputs` lists only sources new this round, linked. The same links get appended to the
  header's Inputs row.
- `Changes` is what moved, in a line or two. Not a summary of the document.
- Omit any of the last three rows when empty. A pure tightening round is `Version` alone.

## Tab names and icons

Generation tabs: `v3 2026-10-09`. On freeze: `v4 2026-10-09 [REFINING]`. The header tab is named
`Header` or the document's short name; it is always first, and generation tabs are inserted at
position 1 so the newest is directly after it.

Where the tooling can set tab icons, use one per state so the tab strip reads as a phase
indicator without opening anything:

| Icon | Tab |
|---|---|
| 📋 | the header tab |
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
