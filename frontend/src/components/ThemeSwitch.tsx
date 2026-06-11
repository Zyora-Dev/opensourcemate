"use client";

import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeSwitchProps {
  className?: string;
}

/** Segmented Dark / Light pill — used in the landing hero. */
export function ThemeSwitch({ className }: ThemeSwitchProps) {
  const { mounted, theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border bg-surface/40 backdrop-blur-sm p-1",
          className,
        )}
        style={{ height: 38 }}
      />
    );
  }

  const baseBtn =
    "inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[12.5px] font-medium transition-all";

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface/40 backdrop-blur-sm p-1",
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
        className={cn(
          baseBtn,
          theme === "dark"
            ? "bg-crimson text-white shadow-[0_4px_16px_-6px_rgba(217,119,87,0.55)]"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <FiMoon size={12} /> Dark
      </button>
      <button
        type="button"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
        className={cn(
          baseBtn,
          theme === "light"
            ? "bg-crimson text-white shadow-[0_4px_16px_-6px_rgba(217,119,87,0.55)]"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <FiSun size={12} /> Light
      </button>
    </div>
  );
}
