"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";
import { ThemeToggle } from "./ThemeToggle";

// Public routes — no shell, render children bare
const PUBLIC_PREFIXES = ["/login", "/register", "/onboarding", "/forgot-password", "/contact", "/about", "/admin-panel"];

// Pages whose own chrome (SiteHeader / AppShell) already includes a theme toggle.
// On every other public page we render a floating one so the toggle is reachable everywhere.
const HAS_OWN_HEADER = ["/contact", "/about", "/admin-panel"];

function FloatingToggle() {
  return (
    <div className="fixed top-4 right-4 z-[60] sm:top-5 sm:right-5">
      <ThemeToggle size="sm" className="shadow-lg backdrop-blur-md bg-background/80" />
    </div>
  );
}

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  // Landing page has its own SiteHeader with a toggle
  if (pathname === "/") return <>{children}</>;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const hasOwnHeader = HAS_OWN_HEADER.some((p) => pathname.startsWith(p));
    return (
      <>
        {!hasOwnHeader && <FloatingToggle />}
        {children}
      </>
    );
  }

  return <AppShell>{children}</AppShell>;
}
