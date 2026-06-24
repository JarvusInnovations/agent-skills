# Generating SKILL.md from a single source of truth

A skill's `SKILL.md` documents the CLI's commands. If you write that by hand, it drifts from the
implementation the moment you add a flag. The fix: derive the command-reference *region* of
SKILL.md from the same data structure the CLI itself uses, and gate drift in CI. This is item #5
in [kunchenguid/axi#46](https://github.com/kunchenguid/axi/issues/46).

Templates: `references/templates/skill.ts`, `references/templates/build-skill.ts`.

## The single source: `reference.ts`

One module exports the CLI's identity and command catalog. Everything else derives from it:

```ts
export const DESCRIPTION = "Query … for the current repo — what's ready, what's blocked, …";

export interface CommandRef { usage: string; summary: string; }
export interface CommandGroup { group: string; commands: CommandRef[]; }

export const COMMAND_GROUPS: CommandGroup[] = [
  { group: "Plans", commands: [
    { usage: "next [--include-in-progress] [--dir <path>]", summary: "Plans ordered by readiness…" },
    { usage: "dag [--direction TB|LR] [--fence] [--dir <path>]", summary: "Mermaid graph of the DAG…" },
  ]},
  { group: "Session", commands: [
    { usage: "hook install [--scope project|global] | hook status | hook uninstall", summary: "Manage the SessionStart hook…" },
  ]},
];
```

`COMMAND_GROUPS` feeds **three** consumers, so they can never disagree:

1. the home view's `help[]` / command listing,
2. the `--help` top-level reference,
3. the generated SKILL.md command-reference region (below).

## Marker-splice, don't fully generate

SKILL.md is mostly hand-authored prose (methodology, philosophy, when-to-use). Only the
machine-maintained regions live between markers; everything outside is never touched:

```md
## Commands

<!-- BEGIN GENERATED: command-reference -->

### Plans

- `scripts/mytool next …` — Plans ordered by readiness…

<!-- END GENERATED: command-reference -->
```

The splicer replaces only the marked span. Inside SKILL.md, examples use the **relative**
`scripts/mytool` form (the skill's working context is its own directory) — not `cliInvocation()`,
which is for runtime-emitted output.

```ts
const SKILL_INVOCATION = "scripts/mytool";

export function commandReferenceMarkdown(): string {
  return COMMAND_GROUPS.map((g) => {
    const items = g.commands
      .map((c) => `- \`${SKILL_INVOCATION} ${c.usage}\` — ${c.summary}`)
      .join("\n");
    return `### ${g.group}\n\n${items}`;
  }).join("\n\n");
}

export const GENERATED_REGIONS: Record<string, () => string> = {
  "command-reference": commandReferenceMarkdown,
};
```

`spliceGeneratedRegions(doc)` loops the regions, regex-replaces between each `BEGIN/END GENERATED:
<id>` pair, and **throws if a declared region's markers are missing** — so a typo'd marker fails
loudly instead of silently leaving the doc stale. Full implementation in
`references/templates/skill.ts`.

## More than one region

You can splice several regions from different sources — useful when prose elsewhere in SKILL.md
duplicates a constant. A richer tool might generate several: `command-reference` (from
`COMMAND_GROUPS`), plus `entity-types` (introspected from zod schemas / type tables) and a
`philosophy` region (from a string constant a `playbook`-style command also emits). The rule:
**if a fact appears in both SKILL.md prose and code, make it a generated region** so it can't
drift.

Tip: keep generated content in `.ts` string constants rather than separate `.md` files loaded at
build time — a `.md`-loader path hit a bun/esbuild divergence in practice, and a string constant
just works for both the CLI surface and the splice.

## `build-skill.ts`

Reads each SKILL.md, runs the splicer, and either rewrites it or — with `--check` — fails if it
would change:

```ts
const out = spliceGeneratedRegions(readFileSync(PATH, "utf8"));
if (check && src !== out) { console.error("SKILL.md is out of date — run `bun run build:skill`"); process.exit(1); }
```

For a **multi-skill repo**, use a `TARGETS: {path, splice}[]` array — each skill's SKILL.md paired
with its splice function. One source module can export multiple splicers (e.g. a `makeSplicer(regions)`
factory bound to different `COMMAND_GROUPS` + invocation strings).

## Tie it into CI

The combined `check` script runs both gates:

```json
{ "scripts": {
  "build": "bun scripts/build-cli.ts && bun scripts/build-skill.ts",
  "check": "bun scripts/build-cli.ts --check && bun scripts/build-skill.ts --check"
}}
```

CI runs `bun run check`, so a PR that changes `src/cli/` without rebuilding — or edits the
generated SKILL.md region by hand — fails. See `references/templates/check.yml`.
