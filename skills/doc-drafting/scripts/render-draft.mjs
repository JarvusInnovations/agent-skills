#!/usr/bin/env bun
// render-draft: turn a draft markdown file (YAML frontmatter + body) into the markdown
// written to a generation tab: one grid (status rows, then generation rows), then the body.
//
//   render-draft <file> [--out <tab.md>] [--repo <owner/repo>] [--cols "<hint>"] [--check]
//
// --cols sets the grid's column hint (default "fit 1"; use "14% 86%" or "1 4" on a gws-axi
// without `fit`, or to carry forward widths a human set by hand).
//
// The Source row is derived here, not stored in the file: blob = `git hash-object <file>`,
// path = the file's path from the repo root, repo = origin's owner/repo unless --repo.
// Requires Bun (uses Bun.YAML). Exit 1 with a message on any schema problem.

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes(name);
const file = args.find((a, i) => !a.startsWith("--") && !["--out", "--repo", "--cols"].includes(args[i - 1]));
if (!file) fail("usage: render-draft <file> [--out <tab.md>] [--repo <owner/repo>] [--cols \"<hint>\"] [--check]");

const text = await Bun.file(file).text();
const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
if (!m) fail(`${file}: no YAML frontmatter block at the top of the file`);
const fm = Bun.YAML.parse(m[1]) ?? {};
const body = m[2].replace(/^\s*\n/, "");

// --- validate -------------------------------------------------------------------------
const problems = [];
const need = (cond, msg) => { if (!cond) problems.push(msg); };
need(fm.type === "draft", `type must be "draft" (got ${JSON.stringify(fm.type)})`);
for (const k of ["title", "version", "date", "prompt"]) need(fm[k] != null && fm[k] !== "", `${k} is required`);
need(Number.isInteger(fm.version) && fm.version >= 1, "version must be a positive integer");
need(fm.date == null || /^\d{4}-\d{2}-\d{2}$/.test(String(fm.date).slice(0, 10)), "date must be YYYY-MM-DD");
need(Array.isArray(fm.inputs) && fm.inputs.length > 0, "inputs must be a non-empty list");
need(fm.review?.id, "review.id is required (the Google Doc id)");
if (fm.from != null) {
  need(Number.isInteger(fm.from.version) && fm.from.version < fm.version, "from.version must be an integer less than version");
  need(fm.from.changes, "from.changes is required when from is present");
} else need(fm.version === 1, "version > 1 needs a from block (from.version, from.changes)");
need(fm.from != null || !(fm.inputs ?? []).some((i) => i?.new), "inputs marked new: true need a from block (nothing is new on v1)");
for (const [i, inp] of (fm.inputs ?? []).entries()) need(inp && (inp.title || inp.url || inp.path), `inputs[${i}] needs a title, url, or path`);
const st = fm.status ?? {};
need(["generating", "refining"].includes(st.stage), `status.stage must be generating or refining (got ${JSON.stringify(st.stage)})`);
need(st.owner, "status.owner is required");
const tl = st.timeline ?? {};
need(tl.generating?.since, "status.timeline.generating.since is required");
for (const ph of ["generating", "refining", "delivered"]) if (tl[ph]?.reviewed != null) need(Array.isArray(tl[ph].reviewed), `status.timeline.${ph}.reviewed must be a list`);
if (problems.length) fail(`${file}:\n  - ${problems.join("\n  - ")}`);
if (flag("--check")) { console.error(`ok: v${fm.version} ${iso(fm.date)}, ${st.stage} (${st.owner}), ${fm.inputs.length} inputs${fm.from ? `, from v${fm.from.version}` : ""}`); process.exit(0); }

// --- source row -----------------------------------------------------------------------
const sh = (cmd) => Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" });
const blobRun = sh(["git", "hash-object", file]);
if (blobRun.exitCode !== 0) fail(`git hash-object failed: ${blobRun.stderr.toString().trim()}`);
const blob = blobRun.stdout.toString().trim().slice(0, 12);
const npath = await import("node:path");
const top = sh(["git", "rev-parse", "--show-toplevel"]).stdout.toString().trim();
const path = npath.relative(top, npath.resolve(file));
let repo = opt("--repo");
if (!repo) {
  const url = sh(["git", "remote", "get-url", "origin"]).stdout.toString().trim();
  const mm = url.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
  if (!mm) fail("could not derive owner/repo from origin; pass --repo <owner/repo>");
  repo = mm[1];
}
const source = `${repo}@blob:${blob}:${path}`;

// --- grid -----------------------------------------------------------------------------
const cell = (s) => String(s ?? "").replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();
const md = (d) => { const s = iso(d); return s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : ""; };   // 2026-10-08 -> 10/8, typeable
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const phaseLine = (name, p, current) => {
  const bits = [];
  if (p?.date) bits.push(md(p.date)); else if (p?.since) bits.push(`since ${md(p.since)}`);
  if (p?.due) bits.push(`due ${md(p.due)}`);
  if (p?.to) bits.push(`to ${cell(p.to)}`);
  if (p?.via) bits.push(`via ${cell(p.via)}`);
  if (p?.url) bits.push(`[link](${p.url})`);
  if (p?.reviewed?.length) bits.push(`reviewed: ${p.reviewed.map(cell).join(", ")}`);
  const label = current ? `**${cap(name)}**` : cap(name);
  return `- ${label}${bits.length ? ` ${bits.join("; ")}` : ": not yet"}`;
};
const timeline = ["generating", "refining", "delivered"].map((ph) => phaseLine(ph, tl[ph], ph === st.stage || (ph === "delivered" && tl.delivered?.date))).join("<br>");
const version = `v${fm.version}, ${iso(fm.date)}${fm.from ? `, from v${fm.from.version}` : ""}`;
const prompt = cell(fm.prompt) + (fm.from?.prompt ? ` NEW: ${cell(fm.from.prompt)}` : "");
const link = (inp) => {
  const label = cell(inp.title ?? inp.url ?? inp.path);
  const href = inp.url ?? (inp.path ? `https://github.com/${inp.repo ?? repo}/blob/main/${inp.path}` : null);
  return href ? `[${label}](${href})` : label;
};
const inputs = fm.inputs.map((inp) => `- ${inp.new ? "NEW: " : ""}${link(inp)}`).join("<br>");
const playbook = "https://github.com/JarvusInnovations/agent-skills/blob/main/skills/doc-drafting/README.md";
const rows = [
  `<!-- cols: ${opt("--cols") ?? "fit 1"} -->`,
  `| Stage | ${cap(st.stage)} (${cell(st.owner)}) |`,
  `|---|---|`,
  `| **Ask** | ${st.ask ? cell(st.ask) : "(owner to fill)"} |`,
  `| **Timeline** | ${timeline} |`,
  `| **Version** | ${version} |`,
  `| **Source** | ${source} |`,
  `| **Prompt** | ${prompt} |`,
  `| **Inputs** | ${inputs} |`,
  ...(fm.from ? [`| **Changes** | ${cell(fm.from.changes)} |`] : []),
  `| **Workflow** | ✅ Edits are tracked: rewrite what you care about and the next generation keeps it; sign off on the Timeline line with your name and the date. [doc-drafting playbook](${playbook}) |`,
];
const out = `${rows.join("\n")}\n\n${body}`;
const outPath = opt("--out");
if (outPath) await Bun.write(outPath, out); else process.stdout.write(out);
console.error(`rendered v${fm.version} ${iso(fm.date)} → ${outPath ?? "stdout"}; source ${source}; tab name "v${fm.version} ${iso(fm.date)}"`);

function iso(d) { return d == null ? "" : (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10); }
function fail(msg) { console.error(`render-draft: ${msg}`); process.exit(1); }
