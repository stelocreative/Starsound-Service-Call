# Starsound Service Board — Handoff

Internal kanban board for Starsound Audio service calls. Built Oct 14, 2026 against `starsound-service-board-handoff/SPEC.md`.

- Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS 4, Supabase (Postgres, Auth, Storage, Realtime), Vercel.
- Repo: `Service Call App/starsound-service-board` (its own git repo).
- Drag and drop: `@dnd-kit/core`. Live updates: Supabase Realtime, with 30-second polling as a fallback.

## Production status (Oct 14, 2026)

- **Live:** https://starsound-service-board.vercel.app (Vercel project `starsound-service-board`, production deployment `dpl_4GwVLs9VkmJrTr7ivBFijj2Fb8Lz`, which includes column management and aging tiers). The deployment was made by uploading this repo's files directly, so no Git integration is linked yet; see "Deploy → Vercel" for how to redeploy after changes.
- **Supabase:** project `starsound-service-board`, ref `twmdmcibdttazbizglex` (https://twmdmcibdttazbizglex.supabase.co, free tier). Both migrations in `supabase/migrations/` are applied, the private `attachments` bucket and the Realtime publication exist. Auth → URL configuration: Site URL `https://starsound-service-board.vercel.app`; redirect URLs `https://starsound-service-board.vercel.app/**` and `http://localhost:3000/**`.
- **Vercel environment variables:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (all environments), `NEXT_PUBLIC_SITE_URL` (production). The app never uses the service-role key.
- **QC:** the full checklist passed against production on Oct 14, 2026: magic-link sign-in, create ticket, drag between columns with owner auto-reset, inline edits, notes from two logins with live updates, PDF upload with a signed download link, settings tabs, archive after 14 days in Paid, mobile layout at 375 px, signed-out redirects, and RLS probes (anonymous and non-allowlisted users are refused by the database).
- **Data:** the sample tickets and the two temporary QC logins were deleted after QC. The database holds the four people, the ten columns with their default owners, the four categories, and the allowlist rows described below.
- **Allowlist:** the placeholder rows have been replaced with real staff addresses (Oct 14, 2026), managed in Settings → Users. `nick@starsound.com` has signed in; the others sign in with a magic link the first time they open the board.
- **Email delivery:** magic links go out through Supabase's built-in sender until custom SMTP is configured. That sender is rate-limited to a few emails per hour and, per Supabase's docs, only delivers to addresses that are members of the Supabase organization, so set up custom SMTP (step 4 under "Deploy → Supabase") before other staff try to sign in.

## Run locally

```bash
npm install
cp .env.example .env.local      # NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                     # http://localhost:3000
```

To run against a throwaway local Supabase (needs Docker Desktop):

```bash
npx supabase start              # applies supabase/migrations and seeds supabase/seed.sql
npx supabase status -o env      # API_URL / PUBLISHABLE_KEY for .env.local
```

Local magic-link emails are caught by Mailpit at http://127.0.0.1:54334.

Checks before shipping: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Deploy

### Supabase (one time)

1. Create a project (free tier is fine). Note the Project URL and the publishable key (Project Settings → API).
2. Apply every file in `supabase/migrations/` in order (SQL editor, Supabase MCP `apply_migration`, or `npx supabase db push` after `npx supabase link`). `20261014000000_init.sql` creates the schema, Row Level Security, the private `attachments` bucket, Realtime, and seeds people, categories, columns, and the four placeholder logins; `20261015000000_editable_columns.sql` adds column management (add, rename, reorder, delete) and the history snapshots that make deleting a column safe.
3. Authentication → URL Configuration: set **Site URL** to the production URL (for example `https://starsound-service-board.vercel.app`) and add `https://<production-url>/**` and `http://localhost:3000/**` to **Redirect URLs**. Without this, magic links redirect to localhost.
4. Authentication → Providers → Email: leave Email enabled (magic links). Configure custom SMTP (Authentication → SMTP Settings, for example Resend or Postmark) before rollout: Supabase's built-in sender is rate-limited to a few emails per hour and, per Supabase's docs, only delivers to email addresses that are members of the Supabase organization, so magic links to other staff addresses will not arrive without it.
5. Do not run `supabase/seed.sql` in production; it is sample data for QC.

### Vercel

1. Create a project from this repo (framework preset: Next.js) or deploy with the Vercel CLI.
2. Environment variables (Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = the Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the publishable (or legacy anon) key
   - `NEXT_PUBLIC_SITE_URL` = the production URL (optional, makes auth redirects explicit)
3. Deploy. No service-role key is needed anywhere; the app only ever uses the publishable key, and Postgres RLS enforces access.

## Logins and people (two different things)

- **People** (Settings → People) are who can be assigned work or own a stage: John, Ryan, Nick, Connor to start. Add a person with a name and initials; deactivate instead of deleting so history stays intact. Inactive people disappear from the assign and owner menus but still display on tickets they are on.
- **Users** (Settings → Users) are logins. Anyone on the list can request a magic link and gets full access; nobody else can sign in (checked on the login page, enforced by a database trigger on sign-up, and enforced again by RLS on every query). Link a login to a person so notes and history show that person's name and initials.

### Replace the placeholder logins

The allowlist ships with four placeholders: `[nick email]`, `[john email]`, `[ryan email]`, `[connor email]`. Nobody can sign in until at least one real address is on the list, and the list is edited inside the app, so bootstrap it once from the Supabase dashboard:

Table Editor → `allowed_users` → edit each `email` cell with the real address (keep the linked `person_id`), or run in the SQL editor:

```sql
update public.allowed_users set email = 'nick@example.com'   where email = '[nick email]';
update public.allowed_users set email = 'john@example.com'   where email = '[john email]';
update public.allowed_users set email = 'ryan@example.com'   where email = '[ryan email]';
update public.allowed_users set email = 'connor@example.com' where email = '[connor email]';
```

After that, manage users in Settings → Users.

### Add a user later

Settings → Users → enter the email, an optional display name, and the linked person → Add user. They sign in at `/login` with their email and click the link. Magic links must be opened in the same browser they were requested from (PKCE); the login page says so.

To remove access, remove the email from the list. The person stays in Settings → People.

## How the board works

- Columns start as New, Quote Sent, Quote Signed, Scheduled, In Progress, Parts Needed, Parts Ordered, To Bill, Invoiced, Paid. Settings → Columns renames, describes, reorders, adds and deletes them. New tickets always land in the first column, and Paid is the archive column, so those two cannot be deleted; a column with tickets in it must be emptied first. Deleting a column keeps its name in ticket history. Cards move in either direction by drag and drop, or with the Status dropdown in the ticket panel (the way to do it on a phone).
- **Owner auto-assignment:** every column has a default owner (Settings → Columns). Whenever a card enters a column, its owner becomes that column's default owner, even if someone set the owner by hand before the move. A manual owner change sticks only until the next move. Paid has no default owner, so paid cards end up with no owner. Starting defaults: New, Quote Sent, Parts Needed, Parts Ordered, To Bill → John; Quote Signed, Scheduled, In Progress → Ryan; Invoiced → Connor.
- Every move is logged (from, to, who, when) and shown under History in the ticket panel, along with the creation entry.
- Cards show only the ticket number, title, client, category color, tech initials (solid circle), owner initials (outlined circle), days in the column, and an UPGRADE badge when the replacement/upgrade box is checked.
- **Aging:** the days badge changes color as a card sits in one column: amber from 7 days, orange from 14, red from 30, solid red from 60. The Aging filter on the board (All ages / 7+ / 14+ / 30+ / 60+) lists only the cards past a threshold; paid cards never count as aging. Thresholds and colors live in `lib/format.ts` (`AGING_TIERS`).
- Paid cards stay on the board for 14 days after entering Paid, then drop off. The Archive page lists every paid ticket forever, searchable by client, title, or ticket number. Moving an archived ticket to another status puts it back on the board.
- Ticket numbers are `SC-1001`, `SC-1002`, … and never reused.
- Notes are append-only. Attachments go to the private `attachments` bucket, tagged Quote, Invoice, or Other, with download links that expire after an hour (regenerated every time the panel opens). Max file size 25 MB.
- Categories (Settings → Categories) have a name and a palette color; the color is a left stripe and chip on the card, never a full background.

## Operations notes

- Secrets: only `NEXT_PUBLIC_*` values exist in the app. The service-role key is never used.
- Backups: Supabase free tier has no automatic backups; export the database periodically from the dashboard if the history matters.
- Realtime: if the green dot in the header is grey, live updates are reconnecting; the board still refreshes every 30 seconds and whenever the tab regains focus.
- Future bolt-ons (email-to-ticket, notifications, accounting links) can land as new tables or columns; nothing in the schema depends on the UI.
