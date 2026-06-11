"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  mounted: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "osm-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.dataset.theme = theme;
}

function getThemeFromDom(): Theme | null {
  if (typeof document === "undefined") return null;
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : null;
}

function resolvePreferredTheme(): Theme {
  const dom = getThemeFromDom();
  if (dom) return dom;
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Dark-first: ignore system preference, default to dark on first visit.
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [theme, setThemeState] = useState<Theme>(() => resolvePreferredTheme());

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }, [mounted, theme]);

  // Auto-track system theme only if user hasn't picked one.
  // Dark-first: we default to dark (not system), so this is a no-op unless
  // someone manually clears the storage key. Kept for completeness.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return;
      // No stored value — dark-first policy still wins.
      applyTheme("dark");
      setThemeState("dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mounted,
      setTheme: (t) => setThemeState(t),
      toggleTheme: () => setThemeState((c) => (c === "dark" ? "light" : "dark")),
    }),
    [mounted, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
