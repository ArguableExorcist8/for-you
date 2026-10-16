// For Us — "nudges": gentle reminders sent at each partner's local time.
// Called every 5 minutes by pg_cron (see for-us-v25.sql). Deploy with
// "Verify JWT" OFF — it checks its own secret header instead.
//
//   • repair pause is over          → both of you (always)
//   • anniversary / milestone day   → both of you, 9:00 (always)
//   • your 3-minute ritual          → 20:00, only if you haven't done it ("everything")
//   • on this day (old photos)      → 10:00 ("everything")
//   • weekly state of us            → Sunday 18:00, if not done ("everything")
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ??
  "BGGLLaLVglDyOFefw5C6hzXjECCrm38wIX-uXDKupwb7TEevinxbDx_eBJXBkFO_qkCkW6FgzZBLArtrFqKuCiI";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? Deno.env.get("VAPID_PRIVATE") ??
  Deno.env.get("WEB_PUSH_PRIVATE_KEY") ?? "";
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "https://for-us.xyz", VAPID_PUBLIC, VAPID_PRIVATE);

const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

type Local = { y: number; m: number; d: number; h: number; min: number; dow: number; day: string };
function localNow(tz: string): Local {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    weekday: "short", hour12: false,
  }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const h = Number(p.hour) % 24;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h, min: +p.minute, dow, day: `${p.year}-${p.month}-${p.day}` };
}
const at = (L: Local, h: number) => L.h === h && L.min < 5; // the 5-minute window starting at h:00
function isoWeek(day: string) {
  const d = new Date(day + "T12:00:00Z"); const t = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - t + 3);
  const f = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const w = 1 + Math.round(((d.getTime() - f.getTime()) / 86400000 - 3 + ((f.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
}

// send once per (user, kind, key)
async function once(user: string, kind: string, key: string) {
  const { data, error } = await db.from("nudge_log").insert({ user_id: user, kind, key }).select("user_id");
  return !error && data && data.length > 0;
}
let subsCache: any[] | null = null;
async function subsFor(user: string) {
  if (!subsCache) { const { data } = await db.from("push_subscriptions").select("*"); subsCache = data ?? []; }
  return subsCache.filter((s) => (s.user_id ?? s.created_by ?? s.owner) === user);
}
async function push(user: string, title: string, body: string, url = "./", tag = "nudge") {
  let sent = 0;
  for (const s of await subsFor(user)) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title, body, url, tag }), { TTL: 3600 });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  const { data: key } = await db.rpc("fu_nudge_key");
  if (!key || req.headers.get("x-nudge-key") !== key) return new Response("no", { status: 401 });
  if (!VAPID_PRIVATE) return new Response("missing VAPID private key secret", { status: 500 });

  const out: string[] = [];
  const { data: couples } = await db.from("couples").select("id,user_a,user_b").eq("active", true);
  const { data: prefs } = await db.from("member_prefs").select("created_by,tz");
  const tzOf = (u: string) => prefs?.find((p) => p.created_by === u)?.tz ?? "UTC";
  const now = Date.now();

  // 1. pauses that just ended (checked every run)
  const { data: reps } = await db.from("repairs").select("id,couple_id,ends_at,closed_at")
    .is("closed_at", null).lte("ends_at", new Date(now).toISOString())
    .gte("ends_at", new Date(now - 30 * 60000).toISOString());
  for (const r of reps ?? []) {
    const c = couples?.find((x) => x.id === r.couple_id); if (!c) continue;
    for (const u of [c.user_a, c.user_b]) {
      if (await once(u, "repair", r.id)) {
        await push(u, "Ready when you are 🕊️", "Your pause is over. Take it gently — say what you felt and what you needed.", "./?k=repair", "repair");
        out.push(`repair ${u}`);
      }
    }
  }

  for (const c of couples ?? []) {
    const { data: set } = await db.from("couple_settings").select("*").eq("couple_id", c.id).limit(1);
    const everything = set?.[0]?.notify_level === "everything";
    const since: string | null = set?.[0]?.together_since ?? null;

    for (const u of [c.user_a, c.user_b]) {
      const L = localNow(tzOf(u)); const md = L.day.slice(5);

      // 2. anniversary + milestones, 9:00
      if (at(L, 9)) {
        if (since && String(since).slice(5, 10) === md && String(since).slice(0, 4) !== String(L.y)) {
          const yrs = L.y - Number(String(since).slice(0, 4));
          if (await once(u, "anniv", L.day)) { await push(u, "Happy anniversary 💍", `${yrs} year${yrs === 1 ? "" : "s"} of you two. Make today count.`); out.push(`anniv ${u}`); }
        }
        const { data: ms } = await db.from("milestones").select("title,day").eq("couple_id", c.id);
        for (const m of ms ?? []) {
          if (m.day && String(m.day).slice(5, 10) === md && String(m.day).slice(0, 4) !== String(L.y) && await once(u, "mile", L.day + m.title)) {
            await push(u, "On this day 💞", `${m.title} — ${L.y - Number(String(m.day).slice(0, 4))} year(s) ago today.`); out.push(`mile ${u}`);
          }
        }
      }
      if (!everything) continue;

      // 3. on this day — photos from this date in earlier years, 10:00
      if (at(L, 10)) {
        const { data: ph } = await db.from("photos").select("created_at").eq("couple_id", c.id);
        const old = (ph ?? []).filter((p) => String(p.created_at).slice(5, 10) === md && String(p.created_at).slice(0, 4) !== String(L.y));
        if (old.length && await once(u, "otd", L.day)) {
          const yrs = L.y - Math.min(...old.map((p) => Number(String(p.created_at).slice(0, 4))));
          await push(u, "On this day 📸", `${old.length} photo${old.length > 1 ? "s" : ""} from ${yrs} year${yrs > 1 ? "s" : ""} ago. Take a look together.`, "./?k=otd", "otd");
          out.push(`otd ${u}`);
        }
      }
      // 4. the daily ritual, 20:00, only if not done today
      if (at(L, 20)) {
        const [{ count: mo }, { count: an }] = await Promise.all([
          db.from("moods").select("id", { count: "exact", head: true }).eq("couple_id", c.id).eq("created_by", u).eq("day", L.day),
          db.from("daily_answers").select("id", { count: "exact", head: true }).eq("couple_id", c.id).eq("created_by", u).eq("day", L.day),
        ]);
        if (!mo && !an && await once(u, "ritual", L.day)) { await push(u, "3 minutes for us 💞", "Today's little ritual is waiting — mood, need, question, one appreciation."); out.push(`ritual ${u}`); }
      }
      // 5. weekly state of us, Sunday 18:00
      if (L.dow === 0 && at(L, 18)) {
        const wk = isoWeek(L.day);
        const { count } = await db.from("weekly_checkins").select("id", { count: "exact", head: true }).eq("couple_id", c.id).eq("created_by", u).eq("week", wk);
        if (!count && await once(u, "weekly", wk)) { await push(u, "State of us 🤝", "15 minutes for the two of you this week — what went well, what you need, one plan."); out.push(`weekly ${u}`); }
      }
    }
  }
  return new Response(JSON.stringify({ sent: out }), { headers: { "Content-Type": "application/json" } });
});
