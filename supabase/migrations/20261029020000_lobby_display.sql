-- Lobby display: a view-only, always-live board for a TV.
-- One shared link; its key lives here. The display page calls display_snapshot(key)
-- anonymously, so the TV never signs in. Staff copy or rotate the link under Settings.

create table public.display_settings (
  id              integer primary key default 1 check (id = 1),
  key             text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  rotated_at      timestamptz not null default now(),
  rotated_by_name text not null default 'System'
);

insert into public.display_settings (id) values (1);

alter table public.display_settings enable row level security;
create policy "allowed: read display settings" on public.display_settings
  for select to authenticated using ((select public.is_allowed()));
grant select on public.display_settings to authenticated;

-- New random key; the old link stops working immediately.
create or replace function public.rotate_display_key()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_key text;
begin
  if not public.is_allowed() then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.display_settings
     set key = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
         rotated_at = now(),
         rotated_by_name = public.current_display_name()
   where id = 1
   returning key into v_key;
  return v_key;
end $$;

revoke all on function public.rotate_display_key() from public;
grant execute on function public.rotate_display_key() to authenticated;

-- Everything the TV needs and nothing more: no contact details, addresses, notes or files.
-- Mirrors the board: Paid cards drop off 14 days after entering Paid (ARCHIVE_AFTER_DAYS).
create or replace function public.display_snapshot(p_key text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_paid uuid;
begin
  if p_key is null or p_key = '' or not exists (select 1 from public.display_settings where key = p_key) then
    raise exception 'This display link is not valid' using errcode = 'insufficient_privilege';
  end if;

  select id into v_paid from public.board_columns where key = 'paid';

  return jsonb_build_object(
    'generated_at', now(),
    'columns', (
      select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'key', c.key, 'name', c.name, 'position', c.position) order by c.position), '[]'::jsonb)
        from public.board_columns c
    ),
    'people', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'initials', p.initials) order by p.sort_order, p.name), '[]'::jsonb)
        from public.people p
    ),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name, 'color', k.color) order by k.sort_order, k.name), '[]'::jsonb)
        from public.categories k
    ),
    'tickets', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', t.id, 'code', t.code, 'title', t.title, 'client', t.client,
               'column_id', t.column_id, 'column_entered_at', t.column_entered_at,
               'category_id', t.category_id, 'assigned_to_id', t.assigned_to_id, 'owner_id', t.owner_id,
               'scheduled_date', t.scheduled_date, 'is_upgrade', t.is_upgrade
             ) order by t.column_entered_at desc), '[]'::jsonb)
        from public.tickets t
       where t.deleted_at is null
         and (v_paid is null or t.column_id <> v_paid or t.column_entered_at >= now() - interval '14 days')
    )
  );
end $$;

revoke all on function public.display_snapshot(text) from public;
grant execute on function public.display_snapshot(text) to anon, authenticated;
