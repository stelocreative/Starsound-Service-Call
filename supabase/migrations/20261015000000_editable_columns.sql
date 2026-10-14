-- Columns are editable, addable and deletable from Settings.
-- Move history keeps column names, so deleting a column never loses history.

-- 1. History snapshots column names and survives column deletion.
alter table public.ticket_moves
  add column from_column_name text,
  add column to_column_name   text;

update public.ticket_moves m
   set from_column_name = f.name
  from public.board_columns f
 where f.id = m.from_column_id;

update public.ticket_moves m
   set to_column_name = t.name
  from public.board_columns t
 where t.id = m.to_column_id;

alter table public.ticket_moves
  alter column to_column_id drop not null,
  drop constraint ticket_moves_from_column_id_fkey,
  drop constraint ticket_moves_to_column_id_fkey,
  add constraint ticket_moves_from_column_id_fkey
    foreign key (from_column_id) references public.board_columns(id) on delete set null,
  add constraint ticket_moves_to_column_id_fkey
    foreign key (to_column_id) references public.board_columns(id) on delete set null;

create or replace function public.tickets_after_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_to_name text;
begin
  select name into v_to_name from public.board_columns where id = new.column_id;
  insert into public.ticket_moves
    (ticket_id, from_column_id, to_column_id, from_column_name, to_column_name, moved_by, moved_by_name, moved_at)
  values
    (new.id, null, new.column_id, null, v_to_name, auth.uid(), public.current_display_name(), new.created_at);
  return new;
end $$;

create or replace function public.move_ticket(p_ticket_id uuid, p_column_id uuid)
returns public.tickets
language plpgsql security invoker set search_path = public
as $$
declare
  t           public.tickets;
  col         public.board_columns;
  v_from      uuid;
  v_from_name text;
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
  select name into v_from_name from public.board_columns where id = v_from;
  update public.tickets
     set column_id = col.id,
         owner_id = col.default_owner_id,
         column_entered_at = now()
   where id = p_ticket_id
  returning * into t;
  insert into public.ticket_moves
    (ticket_id, from_column_id, to_column_id, from_column_name, to_column_name, moved_by, moved_by_name)
  values
    (t.id, v_from, col.id, v_from_name, col.name, auth.uid(), public.current_display_name());
  return t;
end $$;

-- 2. New columns get a unique key from their name; built-in columns stay.
create or replace function public.board_columns_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  base      text;
  candidate text;
  n         integer := 1;
begin
  if new.key is null or btrim(new.key) = '' then
    base := btrim(regexp_replace(lower(btrim(new.name)), '[^a-z0-9]+', '_', 'g'), '_');
    if base = '' then
      base := 'column';
    end if;
    candidate := base;
    while exists (select 1 from public.board_columns where key = candidate) loop
      n := n + 1;
      candidate := base || '_' || n;
    end loop;
    new.key := candidate;
  end if;
  if new.position is null then
    select coalesce(max(position), 0) + 1 into new.position from public.board_columns;
  end if;
  return new;
end $$;

create trigger board_columns_before_insert before insert on public.board_columns
  for each row execute function public.board_columns_before_insert();

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
    raise exception 'Move the tickets out of % before deleting it', old.name
      using errcode = 'check_violation';
  end if;
  return old;
end $$;

create trigger board_columns_before_delete before delete on public.board_columns
  for each row execute function public.board_columns_before_delete();

-- 3. Add a column (kept ahead of Paid) and reorder all columns in one call.
create or replace function public.add_column(p_name text, p_description text default null, p_default_owner_id uuid default null)
returns public.board_columns
language plpgsql security invoker set search_path = public
as $$
declare
  paid    public.board_columns;
  max_pos integer;
  col     public.board_columns;
begin
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'Column name is required' using errcode = 'check_violation';
  end if;
  select coalesce(max(position), 0) into max_pos from public.board_columns;
  select * into paid from public.board_columns where key = 'paid';
  if found and paid.position = max_pos then
    update public.board_columns set position = max_pos + 1 where id = paid.id;
    insert into public.board_columns (name, description, default_owner_id, position)
    values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_default_owner_id, max_pos)
    returning * into col;
  else
    insert into public.board_columns (name, description, default_owner_id, position)
    values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_default_owner_id, max_pos + 1)
    returning * into col;
  end if;
  return col;
end $$;

revoke all on function public.add_column(text, text, uuid) from public;
grant execute on function public.add_column(text, text, uuid) to authenticated;

create or replace function public.reorder_columns(p_ids uuid[])
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  n integer;
begin
  select count(*) into n from public.board_columns;
  if coalesce(array_length(p_ids, 1), 0) <> n
     or (select count(distinct x) from unnest(p_ids) as x) <> n
     or exists (select 1 from unnest(p_ids) as x where not exists (select 1 from public.board_columns b where b.id = x)) then
    raise exception 'Reorder must list every column exactly once' using errcode = 'check_violation';
  end if;
  -- Two passes keep the unique position constraint satisfied while rows swap places.
  update public.board_columns c set position = -o.ord
    from unnest(p_ids) with ordinality as o(id, ord) where c.id = o.id;
  update public.board_columns c set position = o.ord
    from unnest(p_ids) with ordinality as o(id, ord) where c.id = o.id;
end $$;

revoke all on function public.reorder_columns(uuid[]) from public;
grant execute on function public.reorder_columns(uuid[]) to authenticated;

-- 4. Column changes reach every open board live.
alter publication supabase_realtime add table public.board_columns;
