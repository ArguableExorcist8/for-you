-- =====================================================================
--  For Us — v25 database setup
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to run more than once. It only ADDS things; it never deletes
--  or changes your existing tables or data.
--
--  Adds: repair mode, needs, guess-their-answer, goodnights, touches,
--  weekly ratings + plans, future map, feature usage, timezones,
--  the private-chat lock, scheduled reminders, and a security report.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------------------------------------------------
-- Which couple is the signed-in user part of?
create or replace function public.fu_my_couple() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.couples
  where active and auth.uid() in (user_a, user_b)
  limit 1
$$;

-- Every new row gets the caller as author and their couple as owner.
-- (Clients cannot fake either one.)
create or replace function public.fu_fill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  new.created_by := auth.uid();
  new.couple_id  := public.fu_my_couple();
  if new.couple_id is null then raise exception 'not in a couple'; end if;
  return new;
end $$;

-- Standard couple-only security for a table:
--   read: your couple · write: only your own rows
create or replace function public.fu_secure(t text, member_update boolean default false) returns void
language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', t);
  execute format('drop trigger if exists fu_fill on public.%I', t);
  execute format('create trigger fu_fill before insert on public.%I for each row execute function public.fu_fill()', t);
  execute format('drop policy if exists fu_read on public.%I', t);
  execute format('create policy fu_read on public.%I for select using (couple_id = public.fu_my_couple())', t);
  execute format('drop policy if exists fu_insert on public.%I', t);
  execute format('create policy fu_insert on public.%I for insert with check (couple_id = public.fu_my_couple() and created_by = auth.uid())', t);
  execute format('drop policy if exists fu_update on public.%I', t);
  if member_update then
    execute format('create policy fu_update on public.%I for update using (couple_id = public.fu_my_couple()) with check (couple_id = public.fu_my_couple())', t);
  else
    execute format('create policy fu_update on public.%I for update using (created_by = auth.uid()) with check (created_by = auth.uid() and couple_id = public.fu_my_couple())', t);
  end if;
  execute format('drop policy if exists fu_delete on public.%I', t);
  execute format('create policy fu_delete on public.%I for delete using (created_by = auth.uid())', t);
end $$;

-- ---------- 1. needs ("what I need right now") --------------------------
create table if not exists public.needs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  need text not null check (char_length(need) <= 30),
  note text check (char_length(note) <= 200)
);
create index if not exists needs_couple_idx on public.needs (couple_id, created_at desc);
select public.fu_secure('needs');

-- ---------- 2. guess their answer --------------------------------------
create table if not exists public.dq_guesses (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  day date not null,
  guess text not null check (char_length(guess) <= 1000),
  unique (couple_id, created_by, day)
);
create table if not exists public.dq_verdicts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  guess_id uuid not null references public.dq_guesses(id) on delete cascade,
  verdict text not null check (verdict in ('spot','close','nope')),
  unique (guess_id)
);
select public.fu_secure('dq_guesses');
select public.fu_secure('dq_verdicts');

-- Your partner's guess about you only becomes readable after you've
-- answered that day's question yourself (so it can't bias your answer).
create or replace function public.fu_answered_day(d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.daily_answers
                 where couple_id = public.fu_my_couple()
                   and created_by = auth.uid() and day::text = d::text)
$$;
drop policy if exists fu_read on public.dq_guesses;
create policy fu_read on public.dq_guesses for select
  using (couple_id = public.fu_my_couple()
         and (created_by = auth.uid() or public.fu_answered_day(day)));
-- Only the person being guessed can judge the guess.
drop policy if exists fu_insert on public.dq_verdicts;
create policy fu_insert on public.dq_verdicts for insert
  with check (couple_id = public.fu_my_couple() and created_by = auth.uid()
              and exists (select 1 from public.dq_guesses g
                          where g.id = guess_id and g.created_by <> auth.uid()
                            and g.couple_id = public.fu_my_couple()));

-- ---------- 3. repair mode ---------------------------------------------
create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  minutes int not null default 20 check (minutes between 5 and 180),
  ends_at timestamptz not null,
  closed_at timestamptz
);
create index if not exists repairs_couple_idx on public.repairs (couple_id, created_at desc);
select public.fu_secure('repairs', true);   -- either of you can end it

create table if not exists public.repair_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  repair_id uuid not null references public.repairs(id) on delete cascade,
  felt text check (char_length(felt) <= 1500),
  needed text check (char_length(needed) <= 1500),
  own text check (char_length(own) <= 1500),
  line text check (char_length(line) <= 120),
  ok boolean not null default false,
  unique (repair_id, created_by)
);
select public.fu_secure('repair_notes');

-- Simultaneous reveal: you see your partner's "felt / needed" only once
-- you've written yours.
create or replace function public.fu_wrote_repair(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.repair_notes
                 where repair_id = r and created_by = auth.uid() and felt is not null)
$$;
drop policy if exists fu_read on public.repair_notes;
create policy fu_read on public.repair_notes for select
  using (couple_id = public.fu_my_couple()
         and (created_by = auth.uid() or public.fu_wrote_repair(repair_id)));

-- ---------- 4. touches, goodnights -------------------------------------
create table if not exists public.touches (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  pattern jsonb not null check (jsonb_typeof(pattern) = 'array' and jsonb_array_length(pattern) <= 60),
  played_at timestamptz
);
select public.fu_secure('touches', true);   -- the receiver marks it played

create table if not exists public.goodnights (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  day date not null,
  unique (couple_id, created_by, day)
);
select public.fu_secure('goodnights');

-- ---------- 5. weekly "state of us" + future map ------------------------
create table if not exists public.weekly_extra (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  week text not null,
  rating smallint check (rating between 1 and 10),
  plan text check (char_length(plan) <= 300),
  unique (couple_id, created_by, week)
);
select public.fu_secure('weekly_extra');

create table if not exists public.future_map (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  topic text not null check (char_length(topic) <= 40),
  answer text not null check (char_length(answer) <= 1000),
  weight smallint not null default 2 check (weight between 1 and 3),
  unique (couple_id, created_by, topic)
);
select public.fu_secure('future_map');
-- Reveal a topic only after you've answered it too.
create or replace function public.fu_answered_topic(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.future_map
                 where couple_id = public.fu_my_couple() and created_by = auth.uid() and topic = t)
$$;
drop policy if exists fu_read on public.future_map;
create policy fu_read on public.future_map for select
  using (couple_id = public.fu_my_couple()
         and (created_by = auth.uid() or public.fu_answered_topic(topic)));

-- ---------- 6. feature usage (only to order your own menus) -------------
create table if not exists public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  feat text not null check (char_length(feat) <= 30),
  n int not null default 1,
  last_at timestamptz not null default now(),
  unique (couple_id, created_by, feat)
);
select public.fu_secure('feature_usage');
create or replace function public.fu_bump(f text) returns void
language plpgsql security definer set search_path = public as $$
declare c uuid := public.fu_my_couple();
begin
  if c is null or char_length(f) > 30 then return; end if;
  insert into public.feature_usage (couple_id, created_by, feat) values (c, auth.uid(), f)
  on conflict (couple_id, created_by, feat) do update set n = feature_usage.n + 1, last_at = now();
end $$;
-- the trigger would overwrite these fields anyway; the RPC bypasses it safely
alter table public.feature_usage disable trigger fu_fill;

-- ---------- 7. timezones (so reminders arrive at your local time) -------
create table if not exists public.member_prefs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  tz text not null check (char_length(tz) <= 60),
  unique (created_by)
);
select public.fu_secure('member_prefs');
create or replace function public.fu_set_tz(z text) returns void
language plpgsql security definer set search_path = public as $$
declare c uuid := public.fu_my_couple();
begin
  if c is null or z is null or char_length(z) > 60 then return; end if;
  insert into public.member_prefs (couple_id, created_by, tz) values (c, auth.uid(), z)
  on conflict (created_by) do update set tz = excluded.tz, couple_id = excluded.couple_id;
end $$;
alter table public.member_prefs disable trigger fu_fill;

-- ---------- 8. private chat lock ---------------------------------------
-- Holds only a random salt and an encrypted check value. The passphrase
-- and the key never leave your phones.
create table if not exists public.couple_vault (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null, created_by uuid not null,
  created_at timestamptz not null default now(),
  salt text not null, check_iv text not null, check_ct text not null,
  unique (couple_id)
);
select public.fu_secure('couple_vault');
drop policy if exists fu_delete on public.couple_vault;
create policy fu_delete on public.couple_vault for delete using (couple_id = public.fu_my_couple());

grant execute on function public.fu_bump(text), public.fu_set_tz(text) to authenticated;

-- ---------- 9. live updates for the new tables -------------------------
do $$
declare t text;
begin
  foreach t in array array['needs','dq_guesses','dq_verdicts','repairs','repair_notes','touches',
                           'goodnights','weekly_extra','future_map','feature_usage','couple_vault'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- 10. scheduled reminders ------------------------------------
-- A private log so each reminder is sent once.
create table if not exists public.nudge_log (
  user_id uuid not null, kind text not null, key text not null,
  at timestamptz not null default now(),
  primary key (user_id, kind, key)
);
alter table public.nudge_log enable row level security;   -- no policies: server only

-- A random secret the scheduler and the "nudges" function share.
-- It lives in Supabase Vault, never in this file or the app.
create extension if not exists supabase_vault;
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'fu_nudge_key') then
    perform vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'fu_nudge_key');
  end if;
end $$;
create or replace function public.fu_nudge_key() returns text
language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'fu_nudge_key'
$$;
revoke all on function public.fu_nudge_key() from public, anon, authenticated;
grant execute on function public.fu_nudge_key() to service_role;

-- Every 5 minutes, poke the "nudges" Edge Function (deploy it first —
-- see supabase/functions/nudges/index.ts). It decides what to send.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$
begin
  perform cron.unschedule('forus-nudges') where exists (select 1 from cron.job where jobname = 'forus-nudges');
  perform cron.schedule('forus-nudges', '*/5 * * * *', $job$
    select net.http_post(
      url := 'https://xmxhvkekzdycgcwvdjsg.supabase.co/functions/v1/nudges',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-nudge-key', public.fu_nudge_key()),
      body := '{}'::jsonb)
  $job$);
end $$;

-- ---------- 11. security report ----------------------------------------
-- Run:  select * from public.fu_security_report();
-- Every row should say "ok". Anything else: send me the output.
create or replace function public.fu_security_report()
returns table (item text, status text, detail text)
language sql stable security definer set search_path = public as $$
  -- tables without row-level security are readable by anyone with the public key
  select 'table ' || c.relname,
         case when c.relrowsecurity then 'ok' else 'NO RLS — anyone can read/write' end,
         (select count(*) || ' policies' from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  union all
  -- policies that let everyone in ("using true") on couple data
  select 'policy ' || p.tablename || '.' || p.policyname,
         case when coalesce(p.qual, '') in ('true', '(true)') and p.tablename <> 'waitlist'
              then 'WIDE OPEN — check this' else 'ok' end,
         p.cmd || ' for ' || array_to_string(p.roles, ',')
  from pg_policies p where p.schemaname = 'public'
  union all
  -- public storage buckets serve files to anyone with the link
  select 'bucket ' || b.id,
         case when b.public then 'PUBLIC — files readable without login' else 'ok' end,
         ''
  from storage.buckets b
$$;
revoke all on function public.fu_security_report() from public, anon, authenticated;

select 'For Us v25 installed ✔  Now run:  select * from public.fu_security_report();' as done;
