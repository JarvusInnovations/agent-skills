---
name: frontend-react
description: Frontend development using Bun + Vite + React + Tailwind CSS + React Router v7. Use when creating new frontend projects, adding UI components, implementing routing, styling with Tailwind, or working with the React frontend stack. shadcn/ui is an optional component-library layer (see references/shadcn.md).
---

# Frontend React Stack (Bun)

Modern React frontend stack, run on **Bun**:

- **Bun** - Runtime, package manager, and script runner (no Node.js or npm)
- **Vite** - Build tooling and dev server
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling (`@tailwindcss/vite` plugin)
- **React Router v7** - Client-side routing (package `react-router`, not `react-router-dom`)
- **`cn()` helper** - `clsx` + `tailwind-merge` for conditional classes

**Component library is a choice, not a default.** This skill is the React base stack.
**shadcn/ui** is a popular, optional layer on top — when a project wants it, follow
[shadcn.md](references/shadcn.md). Without it, hand-build components against Tailwind and
the `cn()` helper.

## Environment Setup

Use [asdf](https://asdf-vm.com/) to manage Bun:

```bash
# Install the Bun plugin (one-time)
asdf plugin add bun

# Pin Bun for the project (writes .tool-versions)
asdf set bun latest
asdf install
```

## Reference Files

| File | When to Use |
|------|-------------|
| [setup-guide.md](references/setup-guide.md) | Starting a new project from scratch (base stack) |
| [patterns.md](references/patterns.md) | Routing, state, layout, and component patterns |
| [shadcn.md](references/shadcn.md) | **Optional** — adding the shadcn/ui component library |
| [maplibre.md](references/maplibre.md) | Working with MapLibre GL JS maps |
| [mcp-tools.md](references/mcp-tools.md) | Looking up docs (context7) and shadcn components via MCP |

## Quick Reference

### Commands

```bash
# Dev server
bun run dev          # → vite

# Production build
bun run build        # → tsc -b && vite build

# Type check
bun run check        # → tsc --noEmit
```

### Package Management

Use **Bun** for all dependency management — never edit `package.json` by hand:

```bash
bun add react-router clsx tailwind-merge      # runtime deps
bun add -d @types/node                        # dev deps
```

`bun add` resolves the latest compatible version and keeps `bun.lock` in sync. Commit
`bun.lock`.

### Key Imports

```typescript
// React Router v7 - use 'react-router' NOT 'react-router-dom'
import { Routes, Route, Link, useLocation, useSearchParams } from 'react-router'

// Path alias - @/ maps to src/
import { cn } from '@/lib/utils'
```

### The cn() helper

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Conditional Classes

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === "primary" && "variant-classes"
)} />
```

### Project Structure

```
src/
├── components/       # Shared UI components (add components/ui/ if using shadcn)
│   ├── AppShell.tsx  # Main layout with header
│   └── AppSidebar.tsx
├── pages/            # Route page components
├── hooks/            # Custom hooks
├── lib/
│   └── utils.ts      # cn() helper
├── App.tsx           # Route definitions
├── main.tsx          # Entry point with BrowserRouter
└── index.css         # Tailwind import (+ theme variables)
```

### Tailwind Patterns

```typescript
// Common utility patterns
"flex items-center gap-4"           // Flexbox with gap
"bg-muted text-muted-foreground"    // Muted backgrounds
"border-b bg-background"            // Borders and backgrounds
"h-screen overflow-auto"            // Full height scrolling
"space-y-4"                         // Vertical spacing
```

### Common Gotchas

- **Package management**: Use `bun add <pkg>` not manual `package.json` edits
- **React Router imports**: Use `react-router` NOT `react-router-dom`
- **shadcn is optional**: Only reach for `components/ui/` + `bunx shadcn@latest` when the
  project has opted into shadcn/ui (see [shadcn.md](references/shadcn.md)); otherwise build
  components by hand with Tailwind + `cn()`
