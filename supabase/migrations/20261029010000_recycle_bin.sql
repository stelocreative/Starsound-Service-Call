-- Deleting a ticket moves it to a recycle bin (soft delete) instead of removing it.
-- Binned tickets keep everything and can be restored from the Archive page;
-- "Delete forever" still runs the hard delete and its audit trigger.

alter table public.tickets
  add column deleted_at      timestamptz,
  add column deleted_by      uuid references auth.users(id) on delete set null,
  add column deleted_by_name text;

create index tickets_deleted_idx on public.tickets (deleted_at desc) where deleted_at is not null;

create or replace function public.recycle_ticket(p_ticket_id uuid)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  update public.tickets
     set deleted_at = now(),
         deleted_by = auth.uid(),
         deleted_by_name = public.current_display_name()
   where id = p_ticket_id and deleted_at is null;
  if not found then
    raise exception 'Ticket not found or already in the recycle bin' using errcode = 'check_violation';
  end if;
end $$;

revoke all on function public.recycle_ticket(uuid) from public;
grant execute on function public.recycle_ticket(uuid) to authenticated;

create or replace function public.restore_ticket(p_ticket_id uuid)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  update public.tickets
     set deleted_at = null,
         deleted_by = null,
         deleted_by_name = null
   where id = p_ticket_id and deleted_at is not null;
  if not found then
    raise exception 'Ticket is not in the recycle bin' using errcode = 'check_violation';
  end if;
end $$;

revoke all on function public.restore_ticket(uuid) from public;
grant execute on function public.restore_ticket(uuid) to authenticated;

-- The column guard now mentions the bin, since binned tickets still belong to a column.
create or replace function public.board_columns_before_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.key in ('new', 'paid') then
    raise exception '% is a built-in column and cannot be deleted', old.name
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.tickets where column_id = old.id) then
    raise exception 'Move the tickets out of % (including any in the recycle bin) before deleting it', old.name
      using errcode = 'check_violation';
  end if;
  return old;
end $$;
