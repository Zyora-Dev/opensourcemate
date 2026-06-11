"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FiGithub, FiZap, FiCode, FiUsers, FiArrowRight,
  FiTerminal, FiGitPullRequest, FiSearch, FiCpu,
} from "react-icons/fi";
import {
  SiOpenai, SiReact, SiPython, SiNodedotjs, SiTypescript,
  SiRust, SiDocker, SiKubernetes, SiGraphql, SiNextdotjs,
} from "react-icons/si";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ThemeSwitch } from "@/components/ThemeSwitch";

const features = [
  { icon: <FiZap size={20} />,    title: "AI-Powered Matching",  desc: "Get matched with issues that fit your skills and interests instantly." },
  { icon: <FiCode size={20} />,   title: "Smart Code Context",   desc: "AI explains codebase context so you can contribute without friction." },
  { icon: <FiUsers size={20} />,  title: "Community Driven",     desc: "Connect with maintainers and contributors across the open source world." },
  { icon: <FiGithub size={20} />, title: "GitHub Native",        desc: "Seamlessly integrates with your GitHub workflow and repositories." },
];

const stats = [
  { value: "10k+", label: "Contributors" },
  { value: "2.4k", label: "Repositories" },
  { value: "48k",  label: "Issues matched" },
  { value: "97%",  label: "PR acceptance" },
];

const techLogos = [
  { icon: <SiReact />,      name: "React" },
  { icon: <SiTypescript />, name: "TypeScript" },
  { icon: <SiPython />,     name: "Python" },
  { icon: <SiNodedotjs />,  name: "Node.js" },
  { icon: <SiRust />,       name: "Rust" },
  { icon: <SiNextdotjs />,  name: "Next.js" },
  { icon: <SiDocker />,     name: "Docker" },
  { icon: <SiKubernetes />, name: "Kubernetes" },
  { icon: <SiGraphql />,    name: "GraphQL" },
];

const flow = [
  { icon: <FiSearch size={18} />,         title: "Discover",   desc: "AI surfaces issues matching your stack and experience level." },
  { icon: <FiCpu size={18} />,            title: "Understand", desc: "Get instant context on the codebase, tests, and conventions." },
  { icon: <FiGitPullRequest size={18} />, title: "Contribute", desc: "Open a clean PR with confidence — guided every step of the way." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Background layers */}
      <div className="fixed inset-0 grid-bg opacity-70 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-crimson/10 rounded-full blur-[120px] pointer-events-none" />

      <SiteHeader />

      {/* Hero */}
      <main className="flex-1 relative z-10">
        <section className="px-6 pt-20 pb-12 md:pt-28 md:pb-16 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-xs bg-crimson-muted text-crimson border border-crimson/25 rounded-full px-4 py-1.5 mb-8 font-mono backdrop-blur-sm">
              <SiOpenai size={12} /> AI-powered open source contributions
            </div>

            <div className="flex justify-center mb-8">
              <ThemeSwitch />
            </div>

            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6 leading-[1.04]">
              Open source contribution
              <br />
              <span className="text-crimson text-glow">made easier</span>{" "}
              <span className="text-muted-foreground/90 font-medium">and seamless</span>
              <br />
              with AI assistance
            </h1>

            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Find the right issues, understand codebases faster, and ship meaningful contributions —
              all with the power of AI at your side.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-crimson hover:bg-crimson-dark text-white px-6 py-3 rounded-lg font-medium transition-all glow-crimson hover:-translate-y-0.5"
              >
                Start Contributing <FiArrowRight />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 border border-border hover:border-crimson/40 hover:bg-surface text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                <FiGithub /> Continue with GitHub
              </Link>
            </div>
          </motion.div>

          {/* Code preview card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-16 md:mt-20 max-w-3xl mx-auto"
          >
            <div className="relative rounded-2xl border border-border bg-surface/80 backdrop-blur-md overflow-hidden shadow-[0_24px_80px_-20px_rgba(217,119,87,0.25)]">
              {/* dots */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]/80" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/80" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]/80" />
                <span className="ml-3 text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <FiTerminal size={11} /> opensourcemate ~ matched issue
                </span>
              </div>
              <div className="p-5 md:p-6 text-left font-mono text-[12.5px] leading-relaxed">
                <p>
                  <span className="text-muted-foreground">$</span>{" "}
                  <span className="text-white">osm find --skill react --good-first-issue</span>
                </p>
                <p className="text-muted-foreground mt-1">Searching 2,400+ repos…</p>
                <div className="mt-3 rounded-lg border border-border bg-background/60 p-3.5">
                  <p className="text-crimson">
                    facebook/react <span className="text-muted-foreground">· #29412</span>
                  </p>
                  <p className="text-white mt-1">
                    Add aria-label to <span className="text-crimson">{`<Suspense />`}</span> fallback elements
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5 text-[10.5px]">
                    <span className="px-2 py-0.5 rounded-md bg-crimson/10 text-crimson border border-crimson/25">good first issue</span>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">a11y</span>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">react</span>
                    <span className="ml-auto text-muted-foreground">match: <span className="text-crimson">94%</span></span>
                  </div>
                </div>
                <p className="mt-3">
                  <span className="text-muted-foreground">→</span>{" "}
                  <span className="text-white">osm explain</span>{" "}
                  <span className="text-crimson">29412</span>
                </p>
                <p className="text-muted-foreground mt-1">
                  AI: This issue touches{" "}
                  <span className="text-white">packages/react/src/Suspense.js</span>. The fix lives in the{" "}
                  <span className="text-white">renderFallback()</span> path…
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tech-logo trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 md:mt-20"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 mb-5">
              Works with the stacks you love
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-2xl text-muted-foreground/70">
              {techLogos.map((t, i) => (
                <motion.span
                  key={t.name}
                  title={t.name}
                  whileHover={{ scale: 1.15, color: "var(--color-crimson)" }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{
                    y: { duration: 3 + (i % 4) * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 },
                  }}
                  className="hover:text-crimson transition-colors cursor-default"
                >
                  {t.icon}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Stats strip */}
        <section className="px-6 py-10 md:py-14 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface px-6 py-7 text-center">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-white">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1.5 uppercase tracking-[0.15em]">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-14 md:py-20 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-crimson font-mono mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              From discovery to merged PR — <span className="text-crimson">guided by AI</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {flow.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative bg-surface border border-border rounded-2xl p-6 hover:border-crimson/30 transition-all"
              >
                <div className="absolute top-5 right-5 text-5xl font-mono font-bold text-crimson/10">
                  0{i + 1}
                </div>
                <div className="w-10 h-10 rounded-lg bg-crimson/10 border border-crimson/25 flex items-center justify-center text-crimson mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section className="px-6 py-14 md:py-16 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-crimson font-mono mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Built for contributors, by contributors
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="bg-surface border border-border rounded-xl p-5 hover:border-crimson/30 hover:bg-crimson/[0.03] transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 md:py-24 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-crimson/30 bg-gradient-to-br from-crimson/15 via-surface to-surface p-10 md:p-14 text-center"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-crimson/20 rounded-full blur-3xl pointer-events-none" />
            <h2 className="relative text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Ready to make your first contribution?
            </h2>
            <p className="relative text-muted-foreground max-w-md mx-auto mb-8">
              Join thousands of developers shipping meaningful open source work — faster, smarter, together.
            </p>
            <Link
              href="/register"
              className="relative inline-flex items-center gap-2 bg-crimson hover:bg-crimson-dark text-white px-7 py-3.5 rounded-lg font-medium transition-all glow-crimson hover:-translate-y-0.5"
            >
              Get Started Free <FiArrowRight />
            </Link>
          </motion.div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
