# npm-published packages

Everything specific to a repo that ships a package to npm. The branch/merge/ruleset
shell in `SKILL.md` applies unchanged; this is what goes *inside* it.

## Contents

- [package.json](#packagejson)
- [Layout and toolchain](#layout-and-toolchain)
- [The publish workflow](#the-publish-workflow)
- [Bootstrapping the first publish](#bootstrapping-the-first-publish)
- [Verify before you ship](#verify-before-you-ship)
- [Version stamping](#version-stamping)

## package.json

The fields that matter for a published CLI, and why:

```jsonc
{
  "name": "<tool>",
  "version": "0.1.0",
  "type": "module",
  "bin": { "<tool>": "dist/bin/<tool>.js" },
  "files": ["dist", "LICENSE", "README.md"],
  "engines": { "node": ">=20" },
  "publishConfig": { "access": "public" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/JarvusInnovations/<tool>.git"
  },
  "license": "MIT",
  "keywords": ["<domain>", "cli", "agent"]
}
```

- **`files`** is an allowlist. Anything not listed stays out of the tarball — which
  also means anything the build happens to drop inside a listed directory *does* ship.
  Build metadata written into `dist/` leaks into the published package for exactly
  this reason.
- **`publishConfig.access: public`** is required for an unscoped public package;
  without it the publish fails on a first publish.
- **`repository`** drives the npm page's source link and is what provenance
  attestation ties the package back to.

Set these with `npm pkg set` rather than hand-editing, so the JSON stays valid and
dependency versions keep being resolved by the package manager:

```sh
npm pkg set type=module bin.<tool>=dist/bin/<tool>.js publishConfig.access=public
npm pkg set 'files[0]=dist' 'files[1]=LICENSE' 'files[2]=README.md'
```

Quote the bracket forms — zsh globs `files[0]=dist` and fails with "no matches found".

## Layout and toolchain

```
<repo>/
  bin/<tool>.ts        # entry: imports and calls main()
  src/                 # implementation
  test/                # vitest suites
  dist/bin/<tool>.js   # build output (gitignored, shipped via files)
```

**bun** is the package manager and dev runner; **vitest** is the test runner. Add
dependencies with `bun add` / `bun add -d` and commit `bun.lock`.

Scripts settle into a predictable set:

```jsonc
{
  "build": "tsc",                    // or a bundler, if the deps require it
  "check": "tsc --noEmit",
  "dev": "bun bin/<tool>.ts",
  "test": "vitest run",
  "prepublishOnly": "<same as build>"
}
```

`dist/` is gitignored — CI builds it before publishing, and `prepublishOnly` covers a
manual publish from a clean checkout.

**When a dependency forces bundling.** Plain `tsc` output is the default and the right
starting point. Some dependencies can't survive it: a package that imports a
subpath without a file extension (`import x from "pkg/thing"`) from a dependency that
publishes no `exports` map is unresolvable under Node's ESM loader, and the CLI fails
to *start*. A bundler resolves those specifiers at build time. If you switch to one,
say why in the README and add a CI step that runs the built artifact under plain
`node` — otherwise the next person "simplifies" the build and ships something that
won't boot.

## The publish workflow

Triggered by the GitHub release that `release-publish` creates, so it runs *after* the
Release PR merges:

```yaml
name: Publish npm package

on:
  release:
    types: [published]

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write        # required for OIDC trusted publishing
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          # Node 24 ships npm 11.x, which supports trusted publishing out of the
          # box. Using it directly sidesteps the broken `npm install -g npm@...`
          # self-upgrade path on node 22 runners (MODULE_NOT_FOUND:
          # promise-retry inside @npmcli/arborist).
          node-version: '24.x'
          registry-url: 'https://registry.npmjs.org'

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.3.11'

      - name: Resolve release tag
        run: echo "RELEASE_TAG=${GITHUB_REF_NAME}" >> $GITHUB_ENV

      - name: Set package.json version from tag
        run: npm version --no-git-tag-version --allow-same-version "${RELEASE_TAG#v}"

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build
        run: bun run build

      - name: Publish to npm
        run: npm publish --provenance --access public
```

Two things worth understanding rather than copying blindly:

- **No `NODE_AUTH_TOKEN` anywhere.** Authentication is OIDC trusted publishing, which
  is why `id-token: write` is present. If you find yourself adding a token, something
  upstream is misconfigured.
- **The version comes from the tag, not the repo.** `npm version` rewrites
  `package.json` before the build, so the build must read its version from
  `package.json` — see [Version stamping](#version-stamping).

## Bootstrapping the first publish

**The first publish of a new package name cannot come from CI.** Trusted publishing is
configured per package from that package's settings page on npmjs.com, and the page
only exists once the package does. So the ordering is:

1. **Publish once manually** from a clean checkout: `npm publish`
2. **Configure the trusted publisher** on npmjs.com — the repo and the workflow
   filename (`publish-npm.yml`)
3. **Every release after that goes through CI**

This isn't a guess; it's visible in the registry. Existing Jarvus packages show a
human `_npmUser` on their `0.1.0` and `GitHub Actions` on everything after:

```sh
npm view <pkg>@0.1.0 _npmUser     # a human maintainer — the manual bootstrap
npm view <pkg> _npmUser           # GitHub Actions <npm-oidc-no-reply@github.com>
```

Publishing is effectively irreversible — the name is claimed and unpublish is limited
to a 72-hour window — so confirm with the user before running it, and never publish
speculatively to "test" the pipeline.

**Verify the trust config actually works** on the first CI-driven release rather than
assuming. A successful OIDC publish looks like this:

```sh
npm view <pkg> _npmUser dist.attestations
# _npmUser.name: 'GitHub Actions'
# _npmUser.trustedPublisher: { id: 'github', oidcConfigId: 'oidc:...' }
# dist.attestations.provenance.predicateType: 'https://slsa.dev/provenance/v1'
```

A human name in `_npmUser` after a CI release means the publish silently fell back to
a token, or the release was published by hand.

**Watch for a version collision.** If the manual bootstrap published `0.1.0` and the
Release PR is still titled `Release: v0.1.0`, merging it tags fine and then fails at
`npm publish` — the version already exists. `release-validate` won't catch it, because
it only checks that the *git tag* is free, not the registry. Retitle the Release PR to
the next version before merging.

## Verify before you ship

Reasoning about a tarball is not the same as inspecting one. Pack it, install it
somewhere clean, and run it:

```sh
npm pack --dry-run                     # what's in it?
npm pack                               # produce the tarball
mkdir /tmp/pkgtest && cd /tmp/pkgtest
npm init -y && npm install <path>/<pkg>-<version>.tgz
./node_modules/.bin/<tool> --version   # does the bin resolve and run?
```

This catches the things that only appear at package boundaries: a `bin` path that
doesn't match the built file, a runtime dependency accidentally left in
`devDependencies`, build artifacts leaking into the tarball, and — for anything with
a native or DOM-shaped dependency — a module that resolves in the repo but not from a
consumer's `node_modules`.

Exercise the code path that uses your heaviest dependency, not just `--version`. A CLI
that starts fine can still fail the moment it touches the one dependency you
externalized.

## Version stamping

Whatever the CLI prints for `--version` should be exactly `package.json`'s version, and
should match what siblings print — a bare `1.8.0`, not `1.8.0 (a1b2c3d)`.

Resist stamping in `git describe` output. The publish workflow rewrites
`package.json` from the release tag before building, so `package.json` is already
authoritative at publish time; adding `git describe` makes the build depend on
checkout depth and tag availability in CI, which is a fragility with no upside.

If the build inlines the version into a bundle (via a `define` or similar), keep a
dev-mode fallback so running from source still works without a build step.
