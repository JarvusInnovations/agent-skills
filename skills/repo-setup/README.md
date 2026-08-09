# repo-setup

Stands up a new Jarvus repository the house way: `develop` as the default branch, `main` as the
release target, merge-commit-only merge policy, branch rulesets, and the
`JarvusInnovations/infra-components` Release-PR workflows. The scope is the repo *shell* — the
plumbing that the code, the CI gates, and the release flow all sit inside.

## When you'd want it

Creating a new repo, pushing an existing local project to GitHub for the first time, adopting the
develop→main release flow somewhere it's missing, or auditing an existing repo against house
conventions.

It also earns its keep when the branch plumbing misbehaves in ways whose cause isn't obvious:
`develop` disappearing after a release merges, a Release PR reporting "No commits between main and
develop", PR checks stuck at `action_required` on a brand-new repo, or a first npm publish failing
from CI.

The reason this is a skill and not a remembered checklist: `gh repo create` ships defaults that are
wrong for this flow, and two of them stay invisible until they bite. Auto-delete plus a missing
`deletion` ruleset **deletes your `develop` branch** the first time a release merges. Squash-merging
left enabled means `git branch --merged` can never again tell you what shipped.

## Install

**Recommended scope: global.** Repo creation is inherently something you do *before* a repo exists
to install a skill into, and auditing an existing repo's settings is ambient work across the whole
portfolio.

```bash
npx skills add --global JarvusInnovations/agent-skills --skill repo-setup
```

Then say "set up a new repo" or "make this repo standard" and the skill takes over.

## What's inside

- `SKILL.md` — the house shape, the bootstrap procedure, verification, and the new-repo gotchas
- `references/npm.md` — npm-published packages: `package.json` fields, the publish workflow, the
  manual-first-publish and trusted-publishing bootstrap, and how to verify a package before it ships

## Related skills

- **`release-flow`** — cutting releases once the repo is wired: the Release PR, changelog, version
  bump, and merging to publish. `repo-setup` installs the plumbing; `release-flow` operates it.
- **`ci-quality-gates`** — the lint / format / type-check / test gates that run before merge.
- **`axi-skills`** — packaging an AXI CLI inside a skill, when the tool ships that way instead of to
  a registry.
