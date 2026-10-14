-- ============================================================
-- Starsound Service Board — initial schema
-- Postgres 15+, Supabase (Auth, Storage, Realtime)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Reference tables
-- ------------------------------------------------------------

create table public.people (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  initials    text not null check (length(trim(initials)) between 1 and 3),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) > 0),
  -- palette key; the app maps it to stripe + chip colors with checked contrast
  color       text not null default 'blue'
              check (color in ('blue','yellow','green','red','orange','purple','teal','pink','gray')),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.board_columns (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique,
  name              text not null,
  position          integer not null unique,
  default_owner_id  uuid references public.people(id) on delete set null,
  description       text,
  created_at        timestamptz not null default now()
);

-- First column on the board (New); used as the default for new tickets.
create or replace function public.default_column_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.board_columns order by position asc limit 1;
$$;

-- Login allowlist. Users are logins; people are who gets assigned work.
create table public.allowed_users (
  email         text primary key,
  display_name  text,
  person_id     uuid references public.people(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- One row per auth user, created by trigger on first login.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text not null,
  person_id     uuid references public.people(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tickets
-- ------------------------------------------------------------

create sequence public.ticket_number_seq start with 1001;

create table public.tickets (
  id                 uuid primary key default gen_random_uuid(),
  number             integer not null unique default nextval('public.ticket_number_seq'),
  code               text generated always as ('SC-' || number::text) stored not null,
  title              text not null check (length(trim(title)) > 0),
  client             text not null check (length(trim(client)) > 0),
  contact_name       text,
  contact_phone      text,
  contact_email      text,
  site_address       text,
  category_id        uuid references public.categories(id) on delete set null,
  description        text,
  date_received      date not null default current_date,
  first_site_visit   date,
  scheduled_date     date,
  assigned_to_id     uuid references public.people(id) on delete set null,
  owner_id           uuid references public.people(id) on delete set null,
  is_upgrade         boolean not null default false,
  column_id          uuid not null default public.default_column_id() references public.board_columns(id),
  column_entered_at  timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index tickets_column_idx on public.tickets (column_id, column_entered_at);
create index tickets_client_idx on public.tickets (lower(client));
create index tickets_assigned_idx on public.tickets (assigned_to_id);
create index tickets_owner_idx on public.tickets (owner_id);

create table public.ticket_moves (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.tickets(id) on delete cascade,
  from_column_id  uuid references public.board_columns(id),
  to_column_id    uuid not null references public.board_columns(id),
  moved_by        uuid references auth.users(id) on delete set null,
  moved_by_name   text not null default 'System',
  moved_at        timestamptz not null default now()
);
create index ticket_moves_ticket_idx on public.ticket_moves (ticket_id, moved_at desc);

create table public.ticket_notes (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets(id) on delete cascade,
  author_id    uuid references auth.users(id) on delete set null,
  author_name  text not null,
  body         text not null check (length(trim(body)) > 0),
  created_at   timestamptz not null default now()
);
create index ticket_notes_ticket_idx on public.ticket_notes (ticket_id, created_at desc);

create table public.ticket_attachments (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid not null references public.tickets(id) on delete cascade,
  kind              text not null default 'other' check (kind in ('quote','invoice','other')),
  file_name         text not null,
  storage_path      text not null unique,
  mime_type         text,
  size_bytes        bigint,
  uploaded_by       uuid references auth.users(id) on delete set null,
  uploaded_by_name  text not null,
  created_at        timestamptz not null default now()
);
create index ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id, created_at desc);

-- ------------------------------------------------------------
-- Helper functions
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.normalize_allowed_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  if new.email = '' then
    raise exception 'Email is required';
  end if;
  return new;
end $$;

create trigger allowed_users_normalize before insert or update on public.allowed_users
  for each row execute function public.normalize_allowed_email();

-- Is the signed-in user on the allowlist? Used by every RLS policy.
create or replace function public.is_allowed()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_users a
    where a.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

-- Pre-check used by the login page before sending a magic link.
create or replace function public.is_email_allowed(p_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_users a where a.email = lower(trim(coalesce(p_email, '')))
  );
$$;

-- Display name for the signed-in user: linked person's name, else profile name, else email prefix.
create or replace function public.current_display_name()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select coalesce(pe.name, p.display_name)
       from public.profiles p
       left join public.people pe on pe.id = p.person_id
      where p.id = auth.uid()),
    nullif(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), ''),
    'Unknown'
  );
$$;

revoke all on function public.is_allowed() from public;
revoke all on function public.is_email_allowed(text) from public;
revoke all on function public.current_display_name() from public;
grant execute on function public.is_allowed() to anon, authenticated;
grant execute on function public.is_email_allowed(text) to anon, authenticated;
grant execute on function public.current_display_name() to authenticated;

-- ------------------------------------------------------------
-- Auth triggers: allowlist enforcement + profile bootstrap
-- ------------------------------------------------------------

create or replace function public.enforce_allowlist_on_signup()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.email is null
     or not exists (select 1 from public.allowed_users a where a.email = lower(trim(new.email))) then
    raise exception 'This email is not on the Service Board allowlist.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger enforce_allowlist_before_user_insert
  before insert on auth.users
  for each row execute function public.enforce_allowlist_on_signup();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  a public.allowed_users%rowtype;
begin
  select * into a from public.allowed_users where email = lower(trim(new.email));
  insert into public.profiles (id, email, display_name, person_id)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(a.display_name), ''), split_part(new.email, '@', 1)),
    a.person_id
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles in sync when an allowlist row is edited.
create or replace function public.sync_profile_from_allowlist()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles p
     set display_name = coalesce(nullif(trim(new.display_name), ''), split_part(p.email, '@', 1)),
         person_id = new.person_id
   where p.email = new.email;
  return new;
end $$;

create trigger allowed_users_sync_profile
  after update on public.allowed_users
  for each row execute function public.sync_profile_from_allowlist();

-- ------------------------------------------------------------
-- Ticket triggers: defaults + creation history
-- ------------------------------------------------------------

create or replace function public.tickets_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  col public.board_columns%rowtype;
begin
  if new.column_id is null then
    select * into col from public.board_columns order by position asc limit 1;
    new.column_id := col.id;
  else
    select * into col from public.board_columns where id = new.column_id;
  end if;
  if new.owner_id is null then
    new.owner_id := col.default_owner_id;
  end if;
  if new.category_id is null then
    select id into new.category_id from public.categories where active order by sort_order asc, name asc limit 1;
  end if;
  new.column_entered_at := coalesce(new.column_entered_at, now());
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;

create trigger tickets_before_insert before insert on public.tickets
  for each row execute function public.tickets_before_insert();

create or replace function public.tickets_after_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.ticket_moves (ticket_id, from_column_id, to_column_id, moved_by, moved_by_name, moved_at)
  values (new.id, null, new.column_id, auth.uid(), public.current_display_name(), new.created_at);
  return new;
end $$;

create trigger tickets_after_insert after insert on public.tickets
  for each row execute function public.tickets_after_insert();

-- Move a ticket to a column: owner resets to the column default, move is logged.
create or replace function public.move_ticket(p_ticket_id uuid, p_column_id uuid)
returns public.tickets
language plpgsql security invoker set search_path = public
as $$
declare
  t    public.tickets;
  col  public.board_columns;
  v_from uuid;
begin
  select * into t from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;
  select * into col from public.board_columns where id = p_column_id;
  if not found then
    raise exception 'Column not found';
  end if;
  if t.column_id = col.id then
    return t;
  end if;
  v_from := t.column_id;
  update public.tickets
     set column_id = col.id,
         owner_id = col.default_owner_id,
         column_entered_at = now()
   where id = p_ticket_id
  returning * into t;
  insert into public.ticket_moves (ticket_id, from_column_id, to_column_id, moved_by, moved_by_name)
  values (t.id, v_from, col.id, auth.uid(), public.current_display_name());
  return t;
end $$;

revoke all on function public.move_ticket(uuid, uuid) from public;
grant execute on function public.move_ticket(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- Table privileges. RLS decides row access; these grants let the API roles reach the tables at all.
-- anon gets nothing beyond the is_email_allowed() check used by the login page.
-- ------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.people, public.categories, public.board_columns, public.allowed_users,
  public.profiles, public.tickets, public.ticket_attachments
  to authenticated;
grant select, insert on public.ticket_moves, public.ticket_notes to authenticated;
grant usage, select on sequence public.ticket_number_seq to authenticated;

-- ------------------------------------------------------------
-- Row Level Security: allowlisted, signed-in users only
-- ------------------------------------------------------------

alter table public.people            enable row level security;
alter table public.categories        enable row level security;
alter table public.board_columns     enable row level security;
alter table public.allowed_users     enable row level security;
alter table public.profiles          enable row level security;
alter table public.tickets           enable row level security;
alter table public.ticket_moves      enable row level security;
alter table public.ticket_notes      enable row level security;
alter table public.ticket_attachments enable row level security;

create policy "allowed: people"        on public.people        for all to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));
create policy "allowed: categories"    on public.categories    for all to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));
create policy "allowed: board_columns" on public.board_columns for all to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));
create policy "allowed: allowed_users" on public.allowed_users for all to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));
create policy "allowed: profiles"      on public.profiles      for all to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));
create policy "allowed: tickets"       on public.tickets       for all to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));

-- History and notes are append-only.
create policy "allowed: read moves"   on public.ticket_moves for select to authenticated using ((select public.is_allowed()));
create policy "allowed: insert moves" on public.ticket_moves for insert to authenticated with check ((select public.is_allowed()));
create policy "allowed: read notes"   on public.ticket_notes for select to authenticated using ((select public.is_allowed()));
create policy "allowed: insert notes" on public.ticket_notes for insert to authenticated with check ((select public.is_allowed()));

create policy "allowed: read attachments"   on public.ticket_attachments for select to authenticated using ((select public.is_allowed()));
create policy "allowed: insert attachments" on public.ticket_attachments for insert to authenticated with check ((select public.is_allowed()));
create policy "allowed: delete attachments" on public.ticket_attachments for delete to authenticated using ((select public.is_allowed()));

-- ------------------------------------------------------------
-- Storage: private attachments bucket
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 26214400, null)
on conflict (id) do nothing;

create policy "allowed: read attachment objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (select public.is_allowed()));
create policy "allowed: upload attachment objects" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (select public.is_allowed()));
create policy "allowed: delete attachment objects" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (select public.is_allowed()));

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------

alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_notes;
alter publication supabase_realtime add table public.ticket_attachments;

-- ------------------------------------------------------------
-- Reference data
-- ------------------------------------------------------------

insert into public.people (name, initials, sort_order) values
  ('John',   'JH', 1),
  ('Ryan',   'RS', 2),
  ('Nick',   'NS', 3),
  ('Connor', 'CO', 4);

insert into public.categories (name, color, sort_order) values
  ('Audio',    'blue',   1),
  ('Lighting', 'yellow', 2),
  ('Video',    'green',  3),
  ('Other',    'green',  4);

insert into public.board_columns (key, name, position, description, default_owner_id) values
  ('new',           'New',           1,  'Request received, ticket created',                       (select id from public.people where name = 'John')),
  ('quote_sent',    'Quote Sent',    2,  'Quote out to client, awaiting answer',                   (select id from public.people where name = 'John')),
  ('quote_signed',  'Quote Signed',  3,  'Client approved, needs scheduling',                      (select id from public.people where name = 'Ryan')),
  ('scheduled',     'Scheduled',     4,  'Site visit or work date on the calendar',                (select id from public.people where name = 'Ryan')),
  ('in_progress',   'In Progress',   5,  'Work underway',                                          (select id from public.people where name = 'Ryan')),
  ('parts_needed',  'Parts Needed',  6,  'Parts or replacement gear identified, not yet ordered',  (select id from public.people where name = 'John')),
  ('parts_ordered', 'Parts Ordered', 7,  'Waiting on delivery',                                    (select id from public.people where name = 'John')),
  ('to_bill',       'To Bill',       8,  'Work complete, invoice the client',                      (select id from public.people where name = 'John')),
  ('invoiced',      'Invoiced',      9,  'Invoice sent, waiting on payment',                       (select id from public.people where name = 'Connor')),
  ('paid',          'Paid',          10, 'Payment received, done',                                 null);

-- Starting login allowlist. Replace the placeholders with real addresses (see HANDOFF.md).
insert into public.allowed_users (email, display_name, person_id) values
  ('[nick email]',   'Nick',   (select id from public.people where name = 'Nick')),
  ('[john email]',   'John',   (select id from public.people where name = 'John')),
  ('[ryan email]',   'Ryan',   (select id from public.people where name = 'Ryan')),
  ('[connor email]', 'Connor', (select id from public.people where name = 'Connor'));
