"use client";

import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { mounted, theme, toggleTheme } = useTheme();
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const icon = size === "sm" ? 14 : 15;

  if (!mounted) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center rounded-lg border border-border bg-surface/40 text-muted-foreground",
          dim,
          className,
        )}
      />
    );
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-border bg-surface/40 hover:bg-surface text-muted-foreground hover:text-foreground transition-colors",
        dim,
        className,
      )}
    >
      {isDark ? <FiSun size={icon} /> : <FiMoon size={icon} />}
    </button>
  );
}
