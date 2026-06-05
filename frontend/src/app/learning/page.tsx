"use client";
/**
 * Stage 7 — Learning & Growth.
 *
 * Single derived view: how the user is progressing across analyses,
 * languages, difficulty, weekly velocity, and unlocked badges.
 * All data comes from GET /learning/ (computed server-side from existing rows).
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiAward, FiZap, FiGitPullRequest, FiGlobe, FiSearch, FiTrendingUp,
  FiCalendar, FiShield, FiHeart, FiLoader, FiArrowRight, FiExternalLink,
  FiLayers, FiClock, FiCheckCircle, FiCircle,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { api } from "@/lib/api";

// ---- types ----

interface Totals {
  analyses: number;
  pr_attempts: number;
  pr_opened: number;
  pr_merged: number;
  languages: number;
  days_active: number;
  streak: number;
  longest_streak: number;
}

interface Skill { name: string; count: number; last_used: string | null; }
interface Weekly { week: string; analyses: number; prs_opened: number; }
interface Recent {
  id: number;
  issue_title?: string | null;
  repo_name?: string | null;
  repo_language?: string | null;
  difficulty?: string | null;
  status: string;
  has_pr: boolean;
  pr_url?: string | null;
  pr_number?: number | null;
  created_at?: string | null;
}
interface Badge {
  key: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlocked_at?: string;
  icon: string;
  tone: string;
  progress?: { current: number; target: number };
}
interface Summary {
  totals: Totals;
  skills: Skill[];
  difficulty_mix: { easy: number; medium: number; hard: number };
  weekly: Weekly[];
  recent_activity: Recent[];
  badges: Badge[];
  badges_unlocked: number;
  badges_total: number;
}

// ---- helpers ----

const ICONS: Record<string, IconType> = {
  FiAward, FiZap, FiGitPullRequest, FiGlobe, FiSearch, FiTrendingUp,
  FiCalendar, FiShield, FiHeart,
};

const TONE: Record<string, { ring: string; bg: string; text: string }> = {
  crimson:  { ring: "border-crimson/35",   bg: "bg-crimson/10",   text: "text-crimson" },
  emerald:  { ring: "border-emerald-500/35", bg: "bg-emerald-500/10", text: "text-emerald-300" },
  amber:    { ring: "border-amber-500/35",   bg: "bg-amber-500/10",   text: "text-amber-300" },
  sky:      { ring: "border-sky-500/35",     bg: "bg-sky-500/10",     text: "text-sky-300" },
  violet:   { ring: "border-violet-500/35",  bg: "bg-violet-500/10",  text: "text-violet-300" },
  fuchsia:  { ring: "border-fuchsia-500/35", bg: "bg-fuchsia-500/10", text: "text-fuchsia-300" },
  pink:     { ring: "border-pink-500/35",    bg: "bg-pink-500/10",    text: "text-pink-300" },
  red:      { ring: "border-red-500/35",     bg: "bg-red-500/10",     text: "text-red-300" },
};

const DIFF_COLOR: Record<string, string> = {
  easy:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  hard:   "bg-red-500/15 text-red-300 border-red-500/30",
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

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---- page ----

export default function LearningPage() {
  const router = useRouter();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) { router.push("/login"); return; }
    api.getLearning(token)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const maxWeekly = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.weekly.map((w) => w.analyses + w.prs_opened));
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-12 flex items-center justify-center text-muted-foreground">
        <FiLoader className="animate-spin mr-2" /> Loading your growth…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || "Could not load learning data."}
        </div>
      </div>
    );
  }

  const t = data.totals;
  const totalDifficulty = data.difficulty_mix.easy + data.difficulty_mix.medium + data.difficulty_mix.hard || 1;

  // Empty state — first-time user
  if (t.analyses === 0) {
    return (
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-2xl p-10 text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-crimson/10 border border-crimson/30 text-crimson mx-auto flex items-center justify-center">
            <FiAward size={22} />
          </div>
          <h2 className="text-2xl font-semibold mt-4">Your growth starts here</h2>
          <p className="text-sm text-white/70 mt-2 max-w-md mx-auto">
            Run your first analysis to start building skill insights, badges, and a streak.
          </p>
          <button
            onClick={() => router.push("/analyze")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium px-4 h-10 rounded-lg bg-crimson text-white hover:bg-crimson/90 transition-colors"
          >
            Start your first analysis <FiArrowRight size={13} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 space-y-5">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-crimson font-mono mb-2">
              Stage 7 · Learning & growth
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              You&apos;re moving forward
            </h2>
            <p className="text-sm text-white/70 mt-1.5 max-w-2xl">
              {t.analyses} {t.analyses === 1 ? "analysis" : "analyses"} · {t.pr_opened} PR{t.pr_opened === 1 ? "" : "s"} opened ·
              {" "}{t.languages} language{t.languages === 1 ? "" : "s"} explored.
              {t.streak >= 1 && <> · 🔥 {t.streak}-day streak.</>}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Badges</div>
            <div className="text-2xl font-semibold mt-1">
              {data.badges_unlocked}<span className="text-muted-foreground text-base">/{data.badges_total}</span>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat label="Analyses"    value={t.analyses}     icon={FiZap}             tone="crimson" />
          <Stat label="PRs opened"  value={t.pr_opened}    icon={FiGitPullRequest}  tone="emerald" />
          <Stat label="Languages"   value={t.languages}    icon={FiGlobe}           tone="violet"  />
          <Stat label="Best streak" value={t.longest_streak + "d"} icon={FiTrendingUp} tone="sky" />
        </div>
      </motion.section>

      {/* Weekly activity sparkline */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-surface border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-crimson/10 border border-crimson/20 text-crimson flex items-center justify-center">
              <FiCalendar size={13} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Last 12 weeks</h3>
              <p className="text-[11px] text-muted-foreground">Analyses (crimson) · PRs opened (emerald)</p>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t.days_active} active day{t.days_active === 1 ? "" : "s"}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-1.5 items-end h-32">
          {data.weekly.map((w) => {
            const total = w.analyses + w.prs_opened;
            const heightPct = (total / maxWeekly) * 100;
            const aPct = total ? (w.analyses / total) * heightPct : 0;
            const pPct = total ? (w.prs_opened / total) * heightPct : 0;
            return (
              <div key={w.week} className="flex flex-col items-center gap-1.5 group" title={`${dayLabel(w.week)} · ${w.analyses} analyses, ${w.prs_opened} PRs`}>
                <div className="w-full h-full flex flex-col justify-end gap-px">
                  {pPct > 0 && (
                    <div className="w-full rounded-sm bg-emerald-500/70 group-hover:bg-emerald-400 transition-colors" style={{ height: `${pPct}%` }} />
                  )}
                  {aPct > 0 ? (
                    <div className="w-full rounded-sm bg-crimson/70 group-hover:bg-crimson transition-colors" style={{ height: `${aPct}%` }} />
                  ) : pPct === 0 ? (
                    <div className="w-full rounded-sm bg-white/[0.04] h-1" />
                  ) : null}
                </div>
                <span className="text-[9.5px] text-muted-foreground/80 font-mono leading-none">{dayLabel(w.week).split(" ")[1]}</span>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Skills + Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="md:col-span-2 bg-surface border border-border rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-md bg-crimson/10 border border-crimson/20 text-crimson flex items-center justify-center">
              <FiLayers size={13} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Skill mix</h3>
              <p className="text-[11px] text-muted-foreground">Languages you&apos;ve worked with</p>
            </div>
          </div>
          {data.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No language data yet — analyze a repo to start.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.skills.slice(0, 8).map((s) => {
                const max = data.skills[0].count;
                const w = (s.count / max) * 100;
                return (
                  <li key={s.name} className="flex items-center gap-3">
                    <span className="text-[12.5px] font-mono text-white/90 w-24 shrink-0 truncate">{s.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-crimson/70 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                    <span className="text-[11.5px] font-mono text-muted-foreground w-10 text-right">{s.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-surface border border-border rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-md bg-crimson/10 border border-crimson/20 text-crimson flex items-center justify-center">
              <FiShield size={13} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Difficulty mix</h3>
              <p className="text-[11px] text-muted-foreground">Where you spend your time</p>
            </div>
          </div>
          {(["easy", "medium", "hard"] as const).map((k) => {
            const v = data.difficulty_mix[k];
            const pct = (v / totalDifficulty) * 100;
            return (
              <div key={k} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10.5px] uppercase tracking-wider font-mono border ${DIFF_COLOR[k]}`}>{k}</span>
                  <span className="text-muted-foreground font-mono">{v}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className={`h-full rounded-full ${
                    k === "easy" ? "bg-emerald-500/60" : k === "medium" ? "bg-amber-500/60" : "bg-red-500/60"
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </motion.section>
      </div>

      {/* Badges */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-surface border border-border rounded-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-crimson/10 border border-crimson/20 text-crimson flex items-center justify-center">
              <FiAward size={13} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Badges</h3>
              <p className="text-[11px] text-muted-foreground">{data.badges_unlocked} of {data.badges_total} unlocked</p>
            </div>
          </div>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {data.badges.map((b) => {
            const Icon = ICONS[b.icon] || FiAward;
            const tone = TONE[b.tone] || TONE.crimson;
            return (
              <div
                key={b.key}
                className={`bg-surface p-4 flex items-start gap-3 transition-colors ${
                  b.unlocked ? "" : "opacity-60"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                  b.unlocked ? `${tone.bg} ${tone.ring} ${tone.text}` : "bg-white/[0.02] border-white/10 text-white/30"
                }`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-[13.5px] font-semibold truncate ${b.unlocked ? "text-white" : "text-white/60"}`}>
                      {b.name}
                    </p>
                    {b.unlocked ? (
                      <FiCheckCircle size={12} className="text-emerald-400 shrink-0" />
                    ) : (
                      <FiCircle size={12} className="text-white/25 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11.5px] text-white/55 leading-snug mt-0.5">{b.description}</p>
                  {b.progress && !b.unlocked && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10.5px] font-mono text-muted-foreground mb-0.5">
                        <span>{b.progress.current} / {b.progress.target}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className={`h-full rounded-full ${tone.bg.replace("/10", "/60")}`}
                          style={{ width: `${(b.progress.current / b.progress.target) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {b.unlocked && b.unlocked_at && (
                    <p className="text-[10.5px] text-emerald-300/70 font-mono mt-1.5">Unlocked {relTime(b.unlocked_at)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Recent activity */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-surface border border-border rounded-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-crimson/10 border border-crimson/20 text-crimson flex items-center justify-center">
              <FiClock size={13} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Recent activity</h3>
              <p className="text-[11px] text-muted-foreground">Your latest analyses & PRs</p>
            </div>
          </div>
          <Link href="/analyze/history" className="text-xs text-muted-foreground hover:text-crimson transition-colors inline-flex items-center gap-1">
            View all <FiArrowRight size={11} />
          </Link>
        </header>
        <ul className="divide-y divide-border">
          {data.recent_activity.map((r) => (
            <li key={r.id} className="px-6 py-3.5 flex items-center gap-3 group hover:bg-crimson/[0.03] transition-colors">
              <Link href={`/analyze/${r.id}`} className="min-w-0 flex-1 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium truncate text-white">
                    {r.issue_title || r.repo_name || "Custom analysis"}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                    {r.repo_name && <span className="truncate">{r.repo_name}</span>}
                    {r.repo_language && <span>· {r.repo_language}</span>}
                    {r.created_at && <span>· {relTime(r.created_at)}</span>}
                  </div>
                </div>
                {r.difficulty && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase tracking-wider shrink-0 ${DIFF_COLOR[r.difficulty.toLowerCase()] || "bg-muted text-muted-foreground border-border"}`}>
                    {r.difficulty}
                  </span>
                )}
              </Link>
              {r.has_pr && r.pr_url ? (
                <a
                  href={r.pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11.5px] font-mono text-emerald-300/90 hover:text-emerald-300 inline-flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  PR #{r.pr_number} <FiExternalLink size={10} />
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground/60 font-mono shrink-0">no PR yet</span>
              )}
            </li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}

// ---- subcomponents ----

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: IconType; tone: string }) {
  const t = TONE[tone] || TONE.crimson;
  return (
    <div className="bg-background/40 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${t.bg} ${t.ring} ${t.text}`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-none">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}
