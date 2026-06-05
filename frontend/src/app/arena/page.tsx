"use client";
/**
 * Arena — personal contribution activity (GitHub-style).
 *
 * No leaderboard. This is your own ledger: points earned, daily heatmap
 * over the last year, streak, level progress, breakdown by event type,
 * and the recent events feed.
 *
 * Data: GET /arena/me, /arena/activity, /arena/feed.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiActivity, FiZap, FiGitPullRequest, FiCheckCircle, FiCalendar,
  FiTrendingUp, FiAward, FiLoader, FiArrowRight, FiClock, FiLogIn,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { api } from "@/lib/api";

// ─── types ───────────────────────────────────────────────────────────────────

interface LevelInfo {
  name: string;
  color: string;
  current_points: number;
  level_floor: number;
  next_name: string | null;
  next_floor: number | null;
  progress_pct: number;
}
interface BreakdownEntry { count: number; points: number; label: string; }
interface MeSummary {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  streak_days: number;
  longest_streak: number;
  level: LevelInfo;
  breakdown: Record<string, BreakdownEntry>;
}
interface DayBucket { date: string; count: number; points: number; }
interface ActivityResp {
  from: string;
  to: string;
  days: DayBucket[];
  active_days: number;
  max_in_day: number;
}
interface FeedEvent {
  id: number;
  event_type: string;
  label: string;
  points: number;
  note: string | null;
  created_at: string | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const EVENT_ICON: Record<string, IconType> = {
  daily_login:   FiLogIn,
  analysis_done: FiZap,
  pr_opened:     FiGitPullRequest,
  pr_merged:     FiCheckCircle,
};
const EVENT_TONE: Record<string, string> = {
  daily_login:   "text-sky-300 bg-sky-500/10 border-sky-500/30",
  analysis_done: "text-crimson bg-crimson/10 border-crimson/30",
  pr_opened:     "text-amber-300 bg-amber-500/10 border-amber-500/30",
  pr_merged:     "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
};

function relTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return d.toLocaleDateString();
}

function fmtNum(n: number): string {
  if (n >= 100000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

// ─── heatmap ─────────────────────────────────────────────────────────────────

interface HeatmapProps { activity: ActivityResp; }

function Heatmap({ activity }: HeatmapProps) {
  // Build a 7-row grid (Sun..Sat) × N columns. We anchor the FIRST column
  // on the Sunday on/before `activity.from`, so each column = a calendar week.
  const { weeks, monthLabels } = useMemo(() => {
    const days = activity.days;
    if (!days.length) return { weeks: [] as DayBucket[][], monthLabels: [] as { x: number; label: string }[] };

    const first = new Date(days[0].date + "T00:00:00Z");
    // back up to its Sunday (UTC)
    const firstDow = first.getUTCDay(); // 0..6
    const gridStart = new Date(first);
    gridStart.setUTCDate(first.getUTCDate() - firstDow);

    // pre-fill leading "empty" cells before the first real day
    const cells: (DayBucket | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    cells.push(...days);

    // pad trailing nulls to a multiple of 7
    while (cells.length % 7 !== 0) cells.push(null);

    const cols: (DayBucket | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));

    // month labels: first column where the month changes
    const labels: { x: number; label: string }[] = [];
    let lastMonth = -1;
    cols.forEach((col, ci) => {
      const firstReal = col.find((c) => c) as DayBucket | undefined;
      if (!firstReal) return;
      const m = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        const label = new Date(firstReal.date + "T00:00:00Z").toLocaleString(undefined, { month: "short", timeZone: "UTC" });
        labels.push({ x: ci, label });
        lastMonth = m;
      }
    });
    return { weeks: cols as DayBucket[][], monthLabels: labels };
  }, [activity]);

  // Color tiers by count (1, 2, 3, 4+).
  function tone(c: number): string {
    if (c <= 0) return "bg-white/[0.04] border-white/5";
    if (c === 1) return "bg-crimson/25 border-crimson/40";
    if (c === 2) return "bg-crimson/45 border-crimson/55";
    if (c === 3) return "bg-crimson/65 border-crimson/70";
    return "bg-crimson border-crimson";
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-block">
        {/* month strip */}
        <div className="relative h-4 ml-7 mb-1">
          {monthLabels.map((m) => (
            <span
              key={`${m.x}-${m.label}`}
              className="absolute text-[10px] uppercase tracking-[0.16em] text-white/40"
              style={{ left: `${m.x * 14}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {/* day-of-week labels */}
          <div className="flex flex-col gap-[3px] mr-1.5 text-[10px] text-white/40 uppercase tracking-[0.14em]">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <span key={i} className="h-[11px] leading-[11px] w-6 text-right pr-1">{d}</span>
            ))}
          </div>
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell, ri) => {
                if (!cell) return <span key={ri} className="w-[11px] h-[11px]" />;
                return (
                  <span
                    key={ri}
                    title={`${cell.date} · ${cell.count} event${cell.count === 1 ? "" : "s"} · ${cell.points} pts`}
                    className={`w-[11px] h-[11px] rounded-[3px] border ${tone(cell.count)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* legend */}
        <div className="flex items-center gap-1.5 mt-3 text-[10px] uppercase tracking-[0.14em] text-white/45">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((c) => (
            <span key={c} className={`w-[11px] h-[11px] rounded-[3px] border ${tone(c)}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeSummary | null>(null);
  const [activity, setActivity] = useState<ActivityResp | null>(null);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) { router.push("/login"); return; }
    Promise.all([
      api.arenaMe(token),
      api.arenaActivity(token, 365),
      api.arenaFeed(token, 30),
    ])
      .then(([m, a, f]) => {
        setMe(m as MeSummary);
        setActivity(a as ActivityResp);
        setFeed((f as { events: FeedEvent[] }).events);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-12 flex items-center justify-center text-white/60">
        <FiLoader className="animate-spin mr-2" /> Loading your arena…
      </div>
    );
  }
  if (error || !me || !activity) {
    return (
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || "Could not load arena data."}
        </div>
      </div>
    );
  }

  const empty = me.total_points === 0 && activity.active_days === 0;
  if (empty) {
    return (
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-2xl p-10 text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-crimson/10 border border-crimson/30 text-crimson mx-auto flex items-center justify-center">
            <FiActivity size={22} />
          </div>
          <h2 className="text-2xl font-semibold mt-4">Your arena starts empty</h2>
          <p className="text-sm text-white/70 mt-2 max-w-md mx-auto">
            Run an analysis or open a pull request and your activity grid lights up.
            Streaks build daily — show up to keep them alive.
          </p>
          <button
            onClick={() => router.push("/analyze")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium px-4 h-10 rounded-lg bg-crimson text-white hover:bg-crimson/90 transition-colors"
          >
            Start earning points <FiArrowRight size={13} />
          </button>
        </motion.div>
      </div>
    );
  }

  const lvl = me.level;

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 space-y-5">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-crimson font-mono mb-2">
              Arena · your activity
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {fmtNum(me.total_points)} <span className="text-white/50 text-lg font-normal">points</span>
            </h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-white/70">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 h-6 rounded-md border"
                style={{ color: lvl.color, borderColor: `${lvl.color}55`, backgroundColor: `${lvl.color}1a` }}
              >
                <FiAward size={11} /> {lvl.name}
              </span>
              {me.streak_days > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  🔥 {me.streak_days}-day streak
                </span>
              )}
            </div>
          </div>

          {/* Level progress */}
          <div className="min-w-[260px] w-full max-w-sm">
            <div className="flex items-center justify-between text-[11px] text-white/50 uppercase tracking-[0.14em] mb-1.5">
              <span>{lvl.name}</span>
              {lvl.next_name ? <span>{lvl.next_name}</span> : <span>Maxed</span>}
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${lvl.progress_pct}%`,
                  background: `linear-gradient(90deg, ${lvl.color}, ${lvl.color}aa)`,
                }}
              />
            </div>
            {lvl.next_floor != null && (
              <p className="text-[11px] text-white/45 mt-1.5">
                {fmtNum(lvl.next_floor - lvl.current_points)} pts to {lvl.next_name}
              </p>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat icon={FiTrendingUp} label="This week" value={`+${fmtNum(me.weekly_points)}`} />
          <Stat icon={FiCalendar}  label="This month" value={`+${fmtNum(me.monthly_points)}`} />
          <Stat icon={FiActivity}  label="Active days" value={`${activity.active_days}/${activity.days.length}`} />
          <Stat icon={FiAward}     label="Longest streak" value={`${me.longest_streak}d`} />
        </div>
      </motion.section>

      {/* Heatmap */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-surface border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Activity in the last year</h3>
            <p className="text-xs text-white/55 mt-0.5">
              {activity.active_days} active day{activity.active_days === 1 ? "" : "s"} ·
              {" "}peak day: {activity.max_in_day} event{activity.max_in_day === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Heatmap activity={activity} />
      </motion.section>

      {/* Breakdown + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Breakdown */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-surface border border-border rounded-2xl p-6 lg:col-span-1"
        >
          <h3 className="text-sm font-semibold tracking-tight mb-4">How you earn</h3>
          <div className="space-y-3">
            {(["pr_merged", "pr_opened", "analysis_done", "daily_login"] as const).map((key) => {
              const Icon = EVENT_ICON[key];
              const tone = EVENT_TONE[key];
              const entry = me.breakdown[key];
              const count = entry?.count ?? 0;
              const pts = entry?.points ?? 0;
              return (
                <div key={key} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${tone}`}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {key === "pr_merged" ? "PR merged" : key === "pr_opened" ? "PR opened" : key === "analysis_done" ? "Analysis done" : "Daily login"}
                    </p>
                    <p className="text-[11px] text-white/50 mt-0.5">{count} × event</p>
                  </div>
                  <span className="text-sm font-semibold text-white/90">+{fmtNum(pts)}</span>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Feed */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-surface border border-border rounded-2xl p-6 lg:col-span-2"
        >
          <h3 className="text-sm font-semibold tracking-tight mb-4">Recent activity</h3>
          {feed.length === 0 ? (
            <p className="text-sm text-white/55">No events yet — go earn some.</p>
          ) : (
            <ul className="space-y-2.5">
              {feed.map((ev) => {
                const Icon = EVENT_ICON[ev.event_type] ?? FiActivity;
                const tone = EVENT_TONE[ev.event_type] ?? "text-white/60 bg-white/5 border-white/10";
                return (
                  <li
                    key={ev.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                  >
                    <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ev.label}</p>
                      <p className="text-[11px] text-white/50 mt-0.5 truncate flex items-center gap-1.5">
                        <FiClock size={10} /> {relTime(ev.created_at)}
                        {ev.note && <span className="opacity-60">· {ev.note}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-300 shrink-0">+{ev.points}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  );
}

// ─── tiny components ─────────────────────────────────────────────────────────

function Stat({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-white/45">
        <Icon size={11} /> {label}
      </div>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
