"use client";
import { motion } from "framer-motion";
import {
  SiReact,
  SiPython,
  SiNodedotjs,
  SiTypescript,
  SiRust,
  SiDocker,
  SiKubernetes,
  SiGit,
  SiGraphql,
  SiPostgresql,
  SiNextdotjs,
  SiTailwindcss,
} from "react-icons/si";
import { FiGithub, FiTerminal, FiCpu, FiPackage } from "react-icons/fi";

/**
 * Floating, drifting dev-icon backdrop.
 * Designed to sit behind content (parent should have `relative` + `overflow-hidden`).
 * Icons gently drift, rotate, and pulse — purely decorative.
 */

type Item = {
  icon: React.ReactNode;
  // position in % (0–100)
  top: string;
  left: string;
  size: number;
  // animation delays / durations
  delay: number;
  duration: number;
  // travel range in px
  drift: number;
  opacity?: number;
};

const items: Item[] = [
  { icon: <SiReact />,        top: "8%",  left: "12%", size: 30, delay: 0,   duration: 9,  drift: 14, opacity: 0.55 },
  { icon: <SiTypescript />,   top: "18%", left: "78%", size: 24, delay: 1.2, duration: 11, drift: 12, opacity: 0.45 },
  { icon: <SiPython />,       top: "32%", left: "6%",  size: 26, delay: 0.6, duration: 10, drift: 16, opacity: 0.5  },
  { icon: <SiNodedotjs />,    top: "40%", left: "85%", size: 28, delay: 2,   duration: 12, drift: 14, opacity: 0.5  },
  { icon: <SiRust />,         top: "55%", left: "16%", size: 26, delay: 1.5, duration: 10, drift: 12, opacity: 0.45 },
  { icon: <SiDocker />,       top: "62%", left: "72%", size: 30, delay: 0.8, duration: 11, drift: 18, opacity: 0.5  },
  { icon: <SiKubernetes />,   top: "78%", left: "10%", size: 26, delay: 2.4, duration: 13, drift: 14, opacity: 0.45 },
  { icon: <SiGraphql />,      top: "84%", left: "82%", size: 22, delay: 1.8, duration: 10, drift: 10, opacity: 0.4  },
  { icon: <SiPostgresql />,   top: "26%", left: "46%", size: 24, delay: 3,   duration: 12, drift: 16, opacity: 0.4  },
  { icon: <SiNextdotjs />,    top: "70%", left: "44%", size: 26, delay: 1,   duration: 11, drift: 14, opacity: 0.45 },
  { icon: <SiTailwindcss />,  top: "48%", left: "52%", size: 22, delay: 2.2, duration: 12, drift: 12, opacity: 0.35 },
  { icon: <SiGit />,          top: "12%", left: "60%", size: 22, delay: 0.4, duration: 10, drift: 12, opacity: 0.4  },
  { icon: <FiGithub />,       top: "88%", left: "30%", size: 22, delay: 2.8, duration: 11, drift: 12, opacity: 0.4  },
  { icon: <FiTerminal />,     top: "6%",  left: "38%", size: 22, delay: 1.6, duration: 10, drift: 14, opacity: 0.4  },
  { icon: <FiCpu />,          top: "58%", left: "34%", size: 22, delay: 0.2, duration: 11, drift: 12, opacity: 0.35 },
  { icon: <FiPackage />,      top: "36%", left: "66%", size: 22, delay: 2.6, duration: 12, drift: 14, opacity: 0.35 },
];

export default function FloatingDevIcons({
  className = "",
  tint = "text-crimson",
}: { className?: string; tint?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {items.map((it, i) => (
        <motion.span
          key={i}
          className={`absolute ${tint}`}
          style={{
            top: it.top,
            left: it.left,
            fontSize: it.size,
            opacity: it.opacity ?? 0.45,
          }}
          initial={{ y: 0, x: 0, rotate: 0, scale: 0.9 }}
          animate={{
            y: [0, -it.drift, 0, it.drift * 0.6, 0],
            x: [0, it.drift * 0.4, 0, -it.drift * 0.4, 0],
            rotate: [0, 6, 0, -6, 0],
            scale: [0.9, 1.05, 0.95, 1.02, 0.9],
          }}
          transition={{
            duration: it.duration,
            delay: it.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {it.icon}
        </motion.span>
      ))}
    </div>
  );
}
