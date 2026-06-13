# Workflow internals

The pieces behind the develop→main Release-PR flow. Read this when you need to
**inspect** an existing setup in detail or **scaffold** the automation into a repo
that doesn't have it yet. For day-to-day releasing you don't need this — SKILL.md
covers the procedure.

## The four workflow files

All live in `.github/workflows/`. The three `release-*` ones delegate to pinned
channels of `JarvusInnovations/infra-components`; `ci.yml` is the repo's own build/test.

### `release-prepare.yml`

```yaml
name: 'Release: Prepare PR'
on:
  push:
    branches: [ develop ]
permissions:
  contents: read
  pull-requests: write
jobs:
  release-prepare:
    runs-on: ubuntu-latest
    steps:
    - uses: JarvusInnovations/infra-components@channels/github-actions/release-prepare/latest
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        release-branch: main
```

On every push to `develop`: ensures a single open `Release: vX.Y.Z` PR into
`release-branch`, and posts/updates the bot `## Changelog` comment.

### `release-validate.yml`

```yaml
name: 'Release: Validate PR'
on:
  pull_request:
    branches: [ main ]
    types: [ opened, edited, reopened, synchronize ]
jobs:
  release-validate:
    runs-on: ubuntu-latest
    steps:
    - uses: JarvusInnovations/infra-components@channels/github-actions/release-validate/latest
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

Re-runs on every edit to the PR (including title/body edits you make). Validates the
release (version well-formed, not already published, etc.).

### `release-publish.yml`

```yaml
name: 'Release: Publish PR'
on:
  pull_request:
    branches: [ main ]
    types: [ closed ]
jobs:
  release-publish:
    runs-on: ubuntu-latest
    steps:
    - uses: JarvusInnovations/infra-components@channels/github-actions/release-publish/latest
      with:
        github-token: ${{ secrets.BOT_GITHUB_TOKEN }}
```

Fires when the PR closes. On a *merged* close it cuts the tag and publishes at the
title's version. Note it uses `BOT_GITHUB_TOKEN` (a PAT/app token), not the default
`GITHUB_TOKEN` — publishing usually needs to push tags/trigger downstream workflows
that `GITHUB_TOKEN` can't.

### `ci.yml` (illustrative — language-specific)

```yaml
name: CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
permissions:
  contents: read
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v6
    # ...toolchain setup (node/bun/python/etc.)...
    - run: <install>
    - run: <build>
    - run: <test>
```

Independent of the release actions but must be green on the Release PR like any check.

## npm publishing

Repos that publish to npm typically also have a `publish-npm.yml` invoked by the
publish step (or `release-publish` handles it directly). Trusted Publishing (OIDC,
no token) is the preferred path — configured on npmjs.com by linking the repo +
the publishing workflow. A first-ever publish sometimes needs a manual bootstrap
(`npm publish`) before Trusted Publishing can take over for subsequent automated releases.

## Detecting / verifying a setup

```sh
# Which release workflows exist?
ls .github/workflows/ | grep -E 'release-(prepare|validate|publish)'

# Confirm they point at infra-components and on what branches:
grep -rE 'infra-components|branches:|release-branch' .github/workflows/release-*.yml

# Is there an open Release PR right now?
gh pr list --state open --json number,title | jq '.[] | select(.title|startswith("Release: v"))'
```

## Scaffolding into a new repo

To add this flow to a repo that doesn't have it: create the three `release-*.yml`
files above (adjusting `release-branch` if not `main`), add a `ci.yml` for the repo's
stack, and ensure `BOT_GITHUB_TOKEN` is set in repo/org secrets for `release-publish`.
Pin the infra-components refs to the `.../latest` channels as shown, or to a specific
version if the org standardizes one. Always confirm the current recommended channel/ref
before writing — read the infra-components repo (e.g. `gh-axi repo view
JarvusInnovations/infra-components`) rather than assuming.
