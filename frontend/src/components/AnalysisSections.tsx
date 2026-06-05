"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown, FiAlertTriangle, FiInfo, FiLayers, FiCpu, FiTerminal,
  FiGitPullRequest, FiGitBranch, FiZap, FiBookOpen, FiCheckSquare,
} from "react-icons/fi";
import { Markdown } from "@/components/Markdown";

/* ---------- helpers ---------- */

export interface ParsedSection {
  /** Title without the leading "## " */
  title: string;
  /** Markdown body inside the section (may be empty) */
  body: string;
  /** Stable, URL-safe id for anchor links */
  id: string;
}

/** Split a markdown blob by H2 headings into discrete sections. Anything before the
 *  first H2 becomes a synthetic "Overview" section so we never lose content. */
export function parseSections(md: string | null | undefined): ParsedSection[] {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let current: { title: string; body: string[] } | null = null;
  const pre: string[] = [];

  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) sections.push({ title: current.title, body: current.body.join("\n").trim(), id: slug(current.title) });
      current = { title: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      pre.push(line);
    }
  }
  if (current) sections.push({ title: current.title, body: current.body.join("\n").trim(), id: slug(current.title) });

  const preText = pre.join("\n").trim();
  if (preText && sections.length === 0) {
    sections.push({ title: "Overview", body: preText, id: "overview" });
  } else if (preText) {
    sections.unshift({ title: "Overview", body: preText, id: "overview" });
  }
  return sections;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";
}

interface SectionMeta {
  Icon: React.ComponentType<{ size?: number | string; className?: string }>;
  /** Tailwind classes for the icon chip background/border/text */
  chip: string;
  /** Tailwind classes for the card border accent (left edge / outline) */
  accent: string;
  /** Whether to render the section expanded by default */
  defaultOpen: boolean;
  /** Display priority — lower = rendered first (after Overview) */
  priority: number;
  /** Optional eyebrow text shown above title */
  eyebrow?: string;
}

const DEFAULT_META: SectionMeta = {
  Icon: FiBookOpen,
  chip: "bg-crimson/10 border-crimson/25 text-crimson",
  accent: "border-border",
  defaultOpen: false,
  priority: 50,
};

/** Match section titles to icons + accent colors. Titles are normalized loosely. */
export function getSectionMeta(title: string): SectionMeta {
  const t = title.toLowerCase().replace(/[^\w\s]/g, "").trim();

  if (t.includes("issue") && (t.includes("found") || t.includes("improvement"))) {
    return {
      Icon: FiAlertTriangle,
      chip: "bg-amber-500/15 border-amber-500/30 text-amber-300",
      accent: "border-amber-500/30 ring-1 ring-amber-500/20",
      defaultOpen: true,
      priority: 1,
      eyebrow: "Audit findings",
    };
  }
  if (t.includes("open issue") || (t.includes("issue") && t.includes("claim"))) {
    return {
      Icon: FiGitPullRequest,
      chip: "bg-crimson/15 border-crimson/30 text-crimson",
      accent: "border-crimson/25",
      defaultOpen: true,
      priority: 2,
      eyebrow: "Pick something to work on",
    };
  }
  if (t.includes("recommended") && t.includes("issue")) {
    return {
      Icon: FiGitPullRequest,
      chip: "bg-crimson/15 border-crimson/30 text-crimson",
      accent: "border-crimson/25",
      defaultOpen: true,
      priority: 2,
    };
  }
  if (t.includes("what") && t.includes("project")) {
    return {
      Icon: FiInfo,
      chip: "bg-sky-500/15 border-sky-500/30 text-sky-300",
      accent: "border-border",
      defaultOpen: true,
      priority: 3,
      eyebrow: "Project overview",
    };
  }
  if (t.includes("architecture") || t.includes("module") || t.includes("structure")) {
    return {
      Icon: FiLayers,
      chip: "bg-violet-500/15 border-violet-500/30 text-violet-300",
      accent: "border-border",
      defaultOpen: false,
      priority: 4,
    };
  }
  if (t.includes("tech") && t.includes("stack")) {
    return {
      Icon: FiCpu,
      chip: "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300",
      accent: "border-border",
      defaultOpen: false,
      priority: 5,
    };
  }
  if (t.includes("setup") || t.includes("local")) {
    return {
      Icon: FiTerminal,
      chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      accent: "border-border",
      defaultOpen: false,
      priority: 6,
      eyebrow: "Get running locally",
    };
  }
  if (t.includes("contribution") || t.includes("workflow")) {
    return {
      Icon: FiGitBranch,
      chip: "bg-blue-500/15 border-blue-500/30 text-blue-300",
      accent: "border-border",
      defaultOpen: false,
      priority: 7,
    };
  }
  if (t.includes("tip") || t.includes("first") || t.includes("beginner")) {
    return {
      Icon: FiZap,
      chip: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
      accent: "border-border",
      defaultOpen: false,
      priority: 8,
    };
  }
  if (t.includes("step") || t.includes("solution") || t.includes("approach") || t.includes("fix")) {
    return {
      Icon: FiCheckSquare,
      chip: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      accent: "border-border",
      defaultOpen: true,
      priority: 4,
      eyebrow: "Step-by-step",
    };
  }
  return DEFAULT_META;
}

/** Heuristic count of sub-findings (### entries) to badge on the card. */
export function countSubItems(body: string): number {
  const headings = (body.match(/^###\s+/gm) || []).length;
  if (headings) return headings;
  const bullets = (body.match(/^\s*[-*]\s+/gm) || []).length;
  return bullets;
}

/* ---------- card ---------- */

interface SectionCardProps {
  section: ParsedSection;
  /** When false, the card is collapsed initially. */
  defaultOpen: boolean;
}

export function SectionCard({ section, defaultOpen }: SectionCardProps) {
  const meta = useMemo(() => getSectionMeta(section.title), [section.title]);
  const [open, setOpen] = useState(defaultOpen);
  const items = useMemo(() => countSubItems(section.body), [section.body]);
  const Icon = meta.Icon;

  return (
    <motion.section
      id={section.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface border ${meta.accent} rounded-2xl overflow-hidden scroll-mt-24`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-9 h-9 rounded-lg border ${meta.chip} flex items-center justify-center shrink-0`}>
            <Icon size={15} />
          </span>
          <div className="min-w-0">
            {meta.eyebrow && (
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-0.5">
                {meta.eyebrow}
              </p>
            )}
            <h3 className="text-[15px] font-semibold text-white truncate">{section.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {items > 0 && (
            <span className="text-[11px] font-mono text-muted-foreground bg-background border border-border rounded-md px-2 py-0.5">
              {items} {items === 1 ? "item" : "items"}
            </span>
          )}
          <span className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <FiChevronDown size={16} />
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-1 border-t border-border">
              <Markdown>{section.body || "_(no content)_"}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* ---------- sticky nav ---------- */

interface SectionNavProps {
  sections: ParsedSection[];
}

export function SectionNav({ sections }: SectionNavProps) {
  const [active, setActive] = useState<string | null>(null);

  // IntersectionObserver to highlight the section currently in view
  useEffect(() => {
    if (sections.length === 0) return;
    const observers: IntersectionObserver[] = [];
    const ids = sections.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    observers.push(observer);
    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <nav className="sticky top-0 z-20 -mx-3 md:-mx-6 px-3 md:px-6 py-3 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono shrink-0 mr-1">
          Jump to
        </span>
        {sections.map((s) => {
          const meta = getSectionMeta(s.title);
          const isActive = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-full border transition-all ${
                isActive
                  ? `${meta.chip} border-current`
                  : "bg-surface border-border text-white/75 hover:text-white hover:border-crimson/40"
              }`}
            >
              <meta.Icon size={11} />
              <span className="whitespace-nowrap">{shortTitle(s.title)}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function shortTitle(title: string): string {
  // Drop emoji and trim parenthetical clauses like "(most important section)"
  const cleaned = title.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s*\([^)]*\)\s*/g, " ").trim();
  if (cleaned.length <= 28) return cleaned;
  return cleaned.slice(0, 26) + "…";
}
