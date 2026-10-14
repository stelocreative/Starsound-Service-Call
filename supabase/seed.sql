-- ============================================================
-- Sample tickets for QC. Delete with: delete from public.tickets;
-- (notes, moves and attachments cascade). People stay.
-- ============================================================

create or replace function pg_temp.seed_ticket(
  p_title text, p_client text, p_cat text, p_days_ago int,
  p_tech text, p_upgrade boolean default false,
  p_contact_name text default null, p_contact_phone text default null, p_contact_email text default null,
  p_site text default null, p_desc text default 'Logged by John from a phone call.',
  p_visit date default null, p_sched date default null
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.tickets (title, client, category_id, description, date_received, created_at,
    column_entered_at, assigned_to_id, is_upgrade, contact_name, contact_phone, contact_email,
    site_address, first_site_visit, scheduled_date, column_id)
  values (
    p_title, p_client,
    (select id from public.categories where name = p_cat),
    p_desc,
    (current_date - p_days_ago),
    now() - make_interval(days => p_days_ago, hours => 2),
    now() - make_interval(days => p_days_ago, hours => 2),
    (select id from public.people where name = p_tech),
    p_upgrade, p_contact_name, p_contact_phone, p_contact_email, p_site, p_visit, p_sched,
    (select id from public.board_columns where key = 'new')
  ) returning id into v_id;
  update public.ticket_moves set moved_by_name = 'John' where ticket_id = v_id;
  return v_id;
end $$;

-- Move a seeded ticket along its path. Owner resets to the column default like the app does.
create or replace function pg_temp.seed_move(p_id uuid, p_to text, p_days_ago numeric, p_who text)
returns void language plpgsql as $$
declare v_from uuid; v_to uuid; v_owner uuid;
begin
  select column_id into v_from from public.tickets where id = p_id;
  select id, default_owner_id into v_to, v_owner from public.board_columns where key = p_to;
  update public.tickets
     set column_id = v_to, owner_id = v_owner,
         column_entered_at = now() - (p_days_ago * interval '1 day') - interval '1 hour'
   where id = p_id;
  insert into public.ticket_moves (ticket_id, from_column_id, to_column_id, moved_by_name, moved_at)
  values (p_id, v_from, v_to, p_who, now() - (p_days_ago * interval '1 day') - interval '1 hour');
end $$;

do $$
declare t uuid;
begin
  -- NEW (owner John)
  t := pg_temp.seed_ticket('Mic drops in ballroom A', 'Pinecrest Casino', 'Audio', 1, null,
        false, 'Dana Reyes', '(775) 555-0132', 'dana@pinecrest.example', '2100 Casino Dr, Reno, NV');
  t := pg_temp.seed_ticket('House lights flicker on dim', 'Crescent Theater', 'Lighting', 1, null);

  -- QUOTE SENT (owner John)
  t := pg_temp.seed_ticket('Replace monitor wedges', 'Harvest Church', 'Audio', 5, 'Ryan');
  perform pg_temp.seed_move(t, 'quote_sent', 4, 'John');
  t := pg_temp.seed_ticket('Add stage wash fixtures', 'Delta Nightclub', 'Lighting', 8, 'Nick', true);
  perform pg_temp.seed_move(t, 'quote_sent', 6, 'John');

  -- QUOTE SIGNED (owner Ryan)
  t := pg_temp.seed_ticket('Lobby speaker rezone', 'Northstar Brewing', 'Audio', 6, null);
  perform pg_temp.seed_move(t, 'quote_sent', 5, 'John');
  perform pg_temp.seed_move(t, 'quote_signed', 2, 'John');

  -- SCHEDULED (owner Ryan)
  t := pg_temp.seed_ticket('Dimmer rack service', 'Crescent Theater', 'Lighting', 6, 'Ryan',
        false, null, null, null, null, 'Dimmer rack 2 trips on full load. Client wants a service pass before the fall season.', null, current_date + 7);
  perform pg_temp.seed_move(t, 'quote_sent', 5, 'John');
  perform pg_temp.seed_move(t, 'quote_signed', 4, 'John');
  perform pg_temp.seed_move(t, 'scheduled', 3, 'Ryan');
  t := pg_temp.seed_ticket('Conference room AV refresh', 'Summit Dental', 'Other', 9, 'Nick',
        false, null, null, null, null, 'Logged by John from a phone call.', null, current_date + 9);
  perform pg_temp.seed_move(t, 'scheduled', 5, 'Ryan');

  -- IN PROGRESS (owner Ryan)
  t := pg_temp.seed_ticket('Main PA amp channel out', 'Pinecrest Casino', 'Audio', 3, 'Ryan', false,
        'Dana Reyes', '(775) 555-0132', 'dana@pinecrest.example', '2100 Casino Dr, Reno, NV',
        'Channel 3 on the main PA amp went out Saturday night. Floor manager reports intermittent crackle on channel 4 as well. House covered with the backup rack for the weekend.',
        current_date - 2, null);
  perform pg_temp.seed_move(t, 'scheduled', 2.6, 'Ryan');
  perform pg_temp.seed_move(t, 'in_progress', 2, 'Ryan');
  insert into public.ticket_notes (ticket_id, author_name, body, created_at) values
    (t, 'Ryan', 'Client wants this back before Friday night. On site Tuesday morning.', now() - interval '2 days'),
    (t, 'Nick', 'Pulled the amp, channel 3 output stage is cooked. Checking if the PSU took anything else with it.', now() - interval '1 day 6 hours');
  t := pg_temp.seed_ticket('Truss motor inspection', 'Washoe Event Center', 'Lighting', 10, 'Nick');
  perform pg_temp.seed_move(t, 'scheduled', 9, 'Ryan');
  perform pg_temp.seed_move(t, 'in_progress', 7, 'Ryan');

  -- PARTS NEEDED (owner John)
  t := pg_temp.seed_ticket('Replace failed console PSU', 'Harvest Church', 'Audio', 12, 'Ryan', true);
  perform pg_temp.seed_move(t, 'scheduled', 11, 'Ryan');
  perform pg_temp.seed_move(t, 'in_progress', 10, 'Ryan');
  perform pg_temp.seed_move(t, 'parts_needed', 9, 'Ryan');

  -- PARTS ORDERED (owner John)
  t := pg_temp.seed_ticket('LED bar replacements', 'Delta Nightclub', 'Lighting', 15, 'Nick');
  perform pg_temp.seed_move(t, 'in_progress', 13, 'Ryan');
  perform pg_temp.seed_move(t, 'parts_needed', 12, 'Nick');
  perform pg_temp.seed_move(t, 'parts_ordered', 11, 'John');

  -- TO BILL (owner John)
  t := pg_temp.seed_ticket('Paging system repair', 'Summit Dental', 'Audio', 6, 'Ryan');
  perform pg_temp.seed_move(t, 'scheduled', 5, 'Ryan');
  perform pg_temp.seed_move(t, 'in_progress', 3, 'Ryan');
  perform pg_temp.seed_move(t, 'to_bill', 1, 'Ryan');

  -- INVOICED (owner Connor)
  t := pg_temp.seed_ticket('Patio speaker install', 'Northstar Brewing', 'Audio', 20, 'Ryan');
  perform pg_temp.seed_move(t, 'quote_sent', 19, 'John');
  perform pg_temp.seed_move(t, 'quote_signed', 16, 'John');
  perform pg_temp.seed_move(t, 'scheduled', 15, 'Ryan');
  perform pg_temp.seed_move(t, 'in_progress', 10, 'Ryan');
  perform pg_temp.seed_move(t, 'to_bill', 8, 'Ryan');
  perform pg_temp.seed_move(t, 'invoiced', 6, 'John');

  -- PAID, recent (still on the board)
  t := pg_temp.seed_ticket('Bar TV mounting', 'Delta Nightclub', 'Video', 14, 'Nick');
  perform pg_temp.seed_move(t, 'scheduled', 12, 'Ryan');
  perform pg_temp.seed_move(t, 'in_progress', 9, 'Ryan');
  perform pg_temp.seed_move(t, 'to_bill', 8, 'Ryan');
  perform pg_temp.seed_move(t, 'invoiced', 7, 'John');
  perform pg_temp.seed_move(t, 'paid', 3, 'Connor');

  -- PAID, 20 days ago (archived off the board)
  t := pg_temp.seed_ticket('Lobby display replacement', 'Washoe Event Center', 'Video', 40, 'Nick', true);
  perform pg_temp.seed_move(t, 'quote_sent', 38, 'John');
  perform pg_temp.seed_move(t, 'quote_signed', 35, 'John');
  perform pg_temp.seed_move(t, 'scheduled', 33, 'Ryan');
  perform pg_temp.seed_move(t, 'in_progress', 30, 'Ryan');
  perform pg_temp.seed_move(t, 'to_bill', 28, 'Ryan');
  perform pg_temp.seed_move(t, 'invoiced', 26, 'John');
  perform pg_temp.seed_move(t, 'paid', 20, 'Connor');
end $$;
