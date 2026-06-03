"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FiCode, FiZap, FiLogOut, FiUser, FiGlobe, FiLinkedin,
  FiSearch, FiTrendingUp, FiGitPullRequest, FiActivity,
  FiArrowRight, FiBell, FiCpu, FiTerminal, FiCheckCircle,
  FiInbox, FiShield, FiPhone, FiMail, FiAward, FiPlus,
} from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface User {
  id: number; email: string; name: string; mobile: string;
  user_type: string; website: string; linkedin: string; onboarding_completed: boolean;
}

const typeColor: Record<string, string> = {
  Freelancer:  "bg-sky-500/10 text-sky-300 border-sky-500/30",
  Student:     "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  Enterprise:  "bg-violet-500/10 text-violet-300 border-violet-500/30",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    api.dashboard(token)
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    const fields = [user.name, user.email, user.mobile, user.user_type, user.website, user.linkedin];
    const filled = fields.filter(f => f && f.trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [user]);

  const linksCount = useMemo(() => {
    if (!user) return 0;
    return [user.website, user.linkedin].filter(v => v && v.trim() !== "").length;
  }, [user]);

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <span className="w-5 h-5 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
        Loading your workspace…
      </div>
    </div>
  );

  const firstName = user.name?.split(" ")[0] || "there";
  const initial = (user.name || user.email)[0]?.toUpperCase();

  // Real account events from what we know about this user
  const accountEvents = [
    { icon: <FiUser />,        color: "text-sky-400",     text: "Account created" },
    user.onboarding_completed && { icon: <FiCheckCircle />, color: "text-emerald-400", text: "Onboarding completed" },
    user.website  && { icon: <FiGlobe />,    color: "text-crimson",     text: "Linked website" },
    user.linkedin && { icon: <FiLinkedin />, color: "text-sky-400",     text: "Linked LinkedIn" },
  ].filter(Boolean) as { icon: React.ReactNode; color: string; text: string }[];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-crimson/8 rounded-full blur-[120px] pointer-events-none" />

      <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-md bg-crimson/15 border border-crimson/30 flex items-center justify-center text-crimson">
              <FiCode size={14} />
            </span>
            <span className="text-white text-[15px] font-semibold tracking-tight hidden sm:inline">
              OpenSource<span className="text-crimson">Mate</span>
            </span>
          </div>

          <div className="relative flex-1 max-w-lg">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your workspace…"
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 h-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all"
            />
            <kbd className="hidden md:inline absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="w-9 h-9 rounded-lg border border-border bg-surface text-muted-foreground hover:text-white hover:border-crimson/40 transition-all flex items-center justify-center relative">
              <FiBell size={15} />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-border">
              <span className="w-8 h-8 rounded-full bg-crimson/15 border border-crimson/30 text-crimson flex items-center justify-center text-sm font-semibold">
                {initial}
              </span>
              <div className="leading-tight">
                <p className="text-xs font-medium text-white max-w-[140px] truncate">{user.name || "Contributor"}</p>
                <p className="text-[10.5px] text-muted-foreground max-w-[140px] truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={logout} title="Sign out" className="w-9 h-9 rounded-lg border border-border bg-surface text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-all flex items-center justify-center">
              <FiLogOut size={15} />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 md:py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-crimson font-mono mb-2">{greeting}</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Welcome back, <span className="text-crimson">{firstName}</span>
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
              Your workspace is ready. Let&apos;s ship something open.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-[11px] border ${typeColor[user.user_type] || "bg-muted text-muted-foreground border-border"}`}>
              {user.user_type || "Member"}
            </Badge>
            <button className="inline-flex items-center gap-1.5 bg-crimson hover:bg-crimson-dark text-white text-sm px-4 h-9 rounded-lg font-medium transition-all glow-crimson">
              <FiZap size={14} /> Find issues for me
            </button>
          </div>
        </motion.div>

        {/* Stats — derived from real user record */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[
            {
              icon: <FiAward size={16} />, label: "Profile completion",
              value: `${profileCompletion}%`,
              trend: profileCompletion === 100 ? "complete" : "in progress",
            },
            {
              icon: <FiShield size={16} />, label: "Account status",
              value: user.onboarding_completed ? "Active" : "Pending",
              trend: user.onboarding_completed ? "verified" : "onboarding",
            },
            {
              icon: <FiGlobe size={16} />, label: "Linked profiles",
              value: String(linksCount),
              trend: `of 2`,
            },
            {
              icon: <FiUser size={16} />, label: "Member ID",
              value: `#${user.id}`,
              trend: user.user_type || "member",
            },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i + 0.15 }}
              className="bg-surface border border-border rounded-xl p-4 hover:border-crimson/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson">
                  {s.icon}
                </span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{s.trend}</span>
              </div>
              <p className="text-2xl md:text-3xl font-semibold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          {/* LEFT: Contributions — empty until tracked */}
          <motion.section
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-surface border border-border rounded-2xl overflow-hidden"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson">
                  <FiGitPullRequest size={15} />
                </span>
                <div>
                  <h2 className="font-semibold text-sm">Your contributions</h2>
                  <p className="text-[11.5px] text-muted-foreground">Issues you&apos;re working on &amp; PRs you&apos;ve opened</p>
                </div>
              </div>
              <button className="text-xs text-muted-foreground hover:text-crimson transition-colors flex items-center gap-1">
                View all <FiArrowRight size={11} />
              </button>
            </header>

            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson mb-4">
                <FiInbox size={22} />
              </div>
              <h3 className="text-base font-semibold text-white">No contributions yet</h3>
              <p className="text-[13px] text-muted-foreground mt-1.5 max-w-sm mx-auto">
                Once you start tracking issues and PRs, they&apos;ll appear here with status, match score and reviewer notes.
              </p>
              <button className="mt-5 inline-flex items-center gap-1.5 bg-crimson hover:bg-crimson-dark text-white text-sm px-4 h-9 rounded-lg font-medium transition-all">
                <FiPlus size={14} /> Track your first issue
              </button>
            </div>
          </motion.section>

          {/* RIGHT */}
          <div className="space-y-4 md:space-y-5">
            {/* Profile — fully real */}
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-surface border border-border rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-12 h-12 rounded-full bg-crimson/15 border border-crimson/30 text-crimson flex items-center justify-center text-lg font-semibold">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.name || "Contributor"}</p>
                  <p className="text-[11.5px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5"><FiMail size={11} /> Email</span>
                  <span className="text-white truncate ml-3 max-w-[180px]">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5"><FiPhone size={11} /> Mobile</span>
                  <span className="text-white truncate ml-3">{user.mobile || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5"><FiUser size={11} /> Type</span>
                  <span className="text-white truncate ml-3">{user.user_type || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5"><FiShield size={11} /> Status</span>
                  <span className={user.onboarding_completed ? "text-emerald-400" : "text-amber-400"}>
                    {user.onboarding_completed ? "Onboarded" : "Pending"}
                  </span>
                </div>
              </div>

              {(user.website || user.linkedin) && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  {user.website && (
                    <a href={user.website} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-crimson/40 hover:text-crimson transition-all">
                      <FiGlobe size={12} /> Website
                    </a>
                  )}
                  {user.linkedin && (
                    <a href={user.linkedin} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-crimson/40 hover:text-crimson transition-all">
                      <FiLinkedin size={12} /> LinkedIn
                    </a>
                  )}
                </div>
              )}

              <button className="w-full mt-4 text-xs text-muted-foreground hover:text-crimson transition-colors inline-flex items-center justify-center gap-1.5 border border-border hover:border-crimson/40 rounded-md py-2">
                <FiUser size={12} /> Edit profile
              </button>
            </motion.section>

            {/* Activity — real account milestones only */}
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-surface border border-border rounded-2xl p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson">
                  <FiActivity size={15} />
                </span>
                <div>
                  <h2 className="font-semibold text-sm">Account milestones</h2>
                  <p className="text-[11.5px] text-muted-foreground">{accountEvents.length} completed</p>
                </div>
              </div>
              <ul className="space-y-3">
                {accountEvents.map((a, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i + 0.45 }}
                    className="flex items-start gap-3 text-[12.5px]"
                  >
                    <span className={`mt-0.5 ${a.color}`}>{a.icon}</span>
                    <p className="text-white leading-snug">{a.text}</p>
                  </motion.li>
                ))}
              </ul>
            </motion.section>

            {/* AI tip — driven by real profile state */}
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="relative overflow-hidden rounded-2xl border border-crimson/30 bg-gradient-to-br from-crimson/15 via-surface to-surface p-5"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-crimson/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-crimson font-mono mb-3">
                  <FiCpu size={11} /> AI tip
                </div>
                <p className="text-sm leading-relaxed text-white/90">
                  {profileCompletion < 100 ? (
                    <>
                      Your profile is{" "}
                      <span className="text-crimson font-semibold">{profileCompletion}%</span> complete.
                      Add the missing fields so we can match you to better issues.
                    </>
                  ) : (
                    <>Profile is complete. Track your first issue to start building your contribution history.</>
                  )}
                </p>
                <button className="mt-4 inline-flex items-center gap-1.5 text-xs bg-crimson hover:bg-crimson-dark text-white px-3 h-8 rounded-md font-medium transition-all">
                  <FiTerminal size={12} /> {profileCompletion < 100 ? "Complete profile" : "Open guided session"}
                </button>
              </div>
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}
