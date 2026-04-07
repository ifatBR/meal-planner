# Meal Planner

A multi-tenant backend for generating varied weekly meal plans for 
community kitchens, retreat centers, and shared living spaces.

Built with Claude Code as the primary development tool.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Fastify
- **ORM:** Prisma 7
- **Database:** PostgreSQL
- **Validation:** Zod
- **Testing:** Vitest
- **Monorepo:** npm workspaces (`server/`, `packages/types/`)

## Architecture

Multi-tenant — every resource is scoped to a `workspaceId` from JWT.  
Module-based folder structure.
One Zod schema per endpoint.

## Completed Modules

- **Auth** — Argon2 passwords, SHA-256 refresh tokens, 
  dual httpOnly cookie + body delivery
- **Ingredients** — Global ingredient library with variant 
  support (name + family), ~280-item seed per workspace
- **Recipes** — With dish types, ingredient linking, 
  and display name resolution at write time
- **Layouts** — Reusable workspace-level weekly layout 
  entities with meal slots and dish allocations
- **Schedules** — Deterministic best-effort generation 
  with manual override tracking
- **Schedule Meals** — Individual meal management 
  within a generated schedule

## Status

Backend complete. Frontend in development (Vite + React + TypeScript).

## Local Setup
```bash
npm install
# Set DATABASE_URL in .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```
