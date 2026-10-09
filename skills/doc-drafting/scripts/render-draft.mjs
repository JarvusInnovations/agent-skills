#!/usr/bin/env bun
// render-draft: turn a draft markdown file (YAML frontmatter + body) into the markdown
// written to a Google Docs generation tab: the stamp table, then the body.
//
//   render-draft <file> [--out <tab.md>] [--repo <owner/repo>] [--check]
//
// The Source row is derived here, not stored in the file: blob = `git hash-object <file>`,
// path = the file's path from the repo root, repo = origin's owner/repo unless --repo.
// Requires Bun (uses Bun.YAML). Exit 1 with a message on any schema problem.

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes(name);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out" && args[args.indexOf(a) - 1] !== "--repo");
if (!file) fail("usage: render-draft <file> [--out <tab.md>] [--repo <owner/repo>] [--check]");

const text = await Bun.file(file).text();
const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
if (!m) fail(`${file}: no YAML frontmatter block at the top of the file`);
const fm = Bun.YAML.parse(m[1]) ?? {};
const body = m[2].replace(/^\s*\n/, "");

// --- validate -------------------------------------------------------------------------
const problems = [];
if (fm.type !== "draft") problems.push(`type must be "draft" (got ${JSON.stringify(fm.type)})`);
for (const k of ["title", "version", "date", "prompt"]) if (fm[k] == null || fm[k] === "") problems.push(`${k} is required`);
if (!Number.isInteger(fm.version) || fm.version < 1) problems.push("version must be a positive integer");
if (fm.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(fm.date).slice(0, 10))) problems.push("date must be YYYY-MM-DD");
if (!Array.isArray(fm.inputs) || fm.inputs.length === 0) problems.push("inputs must be a non-empty list");
if (!fm.review?.id) problems.push("review.id is required (the Google Doc id)");
if (fm.from != null) {
  if (!Number.isInteger(fm.from.version) || fm.from.version >= fm.version) problems.push("from.version must be an integer less than version");
  if (!fm.from.changes) problems.push("from.changes is required when from is present");
} else if (fm.version > 1) problems.push("version > 1 needs a from block (from.version, from.changes)");
const newInputs = (fm.inputs ?? []).filter((i) => i?.new);
if (fm.from == null && newInputs.length) problems.push("inputs marked new: true need a from block (nothing is new on v1)");
for (const [i, inp] of (fm.inputs ?? []).entries()) if (!inp || (!inp.title && !inp.url && !inp.path)) problems.push(`inputs[${i}] needs a title, url, or path`);
if (problems.length) fail(`${file}:\n  - ${problems.join("\n  - ")}`);
if (flag("--check")) { console.error(`ok: v${fm.version} ${String(fm.date).slice(0, 10)} (${fm.inputs.length} inputs${fm.from ? `, from v${fm.from.version}` : ""})`); process.exit(0); }

// --- source row -----------------------------------------------------------------------
const sh = (cmd) => Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" });
const blobRun = sh(["git", "hash-object", file]);
if (blobRun.exitCode !== 0) fail(`git hash-object failed: ${blobRun.stderr.toString().trim()}`);
const blob = blobRun.stdout.toString().trim().slice(0, 12);
const top = sh(["git", "rev-parse", "--show-toplevel"]).stdout.toString().trim();
const path = (await import("node:path")).relative(top, (await import("node:path")).resolve(file));
let repo = opt("--repo");
if (!repo) {
  const url = sh(["git", "remote", "get-url", "origin"]).stdout.toString().trim();
  const mm = url.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
  if (!mm) fail("could not derive owner/repo from origin; pass --repo <owner/repo>");
  repo = mm[1];
}
const source = `${repo}@blob:${blob}:${path}`;

// --- stamp ----------------------------------------------------------------------------
const cell = (s) => String(s).replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();
const date = String(fm.date).slice(0, 10);
const version = `v${fm.version}, ${date}${fm.from ? `, from v${fm.from.version}` : ""}`;
const prompt = cell(fm.prompt) + (fm.from?.prompt ? ` NEW: ${cell(fm.from.prompt)}` : "");
const link = (inp) => {
  const label = cell(inp.title ?? inp.url ?? inp.path);
  const href = inp.url ?? (inp.path ? `https://github.com/${inp.repo ?? repo}/blob/main/${inp.path}` : null);
  return href ? `[${label}](${href})` : label;
};
const inputs = fm.inputs.map((inp) => `- ${inp.new ? "NEW: " : ""}${link(inp)}`).join("<br>");
const rows = [
  `<!-- cols: fit 1 -->`,
  `| Version | ${version} |`,
  `|---|---|`,
  `| **Source** | ${source} |`,
  `| **Prompt** | ${prompt} |`,
  `| **Inputs** | ${inputs} |`,
  ...(fm.from ? [`| **Changes** | ${cell(fm.from.changes)} |`] : []),
];
const out = `${rows.join("\n")}\n\n${body}`;
const outPath = opt("--out");
if (outPath) await Bun.write(outPath, out); else process.stdout.write(out);
console.error(`rendered v${fm.version} ${date} → ${outPath ?? "stdout"}; source ${source}; tab name "v${fm.version} ${date}"`);

function fail(msg) { console.error(`render-draft: ${msg}`); process.exit(1); }
