# Modeling conventions

The rules to apply on every model, with the rationale. These encode our dbt lead's
corrections to ad-hoc/AI-scaffolded work — follow them over whatever a model currently does.

## Layering & stage discipline

`staging → intermediate → marts`. What each stage is allowed to do is the part people get
wrong:

- **`staging` (`stg_*`)** — exactly **1:1 with the source**. Rename columns, recast types,
  trivially clean (trim, null-empty). **No dedup, no aggregation, no joins, no business
  logic.** A staging model that dedups "one row per X" has already destroyed rows a
  downstream consumer may need — that's the canonical AI-slop mistake. One staging model per
  source table.
- **`intermediate` (`int_*`)** — reshaping, joins, business logic, the heavy lifting.
  Not exposed to BI; consumed by marts.
- **`marts` (`dim_*` / `fct_*`)** — the consumable grain, documented and tested. This is what
  downstream/BI reads.

## Materialization is deliberate

Never assume a default. Choose per model and record why:

- **view** — cheap, always-fresh, light transforms (often staging).
- **table** — expensive-to-compute or heavily-read; intermediate/marts.
- **incremental** (incl. `microbatch`) — large append-mostly facts; pick the grain and
  `event_time` carefully.

Pick the **grain** before the materialization, and let **observed performance when the model
is consumed** drive the choice — not table size on its own. A big table isn't a problem until
something querying it is slow; a "small" model can still warrant a table if it's on a hot path.
*Example:* a schedule fact keyed per `(service_date, trip_id)` was fine to build but slow once
consumed; re-grained to date-free, feed-scoped facts (one row per `(_feed_digest, trip_id)`)
plus a narrow calendar map that consumers join, it performed. The transferable lesson is the
**method** — choose grain, then measure consumption — not a blanket "avoid date-scoped facts."

## No inner joins

Use **left joins with explicit `where` filters**. An inner join silently drops rows that
don't match — and silent drops are invisible downstream and surface as wrong numbers, not
errors.

*Case study (why this is a hard rule):* a realtime `stop_visits` model inner-joined observed
vehicle trips to a date-scoped schedule fact. When the RT feed emitted real trips whose
`trip_id` didn't exist on that calendar day (holiday-week service mapped to weekday IDs), the
join **dropped ~3.4% of operated trips with no error** — biased toward exactly the days you'd
most want to measure. A left join + a surfaced mismatch flag would have made the loss visible.

If you must filter to matches, do it in an explicit `where` so the intent (and the loss) is on
the page, and consider a quality test/flag that counts the dropped rows.

## Import dependencies at the top

Each upstream `ref()`/`source()` gets one import CTE at the top of the file:

```sql
with
vehicle_positions as (
    select * from {{ ref('stg_vehicle_positions') }}
),

scheduled_trips as (
    select * from {{ ref('fct_scheduled_trips') }}
),

-- ... logic CTEs below ...
```

Readability + dependency tracing: a reader sees every input in one place, and the logic CTEs
reference clearly-named relations rather than inline `ref()` calls.

## End every model with a named, fully-enumerated SELECT

A model's final statement is a CTE **named the same as the model**, with **every output column
enumerated** (no `select *` from upstream), followed by `select * from <model_name>`:

```sql
dim_stops as (
    select
        stop_id,
        stop_name,
        stop_lat,
        stop_lon,
    from ...
)

select * from dim_stops
```

Three payoffs: the **model's name appears inside its own file** (so a VS Code search for the
model name lands in its code), the **column list is explicit** so it's easy to audit against the
model's docs, and **PR diffs highlight what's actually changing on the output** rather than
burying it in intermediate logic.

## Semantic table aliases

**Never letter abbreviations** (`vp`, `st`, `sv`, `tp`, `dsf`, `t`, `s`). Derive a short noun
from the table/CTE by stripping layer/namespace prefixes (`stg_`, `int_`, `dim_`, `fct_`,
`gtfs_`, `gtfs_rt__`, the project/agency slug) and keep the meaningful noun:

| Relation | Alias |
|---|---|
| `fct_scheduled_stop_times` | `scheduled_stop_times` |
| `stg_gtfs_stops` / `dim_stops` | `stops` |
| `stg_vehicle_positions` | `vehicle_positions` |
| `int_gtfs_shape_geometry` | `shape_geometry` |

- When a **CTE already has a good name, reference it directly** — `from route_trips`, not
  `from route_trips t`.
- **Self-joins / two refs to the same table** use role-based names — `from_stop`/`to_stop`,
  not `a`/`b`.
- Keep aliases **consistent across models** — the same table gets the same alias everywhere.

sqlfluff enforces parts of this for you (`aliasing.forbid` forbids unnecessary aliases;
`references.qualification` requires qualified columns), but the *semantic-noun* choice is a
human call — see [linting-and-ci.md](linting-and-ci.md).

## Timeless comments

(General code-comment hygiene, not dbt-specific — kept here because AI-generated models
frequently narrate their own edits.) Comments describe what the code **persistently is**, never
what changed. Don't write
"renamed from X", "replaced the in-flight Z", "now uses…". Write what the thing is and why it
exists. Change narration belongs in the commit message, not the source.

## Must work for every tenant/project

A change has to **parse and run across all configured tenants** (or target projects), not just
the one you edited — tenant-specific divergence hides bugs. The CI gate runs `dbt parse` for
every tenant on each PR ([linting-and-ci.md](linting-and-ci.md)); don't merge on the strength
of one tenant compiling.

## A fast (<5 min) dev loop is a project requirement

Every dbt project must have a documented, quickly runnable way to **exercise the project end to
end in under ~5 minutes**. Local-only is fine — it doesn't have to be the production path. What
it must do is give a developer editing models a quick feedback cycle, so data-modeling work is
never blocked by pipeline performance — especially where there are slow fetch paths between
remote sources and local dev.

Treat this as part of **project setup**, not a later nicety: if iterating on a model requires a
long remote fetch or a full rebuild, that's a project bug to fix *before* more modeling work
piles onto it. Building blocks, cheapest first:

- **dbt unit tests** — fixture-based, no data read at all ([testing.md](testing.md)).
- **`dbt parse` / `dbt compile`** — catches ref/config/jinja errors with no data.
- **`dbt build` against a small local target** — a local DuckDB target, a sampled/thin slice of
  source data (seeds or a cached extract), or `--empty` runs to validate SQL shape.
- **`state:modified` + deferral** (dbt-labs' `using-dbt-state`) — scope the build to changed
  models instead of rebuilding the world.

Whatever the combination, **write it down in the project README** ("how to iterate locally in
<5 minutes") so it's the default workflow rather than tribal knowledge, and keep it working —
a fast path that has rotted is the same as not having one.

## Unvalidated demo work doesn't live in `main`

Demo/spike models that haven't been **validated** don't get merged into the main dbt project —
or, if they had to merge for a demo, they get **removed after the demo**, leaving breadcrumbs
(a tag or branch preserving the code, plus a short note — README, ADR, or closing PR comment —
saying what it was and where it lives) so someone doing similar work later can find it.

Why this is a hard rule: once demo models are integrated into the main DAG, they're impossible
to just ignore — they look plausible, other models can come to depend on them, and untangling
an at-best-partially-correct implementation costs more than building fresh. It also poisons the
project for whoever comes next: a repo full of plausible-looking but unvalidated models makes
"start over vs. build on this" undecidable (is the package structure sound scaffolding, or is
it as unvalidated as the models inside it?).

In practice:

- Demos live on a **branch** until the models are validated to the normal bar (tested grain,
  reviewed logic — see [testing.md](testing.md)).
- If demo code did land in `main`, **removal is the default** once the demo is over. Preserving
  it is what the breadcrumbs are for; keeping it "because it might be useful" is how the DAG
  accretes half-right models.
- When you **inherit** a project containing plausible-looking but unvalidated work: treat the
  structure as scaffolding at most, and require validation before treating any model as
  correct. "Looks plausible" is not evidence. Prefer explicitly starting a model over from its
  spec to incrementally untangling a partially-correct implementation.
