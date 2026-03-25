# Troubleshooting Guide

Common issues encountered during development and how to fix them.

---

## TypeScript showing stale Prisma types

**Symptom:** TypeScript errors like `Property 'weekDaysLayout' does not exist on type 'PrismaClient'` even though the model exists in the schema and `prisma generate` has been run.

**Cause:** VS Code's TypeScript server has cached the old generated types and hasn't picked up the new ones.

**Fix:** Restart the TypeScript server in VS Code — no commands needed.

```
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## `prisma generate` fails with "Could not resolve @prisma/client"

**Symptom:** Running `npx prisma generate` from inside `app/server/` fails with a resolution error.

**Cause:** `@prisma/client` is installed locally in `app/server/node_modules/` but the generator can't find it, usually because `node_modules` was deleted or corrupted.

**Fix:**

```bash
cd app/server
npm install
npx prisma generate
```

If it still fails, check that `@prisma/client` is listed in `app/server/package.json` dependencies and that `app/server/node_modules/@prisma/client` exists.

---

## Test DB out of sync with migration history

**Symptom:** Repository tests fail with errors like `relation "table_name" does not exist` or `column does not exist`.

**Cause:** New migrations have been applied to the dev DB but not the test DB.

**Fix:**

```bash
npm run db:migrate_test
```

---

## Migration drift detected on `prisma migrate dev`

**Symptom:** Running `prisma migrate dev` shows "Drift detected: Your database schema is not in sync with your migration history" and asks to reset.

**Cause:** The DB schema doesn't match what the migration history expects — usually because a table was renamed or modified manually, or a previous migration was edited after being applied.

**Fix:** Do NOT reset if you want to preserve data. Instead, create the migration manually without running it:

```bash
npx prisma migrate dev --create-only --name <descriptive_name>
```

Then open the generated migration file, replace the auto-generated SQL with the correct SQL (e.g. `ALTER TABLE ... RENAME TO ...`), and apply it:

```bash
npx prisma migrate dev
```

For renames specifically, use this pattern instead of drop+recreate:

```sql
ALTER TABLE "old_name" RENAME TO "new_name";
ALTER TABLE "new_name" RENAME COLUMN "old_column" TO "new_column";
ALTER INDEX "old_index_name" RENAME TO "new_index_name";
ALTER TABLE "new_name" RENAME CONSTRAINT "old_fkey_name" TO "new_fkey_name";
```

---

## Test DB migration fails with "relation does not exist"

**Symptom:** `npm run db:migrate_test` fails mid-migration with a PostgreSQL error about a missing relation.

**Cause:** A previous migration in the history is referencing a table or column that no longer exists in the test DB (e.g. after a rename migration was written incorrectly).

**Fix:** Reset the test DB and rerun all migrations from scratch:

```bash
dotenv -e .env.test -- npx prisma migrate reset
npm run db:migrate_test
npm run db:seed_test
```

Note: this wipes all test data, which is fine since the test DB should only contain seeded/test data anyway.

---

## Foreign key constraint violation in repository tests

**Symptom:** Tests fail with `PrismaClientKnownRequestError: Foreign key constraint violated on the constraint: <table>_<field>_fkey`.

**Cause:** A record is being created with a foreign key ID that doesn't exist in the referenced table. Common in repository tests when `beforeAll` doesn't create all required prerequisite records.

**Fix:** Check `beforeAll` and make sure all parent records are created before the test tries to create child records. For example, if creating a `MealSlot`, you need a `WeekDaysLayout`, a `Schedule`, a `Workspace`, and a `MealType` all to exist first.

---

## `rm -rf node_modules/.prisma` causing cascading issues

**Symptom:** After deleting `.prisma`, `prisma generate` fails or imports break across the project.

**Cause:** The `rm -rf` command was run without `&&` between it and `npx prisma generate`, causing both to be treated as one argument and deleting unintended directories. Or the deletion removed files that were still needed.

**Fix:** Never delete `.prisma` manually. If the generated client seems stale, just run:

```bash
npx prisma generate
```

And restart the TS server. Only delete `.prisma` as a last resort, and always use `&&`:

```bash
rm -rf node_modules/.prisma && npx prisma generate
```

---

## `prisma migrate reset` prompts unexpectedly during `db:migrate:all`

**Symptom:** Running `npm run db:migrate:all` pauses and asks to reset the database, then fails with exit code 130 when you press Ctrl+C.

**Cause:** `prisma migrate dev` detected drift between the migration history and the actual DB schema and is asking for confirmation to reset.

**Fix:** Run the reset explicitly and intentionally:

```bash
npx prisma migrate reset
```

Then rerun `db:migrate:all`. If you don't want to lose data, see the "Migration drift detected" section above instead.

---

## prisma create new migration

**Run:** `npx prisma migrate dev --name <migration-name>`
This both creates the new migration and runs it against the db at once
