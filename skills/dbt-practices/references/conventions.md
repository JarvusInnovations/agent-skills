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

Pick the **grain** before the materialization, and don't multiply rows you don't need.
*Case in point:* a schedule fact built as one row per `(service_date, trip_id)` exploded a
TIDES dataset to ~229M rows; rebuilt as **date-free, feed-scoped facts** (one row per
`(_feed_digest, trip_id)`) plus a narrow calendar map, it dropped to ~53M — consumers join
the calendar and compute timestamps inline. Prefer a date-free fact + calendar map over
materializing a schedule across every service date.

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

Comments describe what the code **persistently is**, never what changed. Don't write
"renamed from X", "replaced the in-flight Z", "now uses…". Write what the thing is and why it
exists. Change narration belongs in the commit message, not the source.

## Must work for every tenant/project

A change has to **parse and run across all configured tenants** (or target projects), not just
the one you edited — tenant-specific divergence hides bugs. The CI gate runs `dbt parse` for
every tenant on each PR ([linting-and-ci.md](linting-and-ci.md)); don't merge on the strength
of one tenant compiling.
