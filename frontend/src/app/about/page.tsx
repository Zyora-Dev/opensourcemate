"use client";

import { motion } from "framer-motion";
import {
  FiArrowRight, FiCompass, FiHeart, FiLinkedin, FiTarget, FiUsers, FiZap,
} from "react-icons/fi";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

type Member = {
  name: string;
  role: string;
  initials: string;
  linkedin?: string;
  // photo?: string;  // user will add later
};

// Founder + 7 teammates. User will swap in real LinkedIn URLs and photos later.
const TEAM: Member[] = [
  { name: "Ramya CM",        role: "Founder & CEO",            initials: "RC", linkedin: "https://www.linkedin.com/in/ramya-cm" },
  { name: "Teammate Two",    role: "Co-founder · Engineering", initials: "T2" },
  { name: "Teammate Three",  role: "Product",                  initials: "T3" },
  { name: "Teammate Four",   role: "AI / ML",                  initials: "T4" },
  { name: "Teammate Five",   role: "Frontend",                 initials: "T5" },
  { name: "Teammate Six",    role: "Backend",                  initials: "T6" },
  { name: "Teammate Seven",  role: "Design",                   initials: "T7" },
  { name: "Teammate Eight",  role: "Community & Growth",       initials: "T8" },
];

const VALUES = [
  {
    icon: <FiTarget size={18} />,
    title: "Lower the barrier",
    desc: "Open source should welcome everyone — not just those who already know the conventions.",
  },
  {
    icon: <FiZap size={18} />,
    title: "AI as a guide, not a crutch",
    desc: "We use AI to teach, explain, and unblock — so contributors actually learn the craft.",
  },
  {
    icon: <FiUsers size={18} />,
    title: "Built with students",
    desc: "Born inside VIT Chennai. Every feature is shaped by feedback from real student contributors.",
  },
  {
    icon: <FiHeart size={18} />,
    title: "Ship something real",
    desc: "We measure success in merged PRs, not tutorials watched. Your name on a real project, every time.",
  },
];

function TeamCard({ m, idx }: { m: Member; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay: Math.min(idx * 0.04, 0.32) }}
      className="group relative rounded-2xl border border-border bg-surface/40 backdrop-blur-sm p-6 hover:border-crimson/40 transition-all hover:-translate-y-0.5"
    >
      {/* Avatar — currently initials, swap to <img/> when photos arrive */}
      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-crimson/30 to-crimson/10 border border-crimson/30 flex items-center justify-center text-crimson font-semibold text-lg tracking-tight overflow-hidden mb-4">
        {/* {m.photo ? <img src={m.photo} alt={m.name} className="w-full h-full object-cover" /> : m.initials} */}
        {m.initials}
      </div>

      <div className="text-white font-medium text-[15px] tracking-tight">{m.name}</div>
      <div className="text-muted-foreground text-xs mt-1">{m.role}</div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Team
        </span>
        {m.linkedin ? (
          <a
            href={m.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label={`${m.name} on LinkedIn`}
            className="w-8 h-8 rounded-lg border border-border hover:border-crimson/50 hover:bg-crimson/10 text-muted-foreground hover:text-crimson flex items-center justify-center transition-all"
          >
            <FiLinkedin size={14} />
          </a>
        ) : (
          <span
            aria-label="LinkedIn — coming soon"
            className="w-8 h-8 rounded-lg border border-border/60 text-muted-foreground/40 flex items-center justify-center cursor-not-allowed"
          >
            <FiLinkedin size={14} />
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Background layers */}
      <div className="fixed inset-0 grid-bg opacity-70 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-crimson/10 rounded-full blur-[120px] pointer-events-none" />

      <SiteHeader />

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="px-6 pt-16 pb-8 md:pt-20 md:pb-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="inline-flex items-center gap-2 text-xs bg-crimson-muted text-crimson border border-crimson/25 rounded-full px-4 py-1.5 mb-7 font-mono backdrop-blur-sm">
              <FiCompass size={12} /> About OpenSourceMate
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-5 leading-[1.05]">
              We&apos;re making open source <br className="hidden md:block" />
              <span className="text-crimson text-glow">work for everyone</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              OpenSourceMate is an AI-guided contribution platform — built so students and developers
              can ship meaningful open source work without getting stuck on setup, conventions, or context.
            </p>
          </motion.div>
        </section>

        {/* Story */}
        <section className="px-6 pb-12 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="relative rounded-2xl border border-border bg-surface/40 backdrop-blur-sm p-7 md:p-10 overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-crimson/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="text-[11px] uppercase tracking-[0.2em] text-crimson font-mono mb-3">
                Our story
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-5 leading-tight">
                Born inside a VIT Chennai dorm room.
              </h2>
              <div className="space-y-4 text-muted-foreground text-[15px] leading-relaxed max-w-3xl">
                <p>
                  OpenSourceMate was founded by{" "}
                  <span className="text-white font-medium">Ramya CM</span> and her friends at{" "}
                  <span className="text-white font-medium">VIT College, Chennai</span> —
                  after watching brilliant classmates abandon open source contributions
                  because the first 10% (forking, branching, understanding the codebase, writing
                  the right kind of PR) felt impossibly steep.
                </p>
                <p>
                  We&apos;re building the platform we wish we had on day one: paste any issue,
                  error, or merge conflict — and get an AI guide that explains the codebase,
                  drafts a clean fix, opens the pull request, and keeps tracking it until
                  it gets merged.
                </p>
                <p className="text-white/85">
                  Our ambition is simple — make open source contribution{" "}
                  <span className="text-crimson">seamless</span> for every student
                  and every developer, anywhere in the world.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Values */}
        <section className="px-6 pb-12 max-w-6xl mx-auto">
          <div className="text-center mb-9">
            <div className="text-[11px] uppercase tracking-[0.2em] text-crimson font-mono mb-2">
              What we believe
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Principles that shape every feature
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm p-5 hover:border-crimson/40 transition-all"
              >
                <span className="inline-flex w-9 h-9 rounded-lg bg-crimson/15 border border-crimson/30 items-center justify-center text-crimson mb-3">
                  {v.icon}
                </span>
                <div className="text-white font-medium text-[14px] tracking-tight mb-1.5">
                  {v.title}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="px-6 pb-16 max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] uppercase tracking-[0.2em] text-crimson font-mono mb-2">
              The team
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-3">
              Builders, students, contributors.
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
              A small, focused team shipping fast — with deep roots in the
              student developer community.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEAM.map((m, i) => (
              <TeamCard key={m.name} m={m} idx={i} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-20 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="relative rounded-2xl border border-crimson/25 bg-gradient-to-br from-crimson/10 via-surface/40 to-surface/40 backdrop-blur-sm p-8 md:p-10 text-center overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-crimson/20 rounded-full blur-3xl pointer-events-none" />
            <h2 className="relative text-2xl md:text-3xl font-semibold tracking-tight text-white mb-3">
              Want to build the future of open source with us?
            </h2>
            <p className="relative text-muted-foreground max-w-md mx-auto mb-7 leading-relaxed">
              Get in touch — we&apos;re always happy to hear from contributors,
              maintainers, students, and partners.
            </p>
            <a
              href="/contact"
              className="relative inline-flex items-center gap-2 bg-crimson hover:bg-crimson-dark text-white px-6 py-3 rounded-lg font-medium transition-all glow-crimson hover:-translate-y-0.5"
            >
              Get in touch <FiArrowRight />
            </a>
          </motion.div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
