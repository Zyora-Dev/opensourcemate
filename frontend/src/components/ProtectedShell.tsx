"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

// Public routes — no shell, render children bare
const PUBLIC_PREFIXES = ["/login", "/register", "/onboarding", "/forgot-password", "/contact"];

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (pathname === "/") return <>{children}</>;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return <AppShell>{children}</AppShell>;
}
