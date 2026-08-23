# SlateAdmin: audit & modernization playbook

SlateAdmin (`SlateFoundation/slate`, `sencha-workspace/SlateAdmin/`) is the oldest and
largest classic app: ~133 JS files, 2014–2022, with three distinguishable code eras
side by side. It is the target of an end-to-end cleanup campaign whose goal is a stable
baseline — converged on the house style in the other references — for incremental
fixes until ExtJS is retired. **Read this before any change in SlateAdmin**: several
defects below look like app bugs but are architecture drift, and several files are
booby-trapped (duplicates maintained in lockstep, dead code that looks live).

Snapshot facts (2022 tip): controllers hold ~56% of the code (6,971 lines across 28
files); stores are near-empty shells; zero MVVM anywhere; `app/widget/` is a
mini component library and the cleanest code in the app.

## Known bugs & hazards (verify, then fix or don't trip them)

- **Dead login flow.** `app/controller/Login.js` listens for an application event
  `sessionexpired` that nothing in the workspace fires; its handler references a
  `viewport` ref it doesn't have and calls a modern-toolkit method (`setMasked`). It
  would throw if it ever ran. (Real 401 handling comes from jarvus-apikit's
  LoginWindow.) Candidate for deletion, not repair.
- **Two API singletons, four proxy aliases.** `SlateAdmin.API` + app-local proxies
  (`slaterecords`, `slateapi`) coexist with `Slate.API` + package proxies
  (`slate-records`, `slate-api`); both singletons hold independent host/token/session
  config and in-app usage is genuinely mixed. They only agree today because both parse
  the same query params. Converge on `Slate.API` and the package proxies; don't add
  usage of the app-local pair.
- **Vendored packages re-implemented locally.** `overrides/tree/Records.js` is
  byte-identical to the `jarvus-ext-treerecords` package file **and defines the same
  class name** (both load). `overrides/util/EncodedHistory.js` forks jarvus-routing's
  RouteEncoding with divergent decoding (deprecated `unescape()` vs
  `decodeURIComponent()`) — two decoders live at once. `overrides/util/PushHistory.js`
  shadows what `redirectTo` should do and its own header says
  `TODO: purge in favor of this.redirectTo(...)`.
- **`redirectTo` is used exactly twice**; ~24 call sites across 10 controllers use the
  forked `pushState` + 36 `suspendState`/`resumeState` sites instead.
- **Shadowed model/store pair.** `SlateAdmin.model.Location` + `store.Locations` exist
  but are orphaned — the Locations controller uses `Location@Slate.model` /
  `Locations@Slate.store`. Don't "fix" code into the orphaned pair.
- **XSS surfaces.** `model/course/Section.js` `getLink()` returns unescaped HTML;
  `PushHistory` writes `titleDom.innerHTML` from titles built with user search queries.
  Encode at these seams when touching them.
- **One `Ext.getCmp` in the app** (`view/people/NavPanel.js` → an id assigned in
  `AdvancedSearchForm.js`) — a cross-file hardcoded-id coupling; replace with a ref
  when nearby.
- **Latent lint-level bugs** (ESLint is configured but not run): duplicate `'class'`
  field in `store/people/ContactPointTemplates.js`; duplicate entries in
  `controller/Courses.js` `stores:`; `var` shadowing in `settings/Locations.js` /
  `settings/Groups.js`; assigned-never-used vars in Viewport/Login; a stray
  `console.info` in `view/people/details/contacts/List.js`.
- **`index.html` carries a vestigial `manifest=""`** (dead AppCache); `dev-loader.js`
  grafting remote chrome is load-bearing — leave it alone.

## The jank patterns (what "state/component jank" means here)

1. **Layout-suspension + timing-race choreography.** 30 `Ext.suspendLayouts()` sites
   (11 in `controller/People.js` alone) interleaved with 13 `Ext.defer` calls using
   magic delays (1/10/50/100/500ms), some with comments admitting they're guesses. An
   exception between suspend and resume leaves layouts wedged. Replace with: state
   through view configs (one suspend/resume inside the `updateX`), `requireLoaded`
   barriers instead of defer-until-loaded, and the standard route-handler preamble.
2. **Callback-boolean load barriers** (e.g. `controller/people/Contacts.js`
   `onPersonLoaded`: four booleans + `Ext.defer(…, 1)`). Replace with
   `Ext.StoreMgr.requireLoaded([...], cb)`.
3. **Cross-module component reach-through.** Views cache `me.down('#detailCt')`
   handles as instance properties; controllers then poke
   `manager.detailTabs.setActiveTab(tab)` from other modules, and sibling controllers
   inject tabs into a foreign view on `beforerender` — so tab order depends on
   controller registration order. Replace with configs + semantic events on the
   owning view.
4. **Bidirectional hand-syncing** (People search form ↔ query string: ~120 lines of
   tokenizing that re-derives state in both directions). Make one side authoritative
   (the URL), derive the other.
5. **Raw `SlateAdmin.API.request` + hand-built URLs** where a proxy/model static
   should exist; `store.load({ url: ... })` per-call URL overrides; reaching into
   `proxy.extraParams` with `delete`.
6. **Global store registry as integration bus** — ~40 view configs bind stores by
   string id, and templates/renderers call `Ext.getStore()` per cell
   (`view/courses/sections/Grid.js` is the worst). Views can't exist without boot
   order. When touching these views, pass data via configs/record fields.

## Duplication map (the biggest single win)

- **`progress/interims/*` ↔ `progress/terms/*`: ~1,900 near-duplicate lines across 16
  file pairs**, maintained in lockstep by hand (both sides touched the same days).
  Diff-per-pair is tiny (Report.js: 89/628 lines; most files 2–8 lines). Collapse into
  parameterized bases + two thin subclasses.
- `view/people/Manager.js` ↔ `view/courses/sections/Manager.js` (105/192 diff lines)
  and `people/details/AbstractDetails.js` ↔ `courses/sections/details/AbstractDetails.js`
  (identical modulo find-replace) — extract a shared manager/details base.
- Six settings controllers (`Groups`, `Terms`, `Courses`, `Departments`,
  `GlobalRecipients`, `Locations`, 125–161 lines each) share a ~56-line skeleton —
  extract a settings-manager base controller.
- ~370 lines of commented-out dead code in `controller/People.js` +
  `controller/Courses.js`; dead `Application.getModuleByRootPath()`; delete on contact.

## Campaign order (ranked by leverage)

Work in behavior-neutral refactor commits; verify each screen against a dev backend
(deep link, back button, refresh) before and after.

1. **Turn on ESLint** for `SlateAdmin/` (config exists at the slate repo root) and fix
   the genuine bugs it surfaces. Cheap, and it pins the baseline.
2. **Delete the duplicated infrastructure**: `overrides/tree/Records.js` (package copy),
   then migrate the ~24 `pushState` sites to `redirectTo` module-by-module and delete
   `PushHistory`/`EncodedHistory`. This is the prerequisite for trusting the URL flow.
3. **Unify on `Slate.API`** + package proxies; retire `SlateAdmin.API`(keep its
   `downloadFile` by porting it, and prefer the Blob-download pattern already used in
   `progress/interims/Print.js` over the iframe/cookie-poll hack).
4. **Collapse `progress/{interims,terms}`** into parameterized bases (~1,900 → ~700
   lines).
5. **Extract the Manager/AbstractDetails base** and the settings-controller base;
   convert the detail-tab reach-through to configs + events on the manager view
   (kills most of jank patterns 1–3 for those modules).
6. **Rework `controller/People.js`** (981 lines, the God controller) last, on top of
   the now-trusted URL flow: route handlers to the standard preamble, `selectPerson`'s
   77-line callback pyramid to `requireLoaded` + store events, search form sync to
   one-direction derivation.
7. Delete dead code as encountered: Login flow, `getModuleByRootPath`, commented
   blocks, the jslint pragma headers.

What **not** to do while in there: no MVVM conversion, no framework/toolkit changes, no
promise-library adoption (see the frozen-stack contract in SKILL.md), and no rewrites
of screens that work — this campaign converges style and removes hazards; it does not
redesign.

## Best internal references (imitate these when working in SlateAdmin)

| File | Why | Era |
| --- | --- | --- |
| `app/view/people/details/contacts/List.js` | Most modern file: function-body define, config handlers with `Ext.factory`, delegated DOM events, Session batch writes. (Remove its stray `console.info` when touching it.) | 2022 |
| `app/widget/field/contact/Relationship.js` | The composite-field reference; correct `update`-rewires-listeners discipline | 2022 |
| `app/controller/settings/Locations.js` + `app/view/settings/locations/Manager.js` | The controller/view pair to standardize on: named refs, `control` by ref name, action events, pure-config view. (Fix its `var` shadow when citing.) | 2019–2021 |
| `app/controller/people/Contacts.js` | Best complex-controller logic: statics lookup maps, server-side validation into grid cells, `{ dirty: false }` discipline. Its boolean-barrier `onPersonLoaded` is the anti-pattern to replace. | 2021 |
| `app/view/people/details/AbstractDetails.js` | The `config` + `updateX` + `@template` + `fireEvent` contract in its smallest form | 2017 |
| `app/store/courses/SectionCohorts.js` | What every SlateAdmin store should look like | 2017 |
| `app/widget/PrintPreview.js` | `renderTpl` + `renderSelectors` for wrapping foreign DOM, in 9 lines | 2019 |
