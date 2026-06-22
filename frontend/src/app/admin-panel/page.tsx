"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiLock, FiUsers, FiFileText, FiGitPullRequest, FiPackage, FiActivity,
  FiLoader, FiAlertCircle, FiLogOut, FiSearch, FiRefreshCw, FiX, FiChevronRight,
  FiCheckCircle, FiXCircle, FiExternalLink, FiGithub, FiEye, FiEyeOff,
} from "react-icons/fi";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "overview" | "users" | "analyses" | "repos" | "contributions";

interface Overview {
  users: { total: number; verified: number; onboarded: number; github_connected: number };
  analyses: { total: number; done: number; error: number; unique_repos: number };
  contributions: { total_runs: number; prs_opened: number; prs_merged: number; failed_runs: number };
  engagement: { arena_points_awarded: number; notifications_sent: number };
}
interface UserRow {
  id: number;
  email: string;
  name: string | null;
  mobile: string | null;
  user_type: string | null;
  email_verified: boolean;
  onboarding_completed: boolean;
  github_username: string | null;
  github_avatar_url: string | null;
  github_connected: boolean;
  github_connected_at: string | null;
  website: string | null;
  linkedin: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
}
interface AnalysisRow {
  id: number;
  user_id: number;
  user?: { id: number; email: string; name: string | null; github_username: string | null } | null;
  issue_url: string | null;
  repo_url: string | null;
  repo_name: string | null;
  repo_language: string | null;
  issue_title: string | null;
  difficulty: string | null;
  status: string;
  model_used: string | null;
  error_message: string | null;
  created_at: string | null;
}
interface ContributionRow {
  id: number;
  analysis_id: number;
  user_id: number;
  status: string;
  fork_repo: string | null;
  branch_name: string | null;
  pr_url: string | null;
  pr_number: number | null;
  pr_state: string | null;
  pr_merged_at: string | null;
  files_changed: number;
  files_skipped: number;
  error: string | null;
  created_at: string | null;
  completed_at: string | null;
  user?: { id: number; email: string; github_username: string | null } | null;
  analysis?: { id: number; repo_name: string | null; issue_title: string | null } | null;
}
interface RepoRow {
  repo: string;
  language: string | null;
  analysis_count: number;
  user_count: number;
  pr_count: number;
  last_analyzed_at: string | null;
}

const STORAGE_KEY = "osm-admin-token";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function StatusPill({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, string> = {
    done: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    success: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    merged: "bg-violet-500/15 text-violet-500 border-violet-500/30",
    open: "bg-sky-500/15 text-sky-500 border-sky-500/30",
    closed: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    running: "bg-sky-500/15 text-sky-500 border-sky-500/30",
    partial: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    skipped: "bg-muted text-muted-foreground border-border",
    error: "bg-red-500/15 text-red-500 border-red-500/30",
    failed: "bg-red-500/15 text-red-500 border-red-500/30",
  };
  const cls = map[value] || "bg-muted text-muted-foreground border-border";
  return <span className={`inline-block text-[10.5px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${cls}`}>{value}</span>;
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginCard({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showP, setShowP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.adminLogin(u.trim(), p.trim());
      onLoggedIn(res.token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <form onSubmit={submit} autoComplete="off" className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 backdrop-blur-md p-8 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-9 h-9 rounded-lg bg-crimson/15 border border-crimson/30 text-crimson flex items-center justify-center">
            <FiLock size={16} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Admin panel</h1>
            <p className="text-[11.5px] text-muted-foreground">OpenSourceMate operator console</p>
          </div>
        </div>

        {err && (
          <div className="mb-4 px-3 py-2.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-500 text-[12.5px] flex items-center gap-2">
            <FiAlertCircle size={13} /> {err}
          </div>
        )}

        <label className="block text-[12px] font-medium text-foreground mb-1.5">Username</label>
        <input
          name="osm-admin-user"
          value={u} onChange={(e) => setU(e.target.value)} autoFocus required
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          className="w-full bg-background border border-border rounded-lg px-3.5 h-10 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 mb-4"
        />

        <label className="block text-[12px] font-medium text-foreground mb-1.5">Password</label>
        <div className="relative mb-6">
          <input
            name="osm-admin-pass"
            type={showP ? "text" : "password"}
            value={p} onChange={(e) => setP(e.target.value)} required
            autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            className="w-full bg-background border border-border rounded-lg px-3.5 pr-10 h-10 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15"
          />
          <button
            type="button" tabIndex={-1} onClick={() => setShowP((v) => !v)}
            aria-label={showP ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center"
          >
            {showP ? <FiEyeOff size={14} /> : <FiEye size={14} />}
          </button>
        </div>

        <button
          type="submit" disabled={loading || !u || !p}
          className="w-full inline-flex items-center justify-center gap-2 bg-crimson hover:bg-crimson-dark disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white h-10 rounded-lg font-medium transition-all"
        >
          {loading ? <><FiLoader className="animate-spin" size={14} /> Signing in…</> : "Sign in"}
        </button>

        <p className="text-[11px] text-muted-foreground text-center mt-5">
          This panel is read-only and stores its token in your browser only.
        </p>
      </form>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ token }: { token: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.adminOverview(token).then(setData).catch((e: Error) => setErr(e.message));
  }, [token]);
  if (err) return <ErrorCard message={err} />;
  if (!data) return <LoadingRow />;
  return (
    <div className="space-y-6">
      <Section title="Users" icon={<FiUsers size={14} />}>
        <Cards items={[
          ["Total", data.users.total],
          ["Verified email", data.users.verified],
          ["Onboarded", data.users.onboarded],
          ["GitHub connected", data.users.github_connected],
        ]} />
      </Section>
      <Section title="Analyses" icon={<FiFileText size={14} />}>
        <Cards items={[
          ["Total", data.analyses.total],
          ["Completed", data.analyses.done],
          ["Errored", data.analyses.error],
          ["Unique repos", data.analyses.unique_repos],
        ]} />
      </Section>
      <Section title="Contributions" icon={<FiGitPullRequest size={14} />}>
        <Cards items={[
          ["Total runs", data.contributions.total_runs],
          ["PRs opened", data.contributions.prs_opened],
          ["PRs merged", data.contributions.prs_merged],
          ["Failed runs", data.contributions.failed_runs],
        ]} />
      </Section>
      <Section title="Engagement" icon={<FiActivity size={14} />}>
        <Cards items={[
          ["Arena points awarded", data.engagement.arena_points_awarded],
          ["Notifications sent", data.engagement.notifications_sent],
        ]} />
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-crimson">{icon}</span>
        <h2 className="text-[13px] uppercase tracking-[0.15em] font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Cards({ items }: { items: [string, number][] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-surface px-4 py-4">
          <div className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value.toLocaleString()}</div>
          <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
      <FiLoader className="animate-spin text-crimson" size={14} /> Loading…
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-sm inline-flex items-center gap-2">
      <FiAlertCircle size={14} /> {message}
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const limit = 50;

  const load = useCallback(async (off = 0, query = q) => {
    setLoading(true); setErr(null);
    try {
      const r = await api.adminUsers(token, query, limit, off);
      setRows(r.items); setTotal(r.total); setOffset(off);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [token, q]);

  useEffect(() => { load(0, ""); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(0, q)}
            placeholder="Search by email, name, or GitHub username…"
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50"
          />
        </div>
        <button onClick={() => load(0, q)} className="h-9 px-3 rounded-lg border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-crimson/40 text-xs inline-flex items-center gap-1.5">
          <FiRefreshCw size={12} /> Refresh
        </button>
        <span className="text-[11px] text-muted-foreground ml-auto">{total.toLocaleString()} total</span>
      </div>

      {err && <ErrorCard message={err} />}
      {loading ? <LoadingRow /> : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th>ID</Th><Th>Email</Th><Th>Name</Th><Th>Type</Th>
                  <Th>GitHub</Th><Th>Verified</Th><Th>Onboarded</Th>
                  <Th>Joined</Th><Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(u)}>
                    <Td className="font-mono text-muted-foreground text-xs">{u.id}</Td>
                    <Td className="text-foreground break-all">{u.email}</Td>
                    <Td className="text-foreground">{u.name || "—"}</Td>
                    <Td className="text-muted-foreground text-xs">{u.user_type || "—"}</Td>
                    <Td>{u.github_username ? <span className="text-foreground inline-flex items-center gap-1"><FiGithub size={11} />{u.github_username}</span> : <span className="text-muted-foreground">—</span>}</Td>
                    <Td>{u.email_verified ? <FiCheckCircle className="text-emerald-500" size={14} /> : <FiXCircle className="text-muted-foreground" size={14} />}</Td>
                    <Td>{u.onboarding_completed ? <FiCheckCircle className="text-emerald-500" size={14} /> : <FiXCircle className="text-muted-foreground" size={14} />}</Td>
                    <Td className="text-muted-foreground text-xs whitespace-nowrap">{fmtDate(u.created_at)}</Td>
                    <Td><FiChevronRight size={13} className="text-muted-foreground" /></Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No users.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination total={total} limit={limit} offset={offset} onChange={(o) => load(o, q)} />

      {selected && <UserDetailDrawer token={token} userId={selected.id} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2.5">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (o: number) => void }) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between mt-3 text-[12px] text-muted-foreground">
      <span>Page {page} of {totalPages}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, offset - limit))} disabled={offset === 0}
          className="h-8 px-3 rounded-md border border-border bg-surface hover:text-foreground disabled:opacity-40">
          Prev
        </button>
        <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total}
          className="h-8 px-3 rounded-md border border-border bg-surface hover:text-foreground disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  );
}

// ─── User detail drawer ──────────────────────────────────────────────────────

function UserDetailDrawer({ token, userId, onClose }: { token: string; userId: number; onClose: () => void }) {
  interface UserDetail {
    user: UserRow;
    analyses: AnalysisRow[];
    contributions: ContributionRow[];
    arena_points: number;
    repos: string[];
  }
  const [d, setD] = useState<UserDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.adminUser(userId, token).then(setD).catch((e: Error) => setErr(e.message));
  }, [token, userId]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button aria-label="Close" onClick={onClose} className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="w-full sm:w-[600px] md:w-[760px] h-full bg-background border-l border-border overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-background">
          <h3 className="text-base font-semibold text-foreground">User detail</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center">
            <FiX size={16} />
          </button>
        </div>
        <div className="p-5 space-y-6">
          {err && <ErrorCard message={err} />}
          {!d && !err && <LoadingRow />}
          {d && (
            <>
              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  {d.user.avatar_url || d.user.github_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.user.avatar_url || d.user.github_avatar_url!} alt="" className="w-12 h-12 rounded-full border border-border" />
                  ) : (
                    <span className="w-12 h-12 rounded-full bg-crimson/15 border border-crimson/30 text-crimson flex items-center justify-center font-semibold">
                      {(d.user.name || d.user.email).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-foreground truncate">{d.user.name || "—"}</div>
                    <div className="text-[12.5px] text-muted-foreground break-all">{d.user.email}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">id #{d.user.id} · joined {fmtDate(d.user.created_at)}</div>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                  <KV k="User type" v={d.user.user_type} />
                  <KV k="Mobile" v={d.user.mobile} />
                  <KV k="Location" v={d.user.location} />
                  <KV k="Website" v={d.user.website} link />
                  <KV k="LinkedIn" v={d.user.linkedin} link />
                  <KV k="GitHub" v={d.user.github_username ? `@${d.user.github_username}` : null} />
                  <KV k="Verified email" v={d.user.email_verified ? "Yes" : "No"} />
                  <KV k="Onboarded" v={d.user.onboarding_completed ? "Yes" : "No"} />
                  <KV k="Arena points" v={d.arena_points.toLocaleString()} />
                </dl>
                {d.user.bio && <p className="mt-4 text-[13px] text-muted-foreground italic">&ldquo;{d.user.bio}&rdquo;</p>}
              </div>

              <div>
                <h4 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-2">Repos analyzed ({d.repos.length})</h4>
                {d.repos.length === 0 ? <p className="text-sm text-muted-foreground">No repos yet.</p> : (
                  <div className="flex flex-wrap gap-1.5">
                    {d.repos.map((r) => (
                      <span key={r} className="text-[11.5px] font-mono px-2 py-1 rounded-md border border-border bg-surface text-foreground">{r}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-2">Analyses ({d.analyses.length})</h4>
                <ul className="space-y-2">
                  {d.analyses.slice(0, 50).map((a) => (
                    <li key={a.id} className="rounded-md border border-border bg-surface px-3 py-2 text-[12.5px]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-foreground font-medium truncate">{a.issue_title || a.repo_name || "Custom"}</div>
                          <div className="text-muted-foreground font-mono text-[11px] truncate">{a.repo_name || "—"}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusPill value={a.status} />
                          {a.difficulty && <StatusPill value={a.difficulty} />}
                          <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">{fmtDate(a.created_at)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                  {d.analyses.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
                </ul>
              </div>

              <div>
                <h4 className="text-[12px] uppercase tracking-wider text-muted-foreground mb-2">Contribution runs ({d.contributions.length})</h4>
                <ul className="space-y-2">
                  {d.contributions.map((r) => (
                    <li key={r.id} className="rounded-md border border-border bg-surface px-3 py-2 text-[12.5px]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-foreground font-medium">
                            {r.pr_number ? `PR #${r.pr_number}` : `Run #${r.id}`}
                            {r.fork_repo && <span className="text-muted-foreground font-mono text-[11px]"> · {r.fork_repo}</span>}
                          </div>
                          {r.branch_name && <div className="text-muted-foreground font-mono text-[11px] truncate">branch: {r.branch_name}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusPill value={r.status} />
                          {r.pr_state && <StatusPill value={r.pr_state} />}
                          {r.pr_url && <a href={r.pr_url} target="_blank" rel="noreferrer" className="text-crimson hover:text-crimson-dark"><FiExternalLink size={12} /></a>}
                        </div>
                      </div>
                      {r.error && <div className="mt-1 text-red-500 text-[11.5px] break-words">{r.error}</div>}
                    </li>
                  ))}
                  {d.contributions.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KV({ k, v, link }: { k: string; v: string | null | undefined; link?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground break-all">
        {v ? (link ? <a href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noreferrer" className="text-crimson hover:text-crimson-dark">{v}</a> : v) : <span className="text-muted-foreground">—</span>}
      </dd>
    </>
  );
}

// ─── Analyses tab ─────────────────────────────────────────────────────────────

function AnalysesTab({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const limit = 50;

  const load = useCallback(async (off = 0, query = q, status = statusF) => {
    setLoading(true); setErr(null);
    try {
      const r = await api.adminAnalyses(token, query, status, limit, off);
      setRows(r.items); setTotal(r.total); setOffset(off);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [token, q, statusF]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(0, q, statusF)}
            placeholder="Search by repo or issue title…"
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50"
          />
        </div>
        <select value={statusF} onChange={(e) => { setStatusF(e.target.value); load(0, q, e.target.value); }}
          className="h-9 px-2 rounded-lg border border-border bg-surface text-sm text-foreground">
          <option value="">All statuses</option>
          <option value="done">Done</option>
          <option value="pending">Pending</option>
          <option value="error">Error</option>
        </select>
        <span className="text-[11px] text-muted-foreground ml-auto">{total.toLocaleString()} total</span>
      </div>

      {err && <ErrorCard message={err} />}
      {loading ? <LoadingRow /> : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><Th>ID</Th><Th>User</Th><Th>Repo</Th><Th>Issue</Th><Th>Lang</Th><Th>Difficulty</Th><Th>Status</Th><Th>Model</Th><Th>When</Th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedId(a.id)}>
                    <Td className="font-mono text-muted-foreground text-xs">{a.id}</Td>
                    <Td className="text-foreground text-xs break-all">{a.user?.email || `#${a.user_id}`}</Td>
                    <Td className="text-foreground font-mono text-xs">{a.repo_name || "—"}</Td>
                    <Td className="text-foreground max-w-[280px] truncate">{a.issue_title || "—"}</Td>
                    <Td className="text-muted-foreground text-xs">{a.repo_language || "—"}</Td>
                    <Td><StatusPill value={a.difficulty} /></Td>
                    <Td><StatusPill value={a.status} /></Td>
                    <Td className="text-muted-foreground text-xs">{a.model_used || "—"}</Td>
                    <Td className="text-muted-foreground text-xs whitespace-nowrap">{fmtDate(a.created_at)}</Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No analyses.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination total={total} limit={limit} offset={offset} onChange={(o) => load(o, q, statusF)} />
      {selectedId && <AnalysisDetailDrawer token={token} analysisId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// ─── Analysis detail drawer ──────────────────────────────────────────────────

function AnalysisDetailDrawer({ token, analysisId, onClose }: { token: string; analysisId: number; onClose: () => void }) {
  interface AnalysisDetail extends AnalysisRow {
    user: UserRow | null;
    issue_body: string | null;
    summary: string | null;
    files_involved: string[];
    tech_stack: string[];
    root_cause: string | null;
    solution_steps: string | null;
    git_commands: string[];
    pr_title: string | null;
    pr_description: string | null;
    code_suggestions: Array<{ file: string; lines: string; language: string; before: string; after: string; explanation: string }> | null;
    error_log: string | null;
    merge_conflict: string | null;
    contributions: ContributionRow[];
  }
  const [d, setD] = useState<AnalysisDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.adminAnalysis(analysisId, token).then(setD).catch((e: Error) => setErr(e.message));
  }, [token, analysisId]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button aria-label="Close" onClick={onClose} className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="w-full sm:w-[640px] md:w-[820px] h-full bg-background border-l border-border overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-background">
          <h3 className="text-base font-semibold text-foreground">Analysis #{analysisId}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center">
            <FiX size={16} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {err && <ErrorCard message={err} />}
          {!d && !err && <LoadingRow />}
          {d && (
            <>
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Owner</div>
                <div className="text-foreground">{d.user?.name || "—"} · <span className="text-muted-foreground">{d.user?.email}</span></div>
                <div className="text-xs text-muted-foreground mt-2 font-mono">{d.repo_name || "—"} · {d.repo_language || "—"} · {d.model_used || "—"}</div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <StatusPill value={d.status} />
                  {d.difficulty && <StatusPill value={d.difficulty} />}
                  <span className="text-[11px] text-muted-foreground">{fmtDate(d.created_at)}</span>
                </div>
              </div>

              {d.issue_title && (
                <Field label="Issue title">
                  <div className="text-foreground text-sm">{d.issue_title}</div>
                  {d.issue_url && <a href={d.issue_url} target="_blank" rel="noreferrer" className="text-xs text-crimson hover:text-crimson-dark inline-flex items-center gap-1 mt-1">{d.issue_url} <FiExternalLink size={11} /></a>}
                </Field>
              )}
              {d.summary && <Field label="Summary"><Pre>{d.summary}</Pre></Field>}
              {d.root_cause && <Field label="Root cause"><Pre>{d.root_cause}</Pre></Field>}
              {d.tech_stack.length > 0 && (
                <Field label="Tech stack">
                  <div className="flex flex-wrap gap-1.5">
                    {d.tech_stack.map((t) => <span key={t} className="text-[11px] px-2 py-1 rounded-md border border-crimson/20 bg-crimson/10 text-crimson">{t}</span>)}
                  </div>
                </Field>
              )}
              {d.files_involved.length > 0 && (
                <Field label="Files involved">
                  <ul className="space-y-1">
                    {d.files_involved.map((f, i) => <li key={i} className="text-[12px] font-mono text-foreground bg-background border border-border rounded px-2 py-1">{f}</li>)}
                  </ul>
                </Field>
              )}
              {d.solution_steps && <Field label="Solution steps"><Pre>{d.solution_steps}</Pre></Field>}
              {d.code_suggestions && d.code_suggestions.length > 0 && (
                <Field label={`Code suggestions (${d.code_suggestions.length})`}>
                  <ul className="space-y-3">
                    {d.code_suggestions.map((s, i) => (
                      <li key={i} className="rounded-md border border-border bg-surface p-3 text-[12px]">
                        <div className="font-mono text-foreground font-medium">{s.file}{s.lines ? ` · L${s.lines}` : ""}</div>
                        {s.explanation && <p className="text-muted-foreground mt-1">{s.explanation}</p>}
                      </li>
                    ))}
                  </ul>
                </Field>
              )}
              {d.git_commands.length > 0 && (
                <Field label="Git commands">
                  <ul className="space-y-1">
                    {d.git_commands.map((c, i) => <li key={i} className="text-[12px] font-mono text-foreground bg-background border border-border rounded px-2 py-1">{c}</li>)}
                  </ul>
                </Field>
              )}
              {d.pr_title && <Field label="PR title"><Pre>{d.pr_title}</Pre></Field>}
              {d.pr_description && <Field label="PR description"><Pre>{d.pr_description}</Pre></Field>}
              {d.error_log && <Field label="Error log"><Pre>{d.error_log}</Pre></Field>}
              {d.merge_conflict && <Field label="Merge conflict"><Pre>{d.merge_conflict}</Pre></Field>}
              {d.error_message && <Field label="Error message"><div className="text-red-500 text-sm">{d.error_message}</div></Field>}

              {d.contributions.length > 0 && (
                <Field label="Contribution runs">
                  <ul className="space-y-2">
                    {d.contributions.map((r) => (
                      <li key={r.id} className="rounded-md border border-border bg-surface px-3 py-2 text-[12.5px]">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-foreground">
                            {r.pr_number ? `PR #${r.pr_number}` : `Run #${r.id}`} · branch <span className="font-mono text-muted-foreground">{r.branch_name || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusPill value={r.status} />
                            {r.pr_state && <StatusPill value={r.pr_state} />}
                            {r.pr_url && <a href={r.pr_url} target="_blank" rel="noreferrer" className="text-crimson hover:text-crimson-dark"><FiExternalLink size={12} /></a>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Field>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}
function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap break-words text-[12.5px] text-foreground bg-background border border-border rounded-md px-3 py-2.5 leading-relaxed">{children}</pre>
  );
}

// ─── Repos tab ───────────────────────────────────────────────────────────────

function ReposTab({ token }: { token: string }) {
  const [rows, setRows] = useState<RepoRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.adminRepos(token).then((r) => setRows(r.items)).catch((e: Error) => setErr(e.message));
  }, [token]);
  if (err) return <ErrorCard message={err} />;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">No repos analyzed yet.</p>;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><Th>Repository</Th><Th>Language</Th><Th>Analyses</Th><Th>Unique users</Th><Th>PRs opened</Th><Th>Last seen</Th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.repo} className="hover:bg-muted/30">
                <Td className="font-mono text-foreground">
                  <a href={`https://github.com/${r.repo}`} target="_blank" rel="noreferrer" className="hover:text-crimson inline-flex items-center gap-1">
                    {r.repo} <FiExternalLink size={11} />
                  </a>
                </Td>
                <Td className="text-muted-foreground text-xs">{r.language || "—"}</Td>
                <Td className="tabular-nums">{r.analysis_count}</Td>
                <Td className="tabular-nums">{r.user_count}</Td>
                <Td className="tabular-nums">{r.pr_count}</Td>
                <Td className="text-muted-foreground text-xs whitespace-nowrap">{fmtDate(r.last_analyzed_at)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Contributions tab ───────────────────────────────────────────────────────

function ContributionsTab({ token }: { token: string }) {
  const [statusF, setStatusF] = useState("");
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const limit = 50;

  const load = useCallback(async (off = 0, status = statusF) => {
    setLoading(true); setErr(null);
    try {
      const r = await api.adminContributions(token, status, limit, off);
      setRows(r.items); setTotal(r.total); setOffset(off);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [token, statusF]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select value={statusF} onChange={(e) => { setStatusF(e.target.value); load(0, e.target.value); }}
          className="h-9 px-2 rounded-lg border border-border bg-surface text-sm text-foreground">
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <span className="text-[11px] text-muted-foreground ml-auto">{total.toLocaleString()} total</span>
      </div>
      {err && <ErrorCard message={err} />}
      {loading ? <LoadingRow /> : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><Th>ID</Th><Th>User</Th><Th>Repo</Th><Th>Branch</Th><Th>PR</Th><Th>Status</Th><Th>PR state</Th><Th>Files</Th><Th>When</Th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <Td className="font-mono text-muted-foreground text-xs">{r.id}</Td>
                    <Td className="text-foreground text-xs break-all">{r.user?.email || `#${r.user_id}`}</Td>
                    <Td className="text-foreground font-mono text-xs">{r.analysis?.repo_name || r.fork_repo || "—"}</Td>
                    <Td className="text-muted-foreground font-mono text-xs truncate max-w-[180px]">{r.branch_name || "—"}</Td>
                    <Td>
                      {r.pr_url && r.pr_number ? (
                        <a href={r.pr_url} target="_blank" rel="noreferrer" className="text-crimson hover:text-crimson-dark inline-flex items-center gap-1 text-xs">
                          #{r.pr_number} <FiExternalLink size={10} />
                        </a>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </Td>
                    <Td><StatusPill value={r.status} /></Td>
                    <Td><StatusPill value={r.pr_state} /></Td>
                    <Td className="text-muted-foreground text-xs whitespace-nowrap">
                      {r.files_changed}+{r.files_skipped > 0 ? ` (${r.files_skipped} skip)` : ""}
                    </Td>
                    <Td className="text-muted-foreground text-xs whitespace-nowrap">{fmtDate(r.created_at)}</Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No contributions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination total={total} limit={limit} offset={offset} onChange={(o) => load(o, statusF)} />
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  const onLoggedIn = (t: string) => {
    localStorage.setItem(STORAGE_KEY, t);
    setToken(t);
  };
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = useMemo(() => [
    { id: "overview", label: "Overview", icon: <FiActivity size={13} /> },
    { id: "users", label: "Users", icon: <FiUsers size={13} /> },
    { id: "analyses", label: "Analyses", icon: <FiFileText size={13} /> },
    { id: "repos", label: "Repositories", icon: <FiPackage size={13} /> },
    { id: "contributions", label: "Contributions", icon: <FiGitPullRequest size={13} /> },
  ], []);

  if (!mounted) return null;
  if (!token) return <LoginCard onLoggedIn={onLoggedIn} />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-crimson/15 border border-crimson/30 text-crimson flex items-center justify-center">
            <FiLock size={14} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[14.5px] font-semibold text-foreground">OpenSourceMate · Admin</h1>
            <p className="text-[11px] text-muted-foreground">Read-only operator view</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle size="sm" />
            <button onClick={logout} className="text-xs px-3 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-crimson/40 inline-flex items-center gap-1.5">
              <FiLogOut size={12} /> Sign out
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12.5px] border transition-colors ${
                  active
                    ? "bg-crimson/15 border-crimson/40 text-crimson"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}>
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {tab === "overview" && <OverviewTab token={token} />}
        {tab === "users" && <UsersTab token={token} />}
        {tab === "analyses" && <AnalysesTab token={token} />}
        {tab === "repos" && <ReposTab token={token} />}
        {tab === "contributions" && <ContributionsTab token={token} />}
      </main>
    </div>
  );
}
