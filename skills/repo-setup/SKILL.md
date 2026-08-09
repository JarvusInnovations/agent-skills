---
name: repo-setup
description: >-
  Stand up a new Jarvus repository the house way — the one-time bootstrap that wires
  `develop` as the default branch, `main` as the release target, merge-commit-only merge
  policy, branch rulesets that keep auto-delete from eating `develop`, and the
  `JarvusInnovations/infra-components` Release-PR workflows. Use when creating a new repo,
  running `gh repo create`, pushing an existing local project to GitHub for the first time,
  adopting the develop→main release flow in a repo that lacks it, or auditing an existing
  repo against house conventions. Also use when something in the branch/merge plumbing
  misbehaves: `develop` vanished after a release merged, a release PR reports "No commits
  between main and develop", PR checks sit at `action_required` on a new repo, someone
  squash-merged, or a first npm publish fails from CI. Triggers: "new repo", "create a
  repo", "set up a repo", "gh repo create", "push this to GitHub", "repo settings", "branch
  protection", "rulesets", "default branch", "develop branch is gone", "set up the release
  flow", "make this repo standard". Scope is the repo shell — cutting releases belongs to
  `release-flow`, pre-merge lint/test gates to `ci-quality-gates`.
---

# Repo setup (Jarvus house shape)

The one-time bootstrap that turns a directory into a Jarvus repo: branches, merge
policy, protection rulesets, and the Release-PR automation. Everything here is
**settings and plumbing** — the shell that the code, the CI gates, and the release
flow all sit inside.

The reason this is a skill rather than a checklist someone remembers: `gh repo create`
ships defaults that are actively wrong for this flow, and two of the mistakes are
invisible until they bite weeks later — one silently deletes your `develop` branch,
the other lets someone squash-merge and break `git branch --merged` forever.

## Scope: what's in, what's out

| In scope (the repo shell) | Out of scope (hand off) |
| --- | --- |
| Branches: `develop` default, `main` release target | Cutting a release, changelog, version bump → **`release-flow`** |
| Merge policy + auto-delete + rulesets | Lint / format / type-check / test gates → **`ci-quality-gates`** |
| Wiring the Release-PR workflows | Stack scaffolding → **`jarvus-react`**, **`jarvus-fastify`**, **`jarvus-flutter`**, **`jarvus-dbt`** |
| First-publish bootstrap (npm, etc.) | Bundling an AXI CLI into a skill → **`axi-skills`** |

One-sentence charter: **how a repo is shaped before any code matters.** Once the
shell is right, the other skills fill it in.

## The house shape

**`develop` is the default branch.** All pushes and PR merges land on `develop`.
`main` exists only as the release target — the `develop → main` Release PR is the
sole thing that ever writes to it, and merging that PR is what publishes.

Making `develop` the default is not cosmetic. GitHub bases new PRs on the default
branch, so a `main` default silently points every feature PR at the release branch,
where it either bypasses the release flow or gets caught in review. Setting the
default correctly makes the right thing the lazy thing.

**Merge commits only.** Squash and rebase merges are disabled everywhere:

- **Squash** rewrites a branch's commits into a new commit, so branch tips never
  become ancestors of the target. `git branch --merged` then can't tell what
  actually shipped, permanently.
- **Rebase** has the same ancestry problem.
- **Merge commits** keep history honest and let the Release-PR changelog attribute
  commits to their authors.

**Auto-delete head branches is on**, which is where the trap lives — see below.

## The trap that costs you `develop`

`delete_branch_on_merge` deletes the head branch of *any* merged PR. The Release PR's
head branch is **`develop`**. So the first time a release merges, GitHub deletes
`develop` — and since `release-prepare` triggers on pushes to `develop`, the release
flow is now broken with no obvious cause.

What prevents it in every healthy Jarvus repo is a **ruleset with a `deletion` rule**
on `develop`. Auto-delete respects it and skips the branch. This is the single most
important thing on this page: **the rulesets aren't optional hardening, they're what
makes auto-delete safe to leave on.**

Both branches get the same two rules:

- `deletion` — blocks deletion, including by auto-delete
- `non_fast_forward` — blocks force-pushes that would rewrite shared history

## Procedure

Run these steps yourself rather than handing the user a checklist — the settings are
tedious, order-dependent, and the ruleset step is precisely the one a human skips.
Two things are worth stopping for, because they're outward-facing and hard to undo:
**creating the repo** (org and visibility) and **publishing an artifact**. Confirm
those, then execute the rest.

### 1. Decide the org and visibility

Published tooling lives under **`JarvusInnovations`** and is public unless there's a
reason otherwise. Confirm with the user before creating anything — a repo in a company
org is outward-facing and awkward to undo. If the project is personal rather than
Jarvus work, that's a different account and worth asking about explicitly.

### 2. Seed the branches

Commit locally first, then create the repo. Seed `main` with the initial commit and do
the substantive work on `develop`, so the first Release PR has real content:

```sh
git init && git add <files> && git commit -m "chore: initial commit"
gh repo create JarvusInnovations/<name> --public --source=. --remote=origin \
  --description "<one-liner>"
git push -u origin main
git checkout -b develop && git push -u origin develop
gh api -X PATCH repos/JarvusInnovations/<name> -f default_branch=develop
```

If `main` and `develop` end up at the *same* commit, the first `release-prepare` run
fails with **"No commits between main and develop"**. That's benign — it self-heals as
soon as `develop` gets a commit `main` doesn't have — but it does mean the initial
import never appears in a changelog. Seeding as above avoids it.

### 3. Fix the repo settings

`gh repo create` allows squash and rebase merges and leaves auto-delete off. All three
are wrong:

```sh
gh api -X PATCH repos/JarvusInnovations/<name> \
  -F allow_squash_merge=false \
  -F allow_rebase_merge=false \
  -F allow_merge_commit=true \
  -F delete_branch_on_merge=true
```

### 4. Add the protection rulesets

Do this **before** the first release merges, or step 3's auto-delete will take
`develop` with it:

```sh
for b in develop main; do
  gh api -X POST repos/JarvusInnovations/<name>/rulesets --input - <<EOF
{
  "name": "Protect $b",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["refs/heads/$b"], "exclude": [] } },
  "rules": [ { "type": "deletion" }, { "type": "non_fast_forward" } ]
}
EOF
done
```

**Requiring PRs is the maturity dial.** Adding a `pull_request` rule forces changes
through review. New projects typically start without it on `develop` so work can move
fast, and turn it on once the project stabilizes or grows past one or two people. Ask
which stage the project is at rather than assuming; the answer is a judgment call about
team size and churn, not a default.

To require PRs on a branch, add `{ "type": "pull_request" }` to that ruleset's rules.

### 5. Pin the toolchain

Tool versions come from `asdf` and a committed `.tool-versions`. Never hand-edit that
file — the whole point is that `asdf` picks resolvable versions:

```sh
asdf set <tool> latest   # or a specific version
asdf install
```

CI should pin the same versions it declares. Provisioning and caching details are
`ci-quality-gates`' territory.

### 6. Wire the release workflows

Copy the four workflows from a repo already on the flow (`harvest-axi` and `gws-axi`
are good references) rather than writing them from scratch — they're thin wrappers
around `JarvusInnovations/infra-components` actions, and the wrappers carry hard-won
details:

| Workflow | Trigger |
| --- | --- |
| `release-prepare.yml` | push to `develop` — opens/refreshes the Release PR |
| `release-validate.yml` | PR to `main` — gates title format and tag collision |
| `release-publish.yml` | Release PR merged — tags and publishes |
| `<publish>.yml` | GitHub release published — ships the artifact |

`release-publish.yml` uses `secrets.BOT_GITHUB_TOKEN`; the other two use
`secrets.GITHUB_TOKEN`. Confirm the bot token exists at the org level, or the publish
step fails only at the moment you most want it to work.

How these behave once running — the changelog comment, the version bump, merging to
publish — is **`release-flow`**. Don't reimplement that reasoning here.

### 7. Verify before declaring done

Settings are easy to get wrong silently, so read them back:

```sh
gh api repos/JarvusInnovations/<name> \
  --jq '"default=\(.default_branch) squash=\(.allow_squash_merge) rebase=\(.allow_rebase_merge) merge=\(.allow_merge_commit) autodel=\(.delete_branch_on_merge)"'
gh api repos/JarvusInnovations/<name>/rulesets \
  --jq '.[] | "\(.name): \([.rules[].type]|join(",")) on \(.conditions.ref_name.include|join(","))"'
```

Expect `default=develop squash=false rebase=false merge=true autodel=true`, and a
`deletion` rule covering both branches.

## Gotchas that only appear on brand-new repos

**PR checks stuck at `action_required`.** GitHub requires manual approval for workflow
runs from first-time contributors, and `github-actions[bot]` counts as one on a repo
with no history. The Release PR's checks sit unapproved with no explanation. Approve
them once and it stops recurring:

```sh
gh api -X POST repos/<owner>/<repo>/actions/runs/<run-id>/approve
```

**The first publish usually can't be automated.** Registries that authenticate CI via
OIDC generally need the artifact to exist before you can configure trust for it, which
makes the first publish a manual step. This is registry-specific — see
`references/npm.md` for how it plays out on npm.

**A red `release-validate` on a non-release PR is expected.** The workflow fires on
every PR into `main` with no title filter, so a hotfix PR shows a failing "title must
match" check by design. Don't retitle a non-release PR to appease it.

## Adopting the flow in an existing repo

Same steps, different order of risk. Audit first (step 7's commands work on any repo),
then fix what's off. Two things to watch:

- **If `develop` doesn't exist yet**, create it from the current default branch before
  flipping the default, so nobody's in-flight work targets a branch that's about to
  change meaning.
- **If the repo already has merged history with squashed commits**, `git branch --merged`
  is already unreliable for those branches; turning squash off stops the bleeding but
  doesn't repair the past. Say so rather than implying a clean slate.

## Language-specific setup

The shell above is language-agnostic. Details that only apply to a particular kind of
project live in `references/`:

- **`references/npm.md`** — npm-published packages: `package.json` fields, the
  `bin/` → `dist/` layout, the publish workflow, the manual-first-publish and trusted
  publishing bootstrap, and how to verify a package before it ships.

Read the relevant reference when the project is that kind; skip it otherwise.
