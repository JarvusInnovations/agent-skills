# Draft frontmatter

The committed source of a generation is a markdown file with YAML frontmatter: the stamp's data
as structured fields, plus fields the stamp never shows. `scripts/render-draft.mjs` turns it into
what gets written to a generation tab. The frontmatter is the record; the grid is a view.

## Schema

| Field | Type | Required | Meaning |
|---|---|---|---|
| `type` | `draft` | yes | Discriminator. Always the literal `draft`. |
| `title` | string | yes | The document's title. |
| `source_type` | `AI-generated` | yes | The library's provenance enum (`primary`, `AI-generated`, `mixed`). A draft is `AI-generated`. |
| `author` | string | yes | The owner: the person staking their reputation on it. |
| `version` | integer ≥ 1 | yes | The generation number. Matches the tab name `vN YYYY-MM-DD`. |
| `date` | `YYYY-MM-DD` | yes | When this generation was written. |
| `from` | object | if `version` > 1 | What this generation is relative to. Absent on v1. |
| `from.version` | integer | yes | The generation it was regenerated from. |
| `from.prompt` | string | no | The instruction this round added. Absent on a pure tightening round. |
| `from.changes` | string | yes | What moved this round, a line or two. Not a summary of the document. |
| `prompt` | string | yes | The cumulative paraphrase of the whole brief, rewritten tight each round. No markers in it. |
| `inputs` | list | yes | Everything fed to the model: sources, feedback, prior material. |
| `inputs[].title` | string | one of title/url/path | Display text. |
| `inputs[].url` | string | | Link. |
| `inputs[].path` | string | | A file in a repo; linked to `https://github.com/<repo>/blob/main/<path>`. |
| `inputs[].repo` | `owner/repo` | no | For `path`, when it's another repo. Defaults to this one. |
| `inputs[].new` | boolean | no | Introduced this round. Needs a `from` block. |
| `status` | object | yes | The human-owned rows of the grid, as they stood when this generation was written. The live grid on the current tab is the authority; this is the record. |
| `status.stage` | `generating` \| `refining` | yes | Bold line of the Timeline; header row of the grid. |
| `status.owner` | string | yes | Who moves it between stages. |
| `status.ask` | string | no | What this generation wants from readers and by when. Per-generation; carried forward as the default and confirmed with the owner each round. Renders `(owner to fill)` when absent. |
| `status.timeline.generating` | `{since, due?, reviewed?}` | yes (`since`) | Dates `YYYY-MM-DD`; `reviewed` a list of `Name M/D` strings, **cleared on every regeneration**. |
| `status.timeline.refining` | `{since?, due?, reviewed?}` | no | |
| `status.timeline.delivered` | `{due?, date?, to?, via?, url?}` | no | `date` + `to` + `via` + `url` once it went out. |
| `review` | object | yes | The copy generations are rendered to and reviewed on. |
| `review.platform` | string | no | `google-docs` for now. |
| `review.id` | string | yes | The Google Doc id. |
| `review.url` | string | no | Its edit link. |
| `published` | object | no | A public copy, if one exists: `date`, `url`. |

Keys are snake_case; dates are ISO in the file and render as `M/D` in the grid so humans can edit
them. `status` is the one block the agent doesn't author: before each regeneration it reads the
current tab's grid and copies the human rows into `status` (clearing `reviewed`), then regenerates.

## Example

```yaml
---
type: draft
title: Jarvus AI Use Policy
source_type: AI-generated
author: Ana
version: 3
date: 2026-10-09
from:
  version: 2
  prompt: keep the header table as an appendix pointing at the playbook
  changes: >-
    Restructured as a one-page principles cover plus three appendices; #7 split into
    guest communities vs. repos we maintain; answered both v1 comments.
prompt: >-
  Draft a short AI use policy from the brainstorm and the notes; fold in the channel
  history; restructure after the call as principles plus appendices.
inputs:
  - title: Brainstorm notes
    url: https://app.tana.inc?nodeid=…
  - title: Call transcript
    url: https://docs.google.com/document/d/…
    new: true
  - title: Two comments on v2
    new: true
  - title: doc-drafting playbook
    repo: JarvusInnovations/agent-skills
    path: skills/doc-drafting/README.md
status:
  stage: generating
  owner: Ana
  ask: Direction on the restructure; don't polish yet. By Tue 10/14.
  timeline:
    generating:
      since: 2026-10-06
      reviewed: []
    refining:
      due: 2026-10-13
    delivered:
      due: 2026-10-17
review:
  platform: google-docs
  id: 1oloOF…
  url: https://docs.google.com/document/d/1oloOF…/edit
---

# Jarvus AI Use Policy

…body…
```

## What renders where

| Grid row | From |
|---|---|
| `Stage` (header row) | `status.stage`, `status.owner` → `Generating (Ana)` |
| `Ask` | `status.ask`, or `(owner to fill)` |
| `Timeline` | one list line per phase from `status.timeline`; the current phase bold; dates as `M/D`; `reviewed:` names |
| `Version` | `version`, `date`, `from.version` → `v3, 2026-10-09, from v2` |
| `Source` | derived at render: `owner/repo@blob:<12-char git blob of this file>:<path>` |
| `Prompt` | `prompt`, then `NEW: ` + `from.prompt` when present |
| `Inputs` | each item as a `<br>`-separated list entry, linked; `NEW: ` where `new: true` |
| `Changes` | `from.changes`; row omitted on v1 |
| `Workflow` | fixed protocol line (✅ edits tracked, how to sign off, playbook link) |

`type`, `title`, `source_type`, `author`, `review`, `published` stay in the file. On
the repo surface (a draft that lives as a markdown file), GitHub renders the frontmatter as a
table at the top, so the stamp is visible there without any render step.

## The renderer

```sh
skills/doc-drafting/scripts/render-draft.mjs <file> --check            # validate only
skills/doc-drafting/scripts/render-draft.mjs <file> --out ./tab.md     # stamp + body, ready for docs write
```

Needs Bun (it uses `Bun.YAML`; no other dependency). It refuses to render on a schema problem and
says which. It derives the Source row from `git hash-object`, the file's path from the repo root,
and `owner/repo` from `origin` (override with `--repo`). It prints the tab name to use on stderr.
