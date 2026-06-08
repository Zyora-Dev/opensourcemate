"use client";

import Link from "next/link";
import { FiArrowRight, FiCode } from "react-icons/fi";

export function SiteHeader() {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-crimson/15 border border-crimson/30 flex items-center justify-center text-crimson">
            <FiCode size={14} />
          </span>
          <span className="text-white text-[15px] font-semibold tracking-tight">
            OpenSource<span className="text-crimson">Mate</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/about"
            className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-white transition-colors px-4 py-2"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-white transition-colors px-4 py-2"
          >
            Contact
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-sm bg-crimson hover:bg-crimson-dark text-white px-4 py-2 rounded-lg transition-all font-medium shadow-[0_4px_20px_-4px_rgba(217,119,87,0.5)]"
          >
            Get Started <FiArrowRight size={14} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
