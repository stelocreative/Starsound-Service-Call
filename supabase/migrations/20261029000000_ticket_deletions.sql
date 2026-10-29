-- Tickets can be deleted from the ticket panel (behind a confirmation).
-- Notes, attachments and history cascade with the row; this audit table keeps
-- a record of what was deleted, by whom, and which storage files belonged to it.

create table public.ticket_deletions (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid not null,
  code              text not null,
  title             text not null,
  client            text not null,
  column_name       text,
  deleted_by        uuid references auth.users(id) on delete set null,
  deleted_by_name   text not null default 'System',
  deleted_at        timestamptz not null default now(),
  attachment_paths  text[] not null default '{}',
  snapshot          jsonb not null
);

create index ticket_deletions_deleted_at_idx on public.ticket_deletions (deleted_at desc);

alter table public.ticket_deletions enable row level security;

create policy "allowed: read deletions" on public.ticket_deletions
  for select to authenticated using ((select public.is_allowed()));

grant select on public.ticket_deletions to authenticated;

create or replace function public.tickets_before_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.ticket_deletions
    (ticket_id, code, title, client, column_name, deleted_by, deleted_by_name, attachment_paths, snapshot)
  values
    (old.id, old.code, old.title, old.client,
     (select name from public.board_columns where id = old.column_id),
     auth.uid(), public.current_display_name(),
     coalesce((select array_agg(storage_path order by created_at) from public.ticket_attachments where ticket_id = old.id), '{}'),
     to_jsonb(old));
  return old;
end $$;

create trigger tickets_before_delete before delete on public.tickets
  for each row execute function public.tickets_before_delete();
