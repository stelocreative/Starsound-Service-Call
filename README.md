# Starsound Service Board

Kanban-style service call board for Starsound Audio. Internal use only.
Next.js 16 (App Router, TypeScript), Tailwind CSS 4, Supabase (Postgres, Auth, Storage, Realtime), deployed on Vercel.

See `HANDOFF.md` for operations: deploying, adding users and people, and the owner auto-assignment rule.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev                  # http://localhost:3000
```

### Against a local Supabase stack (optional)

Requires Docker Desktop.

```bash
npx supabase start           # applies supabase/migrations and supabase/seed.sql
npx supabase status -o env   # copy API_URL and ANON_KEY into .env.local
```

Local magic-link emails land in Mailpit at http://127.0.0.1:54334 (ports are set in `supabase/config.toml`).

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Layout

- `app/` routes: board (`/`), `/archive`, `/settings`, `/login`, auth callbacks under `/auth/*`
- `components/board` board, columns, cards, filters (drag and drop with dnd-kit)
- `components/ticket` detail panel, inline editing, notes, attachments, history, new-ticket modal
- `components/settings` people, columns (rename, reorder, add, delete, default owners), categories, login allowlist
- `lib/` Supabase clients, queries, types, formatting, category palette
- `supabase/migrations` schema, RLS, triggers, storage bucket, realtime, reference data
- `supabase/seed.sql` sample tickets for QC (not used in production)
- `proxy.ts` session refresh and sign-in gate
