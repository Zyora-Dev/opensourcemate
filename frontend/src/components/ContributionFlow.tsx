"use client";
/**
 * Stage 6 — Automated Contribution Flow UI.
 *
 * One CTA button on the analysis page launches the whole fork → branch →
 * commit → push → PR sequence on the backend. While the request is in flight
 * we run an optimistic stepper (the 5 boxes from the OSM flow diagram), then
 * snap to the real result when the API responds.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiGitBranch, FiEdit3, FiUploadCloud, FiGitPullRequest, FiGitMerge,
  FiCheck, FiX, FiLoader, FiExternalLink, FiAlertTriangle, FiPlay, FiRotateCcw,
} from "react-icons/fi";
import { api } from "@/lib/api";

interface BackendStep {
  step: string;            // fork | branch | changes | commit | pr
  status: string;          // pending | running | success | failed | skipped
  detail?: string;
  at?: string;
}

interface ContributionRun {
  id: number;
  analysis_id: number;
  status: string;          // pending | running | success | partial | failed
  fork_repo?: string | null;
  branch_name?: string | null;
  pr_url?: string | null;
  pr_number?: number | null;
  files_changed: number;
  files_skipped: number;
  steps?: string | null;   // JSON string of BackendStep[]
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
}

const STEP_ORDER = ["fork", "branch", "changes", "commit", "pr"] as const;
type StepKey = (typeof STEP_ORDER)[number];

const STEP_META: Record<StepKey, { icon: typeof FiGitBranch; title: string; subtitle: string }> = {
  fork:    { icon: FiGitMerge,       title: "Fork repository",     subtitle: "Make a personal copy on GitHub" },
  branch:  { icon: FiGitBranch,      title: "Create branch",       subtitle: "Isolate your changes" },
  changes: { icon: FiEdit3,          title: "Apply code changes",  subtitle: "Patch each suggested file" },
  commit:  { icon: FiUploadCloud,    title: "Commit & push",       subtitle: "Send changes to your fork" },
  pr:      { icon: FiGitPullRequest, title: "Open pull request",   subtitle: "Submit for maintainer review" },
};

interface Props {
  analysisId: number;
  hasSuggestions: boolean; // analysis has code_suggestions to apply
  repoLabel?: string;
}

export function ContributionFlow({ analysisId, hasSuggestions, repoLabel }: Props) {
  const [run, setRun] = useState<ContributionRun | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticStep, setOptimisticStep] = useState<StepKey | null>(null);
  const [hasGithub, setHasGithub] = useState<boolean | null>(null); // null = loading

  // Hydrate previous run + check GitHub connection.
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    api.getContribution(analysisId, token).then((r) => { if (r) setRun(r); }).catch(() => { /* no-op */ });
    api.getProfile(token)
      .then((p: { github_username?: string | null }) => setHasGithub(!!p.github_username))
      .catch(() => setHasGithub(false));
  }, [analysisId]);

  const start = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setError(null);
    setWorking(true);
    setRun(null);

    // Optimistic stepper — advances on a timer; the real result overrides on resolve.
    setOptimisticStep("fork");
    const schedule = [
      { at: 3500, step: "branch" as StepKey },
      { at: 6000, step: "changes" as StepKey },
      { at: 11000, step: "commit" as StepKey },
      { at: 15000, step: "pr" as StepKey },
    ];
    const timers: number[] = [];
    schedule.forEach((s) => {
      timers.push(window.setTimeout(() => setOptimisticStep(s.step), s.at));
    });

    try {
      const result = await api.startContribution(analysisId, token);
      setRun(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Contribution failed");
    } finally {
      timers.forEach(clearTimeout);
      setWorking(false);
      setOptimisticStep(null);
    }
  };

  // Compute per-step state for rendering: real (from run.steps) wins; otherwise optimistic.
  const realSteps: BackendStep[] = (() => {
    if (!run?.steps) return [];
    try { return JSON.parse(run.steps) as BackendStep[]; } catch { return []; }
  })();
  const realByKey: Partial<Record<StepKey, BackendStep>> = {};
  realSteps.forEach((s) => { if (STEP_ORDER.includes(s.step as StepKey)) realByKey[s.step as StepKey] = s; });

  const optimisticIdx = optimisticStep ? STEP_ORDER.indexOf(optimisticStep) : -1;

  const stepStateFor = (key: StepKey): { status: BackendStep["status"]; detail?: string } => {
    if (realByKey[key]) return { status: realByKey[key]!.status, detail: realByKey[key]!.detail };
    if (working && optimisticIdx >= 0) {
      const idx = STEP_ORDER.indexOf(key);
      if (idx < optimisticIdx) return { status: "success" };
      if (idx === optimisticIdx) return { status: "running" };
    }
    return { status: "pending" };
  };

  const showStepper = working || !!run;
  const finalStatus = run?.status;
  const showCta = !working && (!run || finalStatus === "failed");

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-crimson/25 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-crimson/[0.04]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-crimson/15 border border-crimson/30 text-crimson flex items-center justify-center shrink-0">
              <FiGitPullRequest size={16} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-crimson font-mono mb-1">
                Stage 6 · Contribution flow
              </p>
              <h3 className="text-base font-semibold text-white">Push to GitHub &amp; open a pull request</h3>
              <p className="text-[13px] text-white/70 mt-1 max-w-xl">
                We&apos;ll fork {repoLabel ? <span className="font-mono text-white/90">{repoLabel}</span> : "the repo"},
                create a branch, apply each code suggestion, commit, push, and open the PR — all from this page.
              </p>
            </div>
          </div>
          {showCta && (
            <button
              onClick={start}
              disabled={hasGithub === false || !hasSuggestions}
              title={
                hasGithub === false ? "Connect GitHub first" :
                !hasSuggestions ? "No code suggestions to apply" : ""
              }
              className="inline-flex items-center gap-2 text-sm font-medium px-4 h-10 rounded-lg bg-crimson text-white hover:bg-crimson/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {finalStatus === "failed" ? <FiRotateCcw size={13} /> : <FiPlay size={13} />}
              {finalStatus === "failed" ? "Retry" : "Start contribution"}
            </button>
          )}
        </div>

        {/* Preconditions */}
        {(hasGithub === false || !hasSuggestions) && !run && (
          <div className="mt-3 text-[12.5px] text-amber-300/90 flex items-start gap-2">
            <FiAlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>
              {hasGithub === false && "Connect your GitHub account (Profile → GitHub) to enable this. "}
              {!hasSuggestions && "This analysis has no code suggestions to push."}
            </span>
          </div>
        )}
      </header>

      {/* Stepper */}
      <AnimatePresence>
        {showStepper && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-border">
              {STEP_ORDER.map((key) => {
                const { status, detail } = stepStateFor(key);
                const meta = STEP_META[key];
                const Icon = meta.icon;
                const tone =
                  status === "success" ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" :
                  status === "running" ? "text-crimson border-crimson/40 bg-crimson/10" :
                  status === "failed"  ? "text-red-300 border-red-500/40 bg-red-500/10" :
                  status === "skipped" ? "text-white/50 border-white/15 bg-white/[0.03]" :
                                         "text-white/40 border-border bg-background";
                return (
                  <li key={key} className="px-6 py-4 flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${tone}`}>
                      {status === "running" ? <FiLoader size={14} className="animate-spin" /> :
                       status === "success" ? <FiCheck size={14} /> :
                       status === "failed"  ? <FiX size={14} /> :
                       status === "skipped" ? <Icon size={14} /> :
                                              <Icon size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[13.5px] font-medium ${status === "pending" ? "text-white/55" : "text-white"}`}>
                          {meta.title}
                        </p>
                        {status === "skipped" && (
                          <span className="text-[10px] uppercase tracking-wider font-mono text-white/50">skipped</span>
                        )}
                        {status === "success" && (
                          <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-300/80">done</span>
                        )}
                        {status === "failed" && (
                          <span className="text-[10px] uppercase tracking-wider font-mono text-red-300/80">failed</span>
                        )}
                      </div>
                      <p className="text-[12px] text-white/55 mt-0.5">{meta.subtitle}</p>
                      {detail && (
                        <pre className="text-[12px] text-white/75 font-mono mt-1.5 whitespace-pre-wrap break-words leading-relaxed">
                          {detail}
                        </pre>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final result */}
      {run && finalStatus && finalStatus !== "running" && (
        <div className="px-6 py-5 border-t border-border space-y-3">
          {(finalStatus === "success" || finalStatus === "partial") && run.pr_url && (
            <div className={`rounded-lg border px-4 py-3 ${
              finalStatus === "success"
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            }`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${finalStatus === "success" ? "text-emerald-200" : "text-amber-200"}`}>
                    {finalStatus === "success" ? "Pull request opened" : "Pull request opened (with skipped files)"}
                  </p>
                  <p className="text-[12.5px] text-white/75 mt-0.5">
                    {run.files_changed} file(s) committed
                    {run.files_skipped > 0 ? `, ${run.files_skipped} skipped — see the log above` : ""}
                    {run.branch_name && <> · branch <span className="font-mono text-white/90">{run.branch_name}</span></>}
                  </p>
                </div>
                <a
                  href={run.pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 h-9 rounded-md bg-crimson text-white hover:bg-crimson/90 transition-colors shrink-0"
                >
                  Open PR #{run.pr_number} <FiExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {finalStatus === "failed" && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-red-200 flex items-center gap-2">
                <FiAlertTriangle size={13} /> Contribution didn&apos;t complete
              </p>
              <p className="text-[12.5px] text-white/80 mt-1 leading-relaxed">
                {run.error || "Something went wrong — check the step log above."}
              </p>
              <p className="text-[12px] text-white/55 mt-2">
                You can still follow the manual Git commands below as a fallback.
              </p>
            </div>
          )}
        </div>
      )}

      {error && !run && (
        <div className="px-6 py-4 border-t border-border">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-200 flex items-center gap-2">
              <FiAlertTriangle size={13} /> {error}
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}
