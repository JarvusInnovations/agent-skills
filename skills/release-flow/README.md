# release-flow

Drives releases for repos wired with the **Jarvus develop→main Release-PR automation** (the
`JarvusInnovations/infra-components` `release-prepare` / `validate` / `publish` GitHub Actions). The
model is one long-lived `Release: vX.Y.Z` PR from `develop` into `main` — merging it publishes. This
skill gets that PR's version and release notes right, then merges on your go.

## When you'd want it

Whenever you're shipping merged work in such a repo: drafting or editing a `Release: v*` PR, deciding
the semver bump, writing the changelog (sorted into Improvements vs Technical), or merging to
publish. It also triggers the moment it spots a repo with `.github/workflows/release-prepare.yml` or
an open `Release: v*` PR.

## Install

**Recommended scope: global.** Releases are ambient work that spans the many repos Jarvus maintains —
most of which won't have this skill installed locally. Installing it once globally means the release
workflow is recognized wherever you happen to be shipping.

```bash
npx skills add --global JarvusInnovations/agent-skills --skill release-flow
```

Then say "cut a release" / "ship it" in a wired repo and the skill takes over. See `SKILL.md` for how
the automation works and the step-by-step.
