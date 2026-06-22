"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiZap, FiAlertCircle, FiGitMerge,
  FiLink, FiPackage, FiLoader, FiCheck, FiGithub, FiSearch,
  FiLock, FiStar, FiChevronRight, FiX, FiArrowRight, FiInfo,
} from "react-icons/fi";
import { api } from "@/lib/api";

type Repo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  open_issues_count: number;
  private: boolean;
  fork: boolean;
  updated_at: string;
};

type Issue = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  labels: { name: string; color?: string }[];
  comments: number;
  updated_at: string;
};

type Mode = "github" | "url" | "error" | "conflict";

const MODES: { id: Mode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: "github",
    label: "Pick from GitHub",
    icon: <FiGithub size={18} />,
    desc: "Choose one of your repos and an open issue",
  },
  {
    id: "url",
    label: "Paste a link",
    icon: <FiLink size={18} />,
    desc: "Paste an issue or repo URL from any GitHub project",
  },
  {
    id: "error",
    label: "Error / stack trace",
    icon: <FiAlertCircle size={18} />,
    desc: "Stuck on a crash? Paste the error and we'll find the cause",
  },
  {
    id: "conflict",
    label: "Merge conflict",
    icon: <FiGitMerge size={18} />,
    desc: "Paste a conflict block and we'll help you resolve it",
  },
];

export default function AnalyzePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("github");

  const [issueUrl, setIssueUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [errorLog, setErrorLog] = useState("");
  const [mergeConflict, setMergeConflict] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ghConnected, setGhConnected] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [pickedRepo, setPickedRepo] = useState<Repo | null>(null);

  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueSearch, setIssueSearch] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return; }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setReposLoading(true);
    api.githubRepos(token)
      .then((rs: Repo[]) => { setRepos(rs); setGhConnected(true); })
      .catch(() => { setGhConnected(false); })
      .finally(() => setReposLoading(false));
  }, [token]);

  const filteredRepos = useMemo(() => {
    const q = repoSearch.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
    );
  }, [repos, repoSearch]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    const q = issueSearch.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter((i) => i.title.toLowerCase().includes(q));
  }, [issues, issueSearch]);

  async function pickRepo(r: Repo) {
    setPickedRepo(r);
    setRepoUrl(r.html_url);
    setIssues(null);
    setIssueSearch("");
    setIssueUrl("");
    if (!token) return;
    const [owner, name] = r.full_name.split("/");
    setIssuesLoading(true);
    try {
      const list = await api.githubRepoIssues(owner, name, token);
      setIssues(list);
    } catch {
      setIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  }

  function clearPicked() {
    setPickedRepo(null);
    setIssues(null);
    setIssueSearch("");
    setRepoUrl("");
    setIssueUrl("");
  }

  function pickIssue(i: Issue) {
    setIssueUrl(i.html_url);
  }

  const modeReady: Record<Mode, boolean> = {
    github: !!repoUrl.trim(),
    url: !!issueUrl.trim() || !!repoUrl.trim(),
    error: !!errorLog.trim(),
    conflict: !!mergeConflict.trim(),
  };
  const ready = modeReady[mode];

  async function handleSubmit() {
    if (!token || !ready) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (mode === "github" || mode === "url") {
        if (issueUrl.trim()) payload.issue_url = issueUrl.trim();
        if (repoUrl.trim()) payload.repo_url = repoUrl.trim();
      } else if (mode === "error") {
        payload.error_log = errorLog.trim();
      } else if (mode === "conflict") {
        payload.merge_conflict = mergeConflict.trim();
      }
      const res = await api.analyze(payload, token);
      router.push(`/analyze/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-crimson font-mono mb-2">Stage 2 · Input</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              What do you need <span className="text-crimson">help</span> with?
            </h2>
            <p className="text-[15px] text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              Pick the option that matches your situation. We&apos;ll fetch the right context
              and produce a clear, step-by-step plan you can follow.
            </p>
          </div>
          <button
            onClick={() => router.push("/analyze/history")}
            className="text-xs h-9 px-3 rounded-lg border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-crimson/40 transition-colors inline-flex items-center gap-1.5"
          >
            <FiPackage size={12} /> Past analyses
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm flex items-center gap-2"
        >
          <FiAlertCircle size={14} /> {error}
        </motion.div>
      )}

      {/* Mode tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={
                "relative text-left rounded-xl p-4 border transition-all " +
                (active
                  ? "bg-crimson/10 border-crimson/40 shadow-[0_0_0_1px_rgba(217,119,87,0.2)]"
                  : "bg-surface border-border hover:border-crimson/25 hover:bg-crimson/[0.04]")
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 " +
                    (active
                      ? "bg-crimson text-white"
                      : "bg-crimson/10 border border-crimson/20 text-crimson")
                  }
                >
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <p className={"text-sm font-semibold tracking-tight " + (active ? "text-foreground" : "text-foreground/90")}>
                    {m.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{m.desc}</p>
                </div>
              </div>
              {active && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-crimson" />}
            </button>
          );
        })}
      </motion.div>

      {/* Active panel */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className="bg-surface border border-border rounded-2xl p-5 md:p-6"
      >
        {mode === "github" && (
          <GitHubPanel
            ghConnected={ghConnected} reposLoading={reposLoading} repos={repos}
            filteredRepos={filteredRepos} repoSearch={repoSearch} setRepoSearch={setRepoSearch}
            pickedRepo={pickedRepo} pickRepo={pickRepo} clearPicked={clearPicked}
            issuesLoading={issuesLoading} issues={issues} filteredIssues={filteredIssues}
            issueSearch={issueSearch} setIssueSearch={setIssueSearch}
            issueUrl={issueUrl} pickIssue={pickIssue}
            onConnect={() => router.push("/dashboard")}
          />
        )}
        {mode === "url" && (
          <UrlPanel issueUrl={issueUrl} setIssueUrl={setIssueUrl} repoUrl={repoUrl} setRepoUrl={setRepoUrl} />
        )}
        {mode === "error" && <ErrorPanel errorLog={errorLog} setErrorLog={setErrorLog} />}
        {mode === "conflict" && <ConflictPanel mergeConflict={mergeConflict} setMergeConflict={setMergeConflict} />}
      </motion.div>

      {/* Submit row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="mt-6 flex items-center justify-between flex-wrap gap-3 pb-2"
      >
        <p className="text-[13px] text-muted-foreground inline-flex items-center gap-2">
          {ready ? (
            <span className="text-emerald-300 inline-flex items-center gap-1.5 font-medium">
              <FiCheck size={13} /> Ready to analyze
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <FiInfo size={13} className="text-crimson" />
              {mode === "github" && "Pick a repo (and optionally an issue) to continue"}
              {mode === "url" && "Paste an issue or repo URL to continue"}
              {mode === "error" && "Paste your error log to continue"}
              {mode === "conflict" && "Paste your merge conflict to continue"}
            </span>
          )}
        </p>
        <button
          onClick={handleSubmit}
          disabled={!ready || submitting}
          className="inline-flex items-center gap-2 bg-crimson hover:bg-crimson-dark disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white text-[14px] px-5 h-11 rounded-xl font-semibold transition-all glow-crimson disabled:glow-none"
        >
          {submitting ? (
            <>
              <FiLoader className="animate-spin" size={15} />
              Analyzing… (~10s)
            </>
          ) : (
            <>
              <FiZap size={15} /> Analyze with AI <FiArrowRight size={14} />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

/* ---------------- Sub-panels ---------------- */

function PanelHeader({ step, title, hint }: { step: string; title: string; hint: string }) {
  return (
    <div className="mb-5">
      <p className="text-[10.5px] uppercase tracking-[0.22em] text-crimson font-mono mb-1.5">{step}</p>
      <h3 className="text-[18px] font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed">{hint}</p>
    </div>
  );
}

function GitHubPanel(props: {
  ghConnected: boolean | null;
  reposLoading: boolean;
  repos: Repo[];
  filteredRepos: Repo[];
  repoSearch: string;
  setRepoSearch: (s: string) => void;
  pickedRepo: Repo | null;
  pickRepo: (r: Repo) => void;
  clearPicked: () => void;
  issuesLoading: boolean;
  issues: Issue[] | null;
  filteredIssues: Issue[];
  issueSearch: string;
  setIssueSearch: (s: string) => void;
  issueUrl: string;
  pickIssue: (i: Issue) => void;
  onConnect: () => void;
}) {
  const {
    ghConnected, reposLoading, repos, filteredRepos, repoSearch, setRepoSearch,
    pickedRepo, pickRepo, clearPicked, issuesLoading, issues, filteredIssues,
    issueSearch, setIssueSearch, issueUrl, pickIssue, onConnect,
  } = props;

  if (ghConnected === false) {
    return (
      <div>
        <PanelHeader
          step="Step 1"
          title="Connect your GitHub"
          hint="Connect once and we can read your public + private repos to give you tailored analysis."
        />
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 bg-crimson hover:bg-crimson-dark text-white text-sm px-4 h-10 rounded-lg font-medium transition-all"
        >
          <FiGithub size={14} /> Go to dashboard to connect <FiArrowRight size={13} />
        </button>
      </div>
    );
  }

  if (reposLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <FiLoader className="animate-spin text-crimson" size={14} /> Loading your GitHub repos…
      </div>
    );
  }

  if (pickedRepo) {
    return (
      <div>
        <PanelHeader
          step="Step 2"
          title="Pick an open issue (optional)"
          hint="Selecting an issue gives the most precise analysis. You can also analyze the whole repo by skipping this step."
        />

        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-crimson/10 border border-crimson/30 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[14px] font-semibold truncate text-foreground">
              {pickedRepo.private && <FiLock size={12} className="text-crimson shrink-0" />}
              <span className="truncate">{pickedRepo.full_name}</span>
            </div>
            {pickedRepo.description && (
              <p className="text-[12.5px] text-muted-foreground mt-1 truncate">{pickedRepo.description}</p>
            )}
          </div>
          <button
            onClick={clearPicked}
            className="text-xs h-8 px-3 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:border-crimson/40 inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <FiX size={12} /> Change repo
          </button>
        </div>

        {issuesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <FiLoader className="animate-spin text-crimson" size={13} /> Loading open issues…
          </div>
        ) : issues && issues.length > 0 ? (
          <>
            <div className="relative mb-3">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={issueSearch}
                onChange={(e) => setIssueSearch(e.target.value)}
                placeholder="Filter issues by title…"
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all"
              />
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {filteredIssues.map((i) => {
                const active = issueUrl === i.html_url;
                return (
                  <button
                    key={i.number}
                    onClick={() => pickIssue(i)}
                    className={
                      "w-full text-left px-4 py-3 rounded-xl border transition-all " +
                      (active
                        ? "border-crimson/50 bg-crimson/10"
                        : "border-border bg-background hover:border-crimson/30 hover:bg-crimson/[0.04]")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] text-foreground font-medium leading-snug">
                          <span className="text-muted-foreground font-mono mr-2">#{i.number}</span>
                          {i.title}
                        </div>
                        {i.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {i.labels.slice(0, 5).map((l) => (
                              <span
                                key={l.name}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground"
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {active ? (
                        <span className="w-6 h-6 rounded-full bg-crimson text-white flex items-center justify-center shrink-0">
                          <FiCheck size={13} />
                        </span>
                      ) : (
                        <FiChevronRight size={15} className="text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredIssues.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">No issues match &quot;{issueSearch}&quot;.</p>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-3">
              Skipping is fine — we&apos;ll analyze the whole repo and recommend issues for you.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No open issues found in this repo. We&apos;ll analyze the repo on its own.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        step="Step 1"
        title="Pick one of your GitHub repos"
        hint="Choose any repo you have access to. Once selected, you can pick an open issue or analyze the repo as a whole."
      />

      {repos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No repos found on your GitHub yet.</p>
      ) : (
        <>
          <div className="relative mb-3">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="Search your repos…"
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {filteredRepos.map((r) => (
              <button
                key={r.id}
                onClick={() => pickRepo(r)}
                className="group w-full text-left px-4 py-3 rounded-xl border border-border bg-background hover:border-crimson/40 hover:bg-crimson/[0.04] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[14px] font-semibold truncate text-foreground">
                      {r.private && <FiLock size={12} className="text-muted-foreground shrink-0" />}
                      <span className="truncate">{r.full_name}</span>
                      {r.fork && <span className="text-[11px] text-muted-foreground font-mono">(fork)</span>}
                    </div>
                    {r.description && (
                      <p className="text-[12.5px] text-muted-foreground mt-1 truncate">{r.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11.5px] text-muted-foreground">
                      {r.language && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-crimson" />
                          {r.language}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <FiStar size={11} /> {r.stargazers_count}
                      </span>
                      <span>{r.open_issues_count} open issues</span>
                    </div>
                  </div>
                  <FiChevronRight size={15} className="text-muted-foreground group-hover:text-crimson shrink-0 mt-1.5" />
                </div>
              </button>
            ))}
            {filteredRepos.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No repos match &quot;{repoSearch}&quot;.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UrlPanel({
  issueUrl, setIssueUrl, repoUrl, setRepoUrl,
}: {
  issueUrl: string; setIssueUrl: (s: string) => void;
  repoUrl: string; setRepoUrl: (s: string) => void;
}) {
  return (
    <div>
      <PanelHeader
        step="Option A"
        title="Paste a GitHub issue or repo URL"
        hint="Works with any public GitHub project. Paste an issue URL for the most precise help, or a repo URL to get an overview and recommended issues."
      />
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-foreground mb-1.5">Issue URL</label>
          <input
            value={issueUrl}
            onChange={(e) => setIssueUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/issues/123"
            className="w-full bg-background border border-border rounded-lg px-3.5 h-11 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono"
          />
          <p className="text-[12px] text-muted-foreground mt-1.5">Most specific — recommended when you have an issue in mind.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-foreground mb-1.5">Repository URL</label>
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full bg-background border border-border rounded-lg px-3.5 h-11 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono"
          />
          <p className="text-[12px] text-muted-foreground mt-1.5">We&apos;ll read the README, languages, and recent issues to recommend beginner-friendly ones.</p>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({
  errorLog, setErrorLog,
}: { errorLog: string; setErrorLog: (s: string) => void }) {
  return (
    <div>
      <PanelHeader
        step="Option B"
        title="Paste an error or stack trace"
        hint="Got a runtime error, build failure, or crash log? Paste it as-is. We'll find the root cause and suggest a concrete fix."
      />
      <textarea
        value={errorLog}
        onChange={(e) => setErrorLog(e.target.value)}
        rows={10}
        placeholder={`TypeError: Cannot read properties of undefined (reading 'map')\n    at UserList (./components/UserList.tsx:42:15)\n    at renderWithHooks (./node_modules/react-dom/cjs/react-dom.js:14985:18)`}
        className="w-full bg-background border border-border rounded-lg px-3.5 py-3 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono resize-y leading-relaxed"
      />
      <p className="text-[12px] text-muted-foreground mt-2">Tip: include the full stack trace if you have it — more context = better fix.</p>
    </div>
  );
}

function ConflictPanel({
  mergeConflict, setMergeConflict,
}: { mergeConflict: string; setMergeConflict: (s: string) => void }) {
  return (
    <div>
      <PanelHeader
        step="Option C"
        title="Paste a merge conflict"
        hint="Paste the section between the conflict markers (<<<<<<< … ======= … >>>>>>>). We'll explain which side to keep and why."
      />
      <textarea
        value={mergeConflict}
        onChange={(e) => setMergeConflict(e.target.value)}
        rows={10}
        placeholder={"<<<<<<< HEAD\nconst total = price * quantity;\n=======\nconst total = (price * quantity) + tax;\n>>>>>>> feature/add-tax"}
        className="w-full bg-background border border-border rounded-lg px-3.5 py-3 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono resize-y leading-relaxed"
      />
      <p className="text-[12px] text-muted-foreground mt-2">Tip: include both sides AND a few lines of context above/below the conflict.</p>
    </div>
  );
}
