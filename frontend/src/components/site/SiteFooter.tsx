"use client";

import Link from "next/link";
import { FiCode, FiGithub } from "react-icons/fi";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-crimson/15 border border-crimson/30 flex items-center justify-center text-crimson">
            <FiCode size={10} />
          </span>
          <span>© 2026 OpenSourceMate</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/login" className="hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-white transition-colors">
            Get started
          </Link>
          <a
            href="https://github.com/ramyacm23/OpenSourceMate"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <FiGithub size={12} /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
