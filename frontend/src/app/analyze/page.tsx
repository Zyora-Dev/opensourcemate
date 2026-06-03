"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiArrowLeft, FiZap, FiAlertCircle, FiGitMerge,
  FiLink, FiPackage, FiLoader, FiCheck,
} from "react-icons/fi";
import { api } from "@/lib/api";

export default function AnalyzePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [issueUrl, setIssueUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [errorLog, setErrorLog] = useState("");
  const [mergeConflict, setMergeConflict] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return; }
    setToken(t);
  }, [router]);

  const hasInput =
    issueUrl.trim() || repoUrl.trim() || errorLog.trim() || mergeConflict.trim();

  async function handleSubmit() {
    if (!token || !hasInput) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.analyze(
        {
          issue_url: issueUrl.trim() || undefined,
          repo_url: repoUrl.trim() || undefined,
          error_log: errorLog.trim() || undefined,
          merge_conflict: mergeConflict.trim() || undefined,
        },
        token
      );
      router.push(`/analyze/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-white relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 radial-fade pointer-events-none" />

      <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-crimson transition-colors"
          >
            <FiArrowLeft size={14} /> Back to dashboard
          </button>
          <h1 className="text-sm font-semibold tracking-tight">New analysis</h1>
          <button
            onClick={() => router.push("/analyze/history")}
            className="text-xs text-muted-foreground hover:text-crimson transition-colors"
          >
            History
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10 md:py-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-crimson font-mono mb-2">Stage 2 · Input</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            What do you need <span className="text-crimson">help</span> with?
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
            Paste any combination below — an issue, a repo, an error trace, or a merge conflict.
            We&apos;ll fetch context from GitHub (including your private repos) and produce a step-by-step plan.
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center gap-2"
          >
            <FiAlertCircle size={14} /> {error}
          </motion.div>
        )}

        <div className="space-y-5">
          <Section
            icon={<FiLink size={14} />}
            title="GitHub issue URL"
            hint="https://github.com/owner/repo/issues/123"
            delay={0.05}
          >
            <input
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/issues/123"
              className="w-full bg-background border border-border rounded-lg px-3 h-10 text-sm focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono"
            />
          </Section>

          <Section
            icon={<FiPackage size={14} />}
            title="GitHub repo URL"
            hint="Public, your own private, or any you have access to via OAuth"
            delay={0.1}
          >
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-background border border-border rounded-lg px-3 h-10 text-sm focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono"
            />
          </Section>

          <Section
            icon={<FiAlertCircle size={14} />}
            title="Error / stack trace"
            hint="Paste runtime errors, build failures, or crash logs"
            delay={0.15}
          >
            <textarea
              value={errorLog}
              onChange={(e) => setErrorLog(e.target.value)}
              rows={5}
              placeholder={`TypeError: Cannot read properties of undefined (reading 'map')\n    at UserList (./components/UserList.tsx:42:15)`}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono resize-y"
            />
          </Section>

          <Section
            icon={<FiGitMerge size={14} />}
            title="Merge conflict snippet"
            hint="Paste the section between <<<<<<< and >>>>>>>"
            delay={0.2}
          >
            <textarea
              value={mergeConflict}
              onChange={(e) => setMergeConflict(e.target.value)}
              rows={5}
              placeholder={"<<<<<<< HEAD\nconst total = price * quantity;\n=======\nconst total = (price * quantity) + tax;\n>>>>>>> feature/add-tax"}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-crimson/50 focus:ring-2 focus:ring-crimson/15 transition-all font-mono resize-y"
            />
          </Section>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-8 flex items-center justify-between flex-wrap gap-3"
        >
          <p className="text-xs text-muted-foreground">
            {hasInput ? (
              <span className="text-emerald-400 inline-flex items-center gap-1.5">
                <FiCheck size={12} /> Ready to analyze
              </span>
            ) : (
              "Fill at least one field to continue"
            )}
          </p>
          <button
            onClick={handleSubmit}
            disabled={!hasInput || submitting}
            className="inline-flex items-center gap-2 bg-crimson hover:bg-crimson-dark disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white text-sm px-5 h-10 rounded-lg font-medium transition-all glow-crimson disabled:glow-none"
          >
            {submitting ? (
              <>
                <FiLoader className="animate-spin" size={14} />
                Analyzing… (~10s)
              </>
            ) : (
              <>
                <FiZap size={14} /> Analyze with AI
              </>
            )}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

function Section({
  icon, title, hint, delay = 0, children,
}: { icon: React.ReactNode; title: string; hint: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-surface border border-border rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-md bg-crimson/10 border border-crimson/20 text-crimson flex items-center justify-center">
          {icon}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-[11.5px] text-muted-foreground mb-3 ml-9">{hint}</p>
      {children}
    </motion.div>
  );
}
