# CLAUDE.md — Monorepo Root

## Structure
This is a monorepo with separate frontend and backend apps, and a shared types package.

```
/
├── app/
│   ├── server/   # Node.js backend (Fastify, Prisma, PostgreSQL)
│   └── client/   # Frontend (TBD)
├── packages/
│   └── types/    # Shared Zod schemas and TypeScript types (@app/types)
├── CLAUDE.md     # This file
```

## Rules
- Backend code lives exclusively under `app/server/`
- Frontend code lives exclusively under `app/client/`
- Shared Zod schemas and TypeScript types live in `packages/types/` (imported as `@app/types`)
- Do not define Zod schemas inside `app/server/` or `app/client/` — always use `@app/types`
- Each app has its own `package.json`, `tsconfig.json`, and `CLAUDE.md`
