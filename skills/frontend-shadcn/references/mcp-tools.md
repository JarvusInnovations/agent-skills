# MCP Tools for Frontend Development

Two MCP servers enhance frontend development workflows: **shadcn** for UI components and **context7** for library documentation.

## Research Workflow

Before implementing new features or installing unfamiliar libraries:

1. **Research** with context7 MCP - Get up-to-date documentation
2. **Understand** with shadcn MCP - Find component examples
3. **Install** with npm/npx - Add the dependency
4. **Implement** - Build the feature

## shadcn MCP Server

Use for discovering, understanding, and installing shadcn/ui components.

### Search for Components

```
search_items_in_registries(registries: ["@shadcn"], query: "sidebar")
```

Common searches: `sidebar`, `card`, `dialog`, `dropdown`, `table`, `form`, `button`

### Get Component Examples

```
get_item_examples_from_registries(query: "button-demo")
```

Pattern: Use `{component}-demo` to find usage examples.

### Get Install Command

```
get_add_command_for_items(items: ["@shadcn/sidebar"])
```

Returns the exact `npx shadcn@latest add ...` command.

### Workflow Example

```
1. search_items_in_registries(registries: ["@shadcn"], query: "data table")
2. get_item_examples_from_registries(query: "data-table-demo")
3. get_add_command_for_items(items: ["@shadcn/table"])
4. Run: npx shadcn@latest add table -y
```

### After Adding Components

Use `get_audit_checklist` to verify the component was added correctly and understand any additional setup needed.

## context7 MCP Server

Use for accessing up-to-date documentation for React, TypeScript, and other libraries.

### Resolve Library ID

First, get the context7 library ID:

```
resolve-library-id(libraryName: "react-router")
```

Returns: `/remix-run/react-router`

### Get Library Docs

Then fetch specific documentation:

```
get-library-docs(
  context7CompatibleLibraryID: "/remix-run/react-router",
  topic: "useSearchParams"
)
```

### Mode Options

- `mode: "code"` - API references and code examples (default)
- `mode: "info"` - Conceptual guides and architectural docs

### Common Libraries

| Library | context7 ID | Common Topics |
|---------|-------------|---------------|
| React Router v7 | `/remix-run/react-router` | BrowserRouter, useLocation, useSearchParams |
| React | `/facebook/react` | hooks, context, suspense |
| Tailwind CSS | `/tailwindlabs/tailwindcss` | utilities, configuration |
| MapLibre GL | `/maplibre/maplibre-gl-js` | Map, markers, layers |

### Workflow Example

```
1. resolve-library-id(libraryName: "react-router")
   → Returns: /remix-run/react-router

2. get-library-docs(
     context7CompatibleLibraryID: "/remix-run/react-router",
     topic: "nested routes"
   )
   → Returns: Documentation on nested routing patterns
```

## When to Use Each

| Scenario | Tool |
|----------|------|
| Adding a new UI component | shadcn MCP |
| Understanding component API | shadcn MCP (examples) |
| Learning React Router patterns | context7 MCP |
| Checking latest library syntax | context7 MCP |
| Finding component install command | shadcn MCP |
| Debugging library behavior | context7 MCP (mode: "info") |
