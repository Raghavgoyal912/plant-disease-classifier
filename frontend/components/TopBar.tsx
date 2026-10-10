"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
  const isClassify = pathname === "/";
  const isHistory = pathname === "/history" || pathname.startsWith("/predictions");
  const isStats = pathname === "/stats";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-leaf/20 bg-surface-raised/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-typewriter text-xl font-normal text-text tracking-tight transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" className="h-7 w-7" />
          <span>PatraVyadhi</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className={`py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded ${
              isClassify
                ? "text-text font-medium relative after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-accent"
                : "text-text/70 hover:text-text"
            }`}
          >
            Classify
          </Link>
          <Link
            href="/history"
            className={`py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded ${
              isHistory
                ? "text-text font-medium relative after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-accent"
                : "text-text/70 hover:text-text"
            }`}
          >
            History
          </Link>
          <Link
            href="/stats"
            className={`py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded ${
              isStats
                ? "text-text font-medium relative after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-accent"
                : "text-text/70 hover:text-text"
            }`}
          >
            Stats
          </Link>
        </nav>
      </div>
    </header>
  );
}