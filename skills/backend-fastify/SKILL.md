---
name: backend-fastify
description: Backend development using Fastify + TypeScript. Use when creating new backend APIs, adding routes, implementing services, working with plugins, or configuring environment variables.
---

# Backend Fastify Stack

High-performance Node.js backend stack:

- **Fastify 5.x** - Web framework
- **TypeScript** - Type safety
- **tsx** - Development with watch mode
- **pino-pretty** - Pretty logging for development
- **@fastify/env** - Environment variable validation with JSON Schema
- **@fastify/cors** - CORS support
- **fastify-plugin** - Plugin system

## Environment Setup

Use [asdf](https://asdf-vm.com/) to manage Node.js versions:

```bash
# Install Node.js plugin (one-time)
asdf plugin add nodejs

# Set project Node.js version
asdf set nodejs latest:22
```

This creates a `.tool-versions` file in the project root that ensures consistent Node.js versions across the team.

## Reference Files

| File | When to Use |
|------|-------------|
| [setup-guide.md](references/setup-guide.md) | Starting a new backend project from scratch |

## Quick Reference

### Commands

```bash
# Dev server with watch mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type check
npm run type-check
```

### Key Imports

```typescript
// Fastify types
import Fastify, { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

// Common plugins
import fastifyEnv from '@fastify/env'
import cors from '@fastify/cors'
```

### Plugin Pattern

```typescript
import fp from 'fastify-plugin'

export default fp(async (fastify, opts) => {
  // Plugin logic here
  fastify.decorate('something', value)
}, '5.x')
```

### Route Pattern

```typescript
import { FastifyPluginAsync } from 'fastify'

const routes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get('/', async (request, reply) => {
    return { data: 'example' }
  })
}

export default routes
```

### Service Pattern

```typescript
// 1. Create service class
export class MyService {
  constructor(private fastify: FastifyInstance) {}
  async doWork() { /* ... */ }
}

// 2. Declare module augmentation
declare module 'fastify' {
  interface FastifyInstance {
    myService: MyService
  }
}

// 3. Initialize and decorate in app.ts
fastify.decorate('myService', new MyService(fastify))
```

### Project Structure

```
backend/
├── src/
│   ├── plugins/          # Fastify plugins (env, auth, etc.)
│   ├── routes/           # HTTP route handlers
│   ├── services/         # Business logic classes
│   ├── app.ts            # Plugin registration & setup
│   └── index.ts          # Server entry point
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```
