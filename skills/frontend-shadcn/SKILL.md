---
name: frontend-shadcn
description: Frontend development using Vite + React + shadcn/ui + Tailwind CSS + React Router v7. Use when creating new frontend projects, adding UI components, implementing routing, styling with Tailwind, or working with shadcn/ui component library.
---

# Frontend ShadCN Stack

This skill provides guidance for building frontend applications using the modern React stack:

- **Vite** - Fast build tooling
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Component library
- **React Router v7** - Client-side routing

## Project Setup

For initial project scaffolding and configuration, see [references/setup-guide.md](references/setup-guide.md).

## Adding Components

```bash
npx shadcn@latest add <component-name> -y
```

Common components: `button`, `card`, `sidebar`, `dialog`, `dropdown-menu`, `tabs`, `input`, `form`

## Key Patterns

### Path Aliases

Use `@/` prefix for imports from `src/`:

```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

### React Router v7

Import from `react-router` (not `react-router-dom`):

```typescript
import { Routes, Route, Link, useLocation } from 'react-router'
```
