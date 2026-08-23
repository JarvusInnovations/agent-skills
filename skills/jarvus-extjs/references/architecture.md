# App & controller architecture

The house architecture for Jarvus/Slate ExtJS 6.2 classic apps: how an app boots, how
controllers are shaped, and how state flows. The reference implementations are the Slate
CBL apps (`SlateFoundation/slate-cbl`, `sencha-workspace/`), which standardized these
patterns through 2022–2023.

## App anatomy

Every app has the same skeleton:

```
app.js                # Cmd-generated shim; never edited
app.json              # requires: [font-awesome, jarvus-hotfixes, jarvus-routing, <product-pkg>]
index.html            # static host-page chrome + mount point
app/Application.js    # controller list + one-shot bootstrap API call
app/controller/*.js   # 1–4 controllers (SlateAdmin, the outlier, has 24+)
app/store/*.js        # thin subclasses of package stores (include/extraParams/pageSize only)
app/view/*.js + .scss # top-level state-owning view + app-specific composites; SCSS sits NEXT TO the JS
```

The app declares exactly **one product package** in `app.json` (e.g. `slate-cbl`); that
package's own `requires` fans out to everything else (`emergence-apikit`,
`slate-core-data`, `slate-ui-classic`, `jarvus-ext-*`, …). Don't add transitive
dependencies to `app.json`.

`Application.js` holds the flat controller list and, when the screen needs bootstrap
data, one raw API call in `launch` that fires an app event rather than loading a store:

```js
launch: function() {
    var me = this;
    Slate.API.request({
        method: 'GET',
        url: '/cbl/dashboards/student-competencies/admin/bootstrap',
        success: function(response) { me.fireEvent('bootstrapdataload', me, response.data); }
    });
}
```

The viewport is a real `Ext.container.Viewport` (layout `fit`, one item), never
`someView.render('some-dom-id')` — the 2022 rework commit that fixed this
("replicate SlateAdmin pattern for full-screen app with omnibar") also deleted the CSS
height hacks the render-to-div approach required. Host-page chrome (the Slate omnibar)
is reconciled purely in SCSS (`z-index` on the omnibar, `margin-top` on the app root).

## Controller shape

All controllers extend `Ext.app.Controller`. **Not** `Ext.app.ViewController` — see the
frozen-stack contract in SKILL.md. The canonical file layout, standardized by the 2022
cleanup commits:

```js
/**
 * The Tasks controller manages the Task Library section where users can
 * browse, create, and edit tasks.
 *
 * ## Responsibilities
 * - Manage loading the search grid
 * - Respond to create/edit/delete button clicks in the app header
 */
Ext.define('SlateTasksManager.controller.Tasks', {
    extend: 'Ext.app.Controller',
    requires: [ 'Slate.API', 'Ext.window.Toast' ],

    // dependencies
    views:  [ 'TasksManager', 'TaskForm@Slate.cbl.view.tasks', 'Window@Slate.ui' ],
    stores: [ 'Tasks', 'ParentTasks' ],
    models: [ 'Task@Slate.cbl.model.tasks' ],

    // component references
    refs: { /* ... */ },

    // entry points
    routes: { /* ... */ },
    listen: { /* ... */ },
    control: { /* ... */ },

    // controller template method overrides
    onLaunch: function() { /* ... */ },

    // route handlers
    // event handlers
    // custom controller methods
});
```

Rules that make this shape work:

- **`@namespace` suffixes** pull package classes into `views`/`stores`/`models` without
  full class paths: `'TaskForm@Slate.cbl.view.tasks'`.
- **Section banner comments** in that fixed order. A reader should be able to find the
  routes of any controller in the same place in every file.
- **`requires` lists all and only** the classes created inside the file (windows,
  toasts, API singletons).

### Refs: three forms, each with a purpose

```js
refs: {
    // (a) plain selector — ALWAYS fully qualified from the top-level view down,
    // so the ref stays unambiguous as the app grows
    saveBtn: 'slate-tasks-manager slate-appheader button[action=save]',

    // (b) THE autoCreate root — exactly one per app; onLaunch calls me.getViewport()
    // and the viewport self-renders. No Ext.create anywhere.
    viewport: {
        selector: 'viewport',
        autoCreate: true,
        xclass: 'SlateTasksManager.view.Viewport'
    },

    // (c) autoCreate dialog factory — the whole window config lives in the ref,
    // so one-off dialogs need no view file. closeAction: 'hide' + modal is standard.
    taskWindow: {
        autoCreate: true,
        xtype: 'slate-window',
        closeAction: 'hide',
        modal: true,
        layout: 'fit',
        minWidth: 300, width: 600,
        mainView: { xtype: 'slate-cbl-tasks-taskform' }
    },

    // reach a ref-created dialog's chrome from its content xtype with the ascend
    // combinator — stable even though the window has no view file
    formPanel: 'slate-cbl-tasks-taskform',
    dialogSaveBtn: 'slate-cbl-tasks-taskform ^ window button[action=save]'
},
```

`autoCreate` is restricted to the root and genuine dialog factories. If a component is
declared in a view's `items`, its ref is a plain selector (the 2022 cleanup demoted
exactly these).

### control vs listen

`control:` is for view events, **keyed by ref name** so each selector is written once:

```js
control: {
    dashboardCt: {
        selectedsectionchange: 'onSelectedSectionChange'
    },
    sectionSelector: { select: 'onSectionSelectorSelect' },
    deleteTaskButton: { click: 'onDeleteTaskClick' }
},
```

`listen:` is for cross-cutting subscriptions — stores by `#StoreId`, other controllers,
app events:

```js
listen: {
    controller: {
        '#': { unmatchedroute: 'onUnmatchedRoute' }
    },
    store: {
        '#StudentCompetencies': {
            beforeload: 'onStudentCompetenciesBeforeLoad',
            load: 'onStudentCompetenciesLoad',
            datachanged: { buffer: 10, fn: 'onStudentCompetenciesDataChanged' }
        }
    }
},
```

Buttons are always addressed `button[action=verb]`, actioncolumn events by their
`<action>click` name, menu checkitems by `menucheckitem[name=...]` — never by itemId
position or index. Views never contain handler functions.

## State flows one direction, through the URL

This is the load-bearing discipline of the whole architecture.

**1. The top-level view owns app state as configs** and documents its events:

```js
/**
 * As the top-level view, this component also serves as the authoritative store
 * for the application's top-level user-driven state ... firing change events to
 * propagate state transitions out to all controllers in the application.
 */
Ext.define('SlateTasksTeacher.view.Dashboard', {
    extend: 'Slate.ui.app.Container',
    xtype: 'slate-tasks-teacher-dashboard',

    config: {
        selectedSection: null,   // user intent from the URL — may be invalid
        loadedSection: null,     // the resolved record
        studentsGrid: false,     // boolean => visibility (see components.md)
        gridToolbar: false
    },

    updateSelectedSection: function(section, oldSection) {
        var me = this,
            sectionSet = Boolean(section);

        Ext.suspendLayouts();
        me.setPlaceholderItem(!sectionSet);
        me.setStudentsGrid(sectionSet);
        me.setGridToolbar(sectionSet);
        Ext.resumeLayouts(true);

        me.fireEvent('selectedsectionchange', me, section, oldSection);
    }
});
```

The `selectedX` / `loadedX` split matters: `selected` is what the URL asked for (a code
string, possibly stale or wrong); `loaded` is the model instance once resolved. Both are
configs; both fire change events.

**2. Routes write state; nothing else does:**

```js
routes: {
    ':sectionCode/:cohortName': {
        action: 'showDashboard',
        conditions: { ':sectionCode': '([^/]+)', ':cohortName': '([^/]+)' }
    }
},

showDashboard: function(sectionCode, cohortName) {
    var dashboardCt = this.getDashboardCt();

    // false (not null) means "selected nothing", distinct from "no selection yet"
    dashboardCt.setSelectedSection(sectionCode || false);
    dashboardCt.setSelectedCohort(
        cohortName && cohortName != 'all' ? this.decodeRouteComponent(cohortName) : false
    );
},
```

`conditions: { ':param': '([^/]+)' }` is required whenever a segment can contain
non-word characters (usernames, codes). Optional trailing segments are faked with
sibling routes (`'people/lookup/:person'` and `'people/lookup/:person/:tab'`).

**3. UI selections redirect; they never set state:**

```js
onSectionSelectorSelect: function(sectionSelector, section) {
    this.redirectTo([ section.get('Code'), 'all' ]);
},
```

`redirectTo` comes from `jarvus-routing` and accepts arrays (each component
route-encoded) and models (via the model's `toUrl()`). The round trip —
selector → `redirectTo` → route handler → view config → `updateX` → event →
controllers — is the only path. This is what makes deep links, refresh, and the back
button work for free, and it's the first thing to restore when cleaning up an older
screen (SlateAdmin's hand-rolled `pushState` choreography is the counterexample; see
slateadmin-audit.md).

**4. Controllers react to the semantic event** and push state outward:

```js
onSelectedSectionChange: function(dashboardCt, sectionCode) {
    var me = this,
        cohortsStore = me.getCohortsStore();

    me.getSectionSelector().setValue(sectionCode);          // sync the selector
    dashboardCt.setLoadedSection(me.getSectionsStore().getByCode(sectionCode));

    cohortsStore.setSection(sectionCode);                   // setter marks dirty
    cohortsStore.loadIfDirty();                             // loads only if it moved
},
```

### Multiple controllers per app

Controllers subscribe to the same view events independently — that's how apps grow
without controllers touching each other. In SlateTasksTeacher, `controller/Dashboard.js`
owns navigation and section state; `controller/StudentTasks.js` and
`controller/GoogleDrive.js` each `control: { dashboardCt: { selectedsectionchange: ... } }`
and manage their own stores. When a controller grows past one responsibility, split it
along event-subscription lines, not by moving methods.

Async interception (auth gates, unsaved-changes prompts) uses `jarvus-routing`'s
cancellable events: return `false` from `beforeroute`/`beforerewrite`/`beforeredirect`
and call the passed `resume` function later. Don't invent suspend flags.

## SlateAdmin-specific integration points

SlateAdmin is a multi-module shell with two extension protocols the CBL admin package
demonstrates (see also packages.md → slate-cbl-admin):

- **Nav panels by duck typing:** the Viewport controller iterates all controllers and
  calls `buildNavPanel()` on any that define it, collecting collapsed panels into the
  west nav. A module adds itself to navigation by implementing that method.
- **Card loading:** route handlers converge on the shared preamble —
  `Ext.suspendLayouts()` → `Ext.util.History.suspendState()` → activate/expand the nav
  panel → `Ext.util.History.resumeState(false)` →
  `me.application.getController('Viewport').loadCard(me.getManagerPanel())` →
  `Ext.resumeLayouts(true)`. Keep to that exact shape; the audit lists the sites that
  drifted from it.

## Canonical exemplars (ranked)

| File (repo-relative) | Demonstrates | Era |
| --- | --- | --- |
| slate-cbl: `sencha-workspace/SlateTasksTeacher/app/controller/Dashboard.js` | The definitive controller: route→config→event→store flow, redirectTo-only navigation, fully-qualified refs — plus a self-audit TODO checklist that reads as the team's style guide | 2018 |
| slate-cbl: `sencha-workspace/SlateTasksTeacher/app/view/Dashboard.js` | Top-level view as authoritative state store; documented `@event` blocks; `selectedX` vs `loadedX` | 2020 |
| slate-cbl: `sencha-workspace/SlateTasksManager/app/controller/Tasks.js` | The 2022-modernized layout: banner sections, named refs in `control`, autoCreate dialog factory, `^ window` selectors. (Architecture exemplar only — its archive/unarchive handlers are a known copy-paste pair; don't imitate those.) | 2022 |
| slate-cbl: `sencha-workspace/SlateStudentCompetenciesAdmin/` | Smallest complete app (7 files) — read end-to-end in one sitting to absorb the whole architecture | 2021 |
| slate: `sencha-workspace/SlateAdmin/app/controller/settings/Locations.js` + `app/view/settings/locations/Manager.js` | SlateAdmin's cleanest controller↔view pair; the settings-manager skeleton and the card-loading preamble | 2019–2021 |
