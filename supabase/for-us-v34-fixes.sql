-- For Us v34 — backend fixes. Run once in the Supabase SQL editor. Safe to re-run.

-- 1. security: helper functions not callable without signing in (advisor: 7 warnings)
revoke all on function public.fu_fill() from public, anon, authenticated;
revoke all on function public.fu_my_couple(), public.fu_answered_day(date), public.fu_answered_topic(text),
  public.fu_wrote_repair(uuid), public.fu_bump(text), public.fu_set_tz(text) from public, anon;
grant execute on function public.fu_my_couple(), public.fu_answered_day(date), public.fu_answered_topic(text),
  public.fu_wrote_repair(uuid), public.fu_bump(text), public.fu_set_tz(text) to authenticated;

-- 2. setup helper: fixed search path, not callable over the API
alter function public.fu_secure(text, boolean) set search_path = public;
revoke all on function public.fu_secure(text, boolean) from public, anon, authenticated;

-- 3. the 5-minute nudge job: give the function 30s instead of 5s (it was timing out on most runs)
select cron.unschedule('forus-nudges') where exists (select 1 from cron.job where jobname = 'forus-nudges');
select cron.schedule('forus-nudges', '*/5 * * * *', $job$
    select net.http_post(
      url := 'https://xmxhvkekzdycgcwvdjsg.supabase.co/functions/v1/nudges',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-nudge-key', public.fu_nudge_key()),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000)
$job$);

select 'v34 fixes done ✔' as done;
