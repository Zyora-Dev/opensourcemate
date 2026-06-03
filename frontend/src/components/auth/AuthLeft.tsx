"use client";
import { motion } from "framer-motion";
import { FiGithub, FiZap, FiCode, FiShield } from "react-icons/fi";
import { SiOpenai } from "react-icons/si";
import FloatingDevIcons from "./FloatingDevIcons";

const perks = [
  { icon: <FiZap size={16} />, text: "AI matches you with perfect issues" },
  { icon: <FiCode size={16} />, text: "Smart codebase context on demand" },
  { icon: <FiGithub size={16} />, text: "Native GitHub integration" },
  { icon: <FiShield size={16} />, text: "Trusted by 10k+ contributors" },
];

interface Props {
  heading: string;
  sub: string;
}

export default function AuthLeft({ heading, sub }: Props) {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-12 bg-surface border-r border-border relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Floating dev icons */}
      <FloatingDevIcons />

      {/* Glow orb */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-crimson/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-crimson/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-16">
          <span className="w-7 h-7 rounded-md bg-crimson/15 border border-crimson/30 flex items-center justify-center text-crimson">
            <FiCode size={14} />
          </span>
          <span className="text-white font-semibold text-[15px] tracking-tight">OpenSource<span className="text-crimson">Mate</span></span>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 text-xs bg-crimson/10 text-crimson border border-crimson/25 rounded-full px-3 py-1 mb-6 font-mono backdrop-blur-sm">
            <SiOpenai size={11} /> Powered by AI
          </div>
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight mb-4">{heading}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">{sub}</p>
        </motion.div>
      </div>

      <div className="relative z-10 space-y-3 bg-surface/60 backdrop-blur-sm rounded-xl p-4 border border-border/60 max-w-sm">
        {perks.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * i + 0.3 }}
            className="flex items-center gap-3 text-sm text-muted-foreground"
          >
            <span className="text-crimson">{p.icon}</span>
            {p.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
