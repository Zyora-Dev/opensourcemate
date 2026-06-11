"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  FiBell, FiCheck, FiCheckCircle, FiAlertTriangle, FiInfo, FiX,
  FiAward, FiGitPullRequest, FiZap, FiGithub, FiSettings, FiLoader, FiTrash2,
} from "react-icons/fi";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type NotifCategory = "points" | "pr" | "automation" | "analysis" | "github" | "system";
type NotifSeverity = "info" | "success" | "warning" | "error";

interface Notification {
  id: number;
  category: NotifCategory;
  severity: NotifSeverity;
  title: string;
  body: string | null;
  ref_kind: string | null;
  ref_id: number | null;
  href: string | null;
  meta: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string | null;
}

const CAT_META: Record<NotifCategory, { icon: React.ReactNode; label: string; color: string }> = {
  points:     { icon: <FiAward size={14} />,           label: "Points",     color: "text-amber-400" },
  pr:         { icon: <FiGitPullRequest size={14} />,  label: "Pull request", color: "text-emerald-400" },
  automation: { icon: <FiZap size={14} />,             label: "Automation", color: "text-crimson" },
  analysis:   { icon: <FiInfo size={14} />,            label: "Analysis",   color: "text-sky-400" },
  github:     { icon: <FiGithub size={14} />,          label: "GitHub",     color: "text-white" },
  system:     { icon: <FiSettings size={14} />,        label: "System",     color: "text-muted-foreground" },
};

function severityBadge(s: NotifSeverity) {
  switch (s) {
    case "success": return { icon: <FiCheckCircle size={12} />, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    case "warning": return { icon: <FiAlertTriangle size={12} />, cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    case "error":   return { icon: <FiAlertTriangle size={12} />, cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    default:        return { icon: <FiInfo size={12} />, cls: "text-sky-400 bg-sky-500/10 border-sky-500/20" };
  }
}

function relTime(iso: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  /** Optional className for the trigger button (e.g. to align inside a sidebar). */
  className?: string;
  /** Render a compact inline trigger (just the bell + count) — default. */
  variant?: "icon" | "row";
}

export function NotificationCenter({ className, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  };

  const fetchCount = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await api.notifUnreadCount(token);
      setUnread(res?.unread ?? 0);
    } catch {
      // silent
    }
  }, []);

  const fetchList = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.notifList(token, 30, false);
      setItems(res?.items ?? []);
      setUnread(res?.unread ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial unread count + polling every 60s while logged in
  useEffect(() => {
    fetchCount();
    const t = window.setInterval(fetchCount, 60_000);
    return () => window.clearInterval(t);
  }, [fetchCount]);

  // Refetch list when popover opens
  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(t) && triggerRef.current && !triggerRef.current.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (n: Notification) => {
    if (n.read_at) return;
    const token = getToken();
    if (!token) return;
    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    setUnread((c) => Math.max(0, c - 1));
    try { await api.notifMarkRead(n.id, token); } catch { /* swallow */ }
  };

  const markAll = async () => {
    const token = getToken();
    if (!token) return;
    setItems((arr) => arr.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })));
    setUnread(0);
    try { await api.notifMarkAllRead(token); } catch { /* swallow */ }
  };

  const remove = async (n: Notification) => {
    const token = getToken();
    if (!token) return;
    setItems((arr) => arr.filter((x) => x.id !== n.id));
    if (!n.read_at) setUnread((c) => Math.max(0, c - 1));
    try { await api.notifDelete(n.id, token); } catch { /* swallow */ }
  };

  const clearRead = async () => {
    const token = getToken();
    if (!token) return;
    setItems((arr) => arr.filter((x) => !x.read_at));
    try { await api.notifClearRead(token); } catch { /* swallow */ }
  };

  // Trigger
  const trigger =
    variant === "row" ? (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl h-10 px-3 text-muted-foreground hover:text-white hover:bg-muted/30 transition-all",
          className,
        )}
      >
        <span className="relative shrink-0">
          <FiBell size={15} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-crimson text-white text-[10px] font-semibold flex items-center justify-center leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
        <span className="text-sm flex-1 text-left">Notifications</span>
      </button>
    ) : (
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface/40 hover:bg-surface text-muted-foreground hover:text-foreground transition-colors",
          className,
        )}
      >
        <FiBell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-crimson text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    );

  return (
    <div className="relative">
      {trigger}
      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-[360px] sm:w-[420px] max-w-[calc(100vw-1rem)] z-50 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
          role="dialog"
          aria-label="Notification center"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-foreground">Notifications</div>
              <div className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAll}
                disabled={unread === 0}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="inline-flex items-center gap-1"><FiCheck size={11} /> Mark all read</span>
              </button>
              <button
                type="button"
                onClick={clearRead}
                className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <span className="inline-flex items-center gap-1"><FiTrash2 size={11} /> Clear read</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
                <FiLoader size={14} className="animate-spin" /> Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-muted-foreground mb-2">
                  <FiBell size={16} />
                </div>
                <div className="text-sm text-foreground">No notifications yet</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Run an analysis or open a PR — we'll keep you posted.
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const cat = CAT_META[n.category] ?? CAT_META.system;
                  const sev = severityBadge(n.severity);
                  const Wrapper: React.ElementType = n.href ? Link : "div";
                  const wrapperProps = n.href
                    ? n.href.startsWith("/")
                      ? { href: n.href }
                      : { href: n.href, target: "_blank", rel: "noreferrer" }
                    : {};
                  return (
                    <li key={n.id} className={cn("group relative", !n.read_at && "bg-crimson/5")}>
                      <Wrapper
                        {...(wrapperProps as Record<string, unknown>)}
                        onClick={() => markRead(n)}
                        className="block px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className={cn("mt-0.5 shrink-0", cat.color)}>{cat.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-[13px] font-medium text-foreground leading-snug pr-6">
                                {n.title}
                              </div>
                              {!n.read_at && (
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-crimson shrink-0" />
                              )}
                            </div>
                            {n.body && (
                              <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                {n.body}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border", sev.cls)}>
                                {sev.icon}
                                <span className="capitalize">{cat.label}</span>
                              </span>
                              <span className="text-[10.5px] text-muted-foreground">{relTime(n.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </Wrapper>
                      <button
                        type="button"
                        aria-label="Dismiss"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          remove(n);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                      >
                        <FiX size={12} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border bg-surface/40 text-[10.5px] text-muted-foreground text-center">
            Updated automatically every minute
          </div>
        </div>
      )}
    </div>
  );
}
