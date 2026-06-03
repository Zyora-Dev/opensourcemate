"use client";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiX, FiZap } from "react-icons/fi";

type Variant = "success" | "error" | "welcome";

interface Props {
  show: boolean;
  variant: Variant;
  title: string;
  message?: string;
  /** Optional sub-line shown under the message. */
  hint?: string;
}

const palette: Record<Variant, { ring: string; bg: string; border: string; icon: React.ReactNode; iconColor: string; glow: string }> = {
  success: {
    ring: "ring-crimson/30",
    bg: "bg-crimson/15",
    border: "border-crimson/40",
    icon: <FiCheck size={42} strokeWidth={3} />,
    iconColor: "text-crimson",
    glow: "shadow-[0_0_60px_rgba(217,119,87,0.45)]",
  },
  error: {
    ring: "ring-red-500/30",
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    icon: <FiX size={42} strokeWidth={3} />,
    iconColor: "text-red-400",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.45)]",
  },
  welcome: {
    ring: "ring-crimson/30",
    bg: "bg-crimson/15",
    border: "border-crimson/40",
    icon: <FiZap size={42} strokeWidth={2.5} />,
    iconColor: "text-crimson",
    glow: "shadow-[0_0_60px_rgba(217,119,87,0.45)]",
  },
};

export default function StatusOverlay({ show, variant, title, message, hint }: Props) {
  const p = palette[variant];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={`relative w-[90%] max-w-sm rounded-2xl border ${p.border} bg-surface p-8 text-center ${p.glow}`}
          >
            {/* Animated halo */}
            <motion.div
              className={`absolute inset-0 rounded-2xl ring-1 ${p.ring} pointer-events-none`}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Icon disc */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.05 }}
              className={`relative mx-auto mb-5 w-20 h-20 rounded-full ${p.bg} ${p.iconColor} flex items-center justify-center`}
            >
              {/* Pulsing rings */}
              <motion.span
                className={`absolute inset-0 rounded-full ${p.bg}`}
                animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className={`absolute inset-0 rounded-full ${p.bg}`}
                animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
              <motion.span
                initial={{ scale: 0, rotate: variant === "error" ? -90 : 0 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.18 }}
                className="relative"
              >
                {p.icon}
              </motion.span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-semibold tracking-tight mb-1.5"
            >
              {title}
            </motion.h3>
            {message && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {message}
              </motion.p>
            )}
            {hint && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 mt-4"
              >
                {hint}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
