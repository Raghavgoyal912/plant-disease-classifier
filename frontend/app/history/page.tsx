"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { listPredictions, PredictionRecord } from "@/lib/api";
import { PredictionCard } from "@/components/PredictionCard";

const PAGE_SIZE = 9;

export default function HistoryPage() {
  const [items, setItems] = useState<PredictionRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [labelFilter, setLabelFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPredictions({
        page,
        page_size: PAGE_SIZE,
        label: labelFilter || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load history."
      );
    } finally {
      setLoading(false);
    }
  }, [page, labelFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="relative w-full flex-1">
      {/* Quiet floating decor in top-right */}
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -8, 0], rotate: [8, 12, 8] }}
        transition={{ duration: 7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="pointer-events-none absolute -top-4 right-2 sm:right-6 select-none z-0 hidden sm:block w-28 h-28"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/decor/leaf.png"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain opacity-80"
        />
      </motion.div>

      <div className="relative z-10 w-full">
        {/* Header */}
        <header className="mb-8 text-left">
          <div className="flex items-center gap-2 text-leaf text-xs font-medium tracking-wide mb-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>Herbarium archive</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h1 className="font-typewriter text-4xl sm:text-5xl md:text-6xl text-text font-normal tracking-tight text-left">
              Your scans.
            </h1>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Filter by label..."
                value={labelFilter}
                onChange={(e) => {
                  setPage(1);
                  setLabelFilter(e.target.value);
                }}
                className="w-full rounded-2xl border border-leaf/20 bg-surface-raised px-4 py-2.5 text-sm text-text placeholder:text-text/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all"
              />
            </div>
          </div>
        </header>

        {/* Loading state */}
        {loading && (
          <div className="py-12 text-center text-sm text-text/70">
            <p className="font-typewriter text-lg text-text mb-2">Loading scans...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-2xl border border-leaf/20 bg-surface-raised p-8 text-center max-w-md mx-auto my-8">
            <p className="font-typewriter text-lg text-text mb-2">Unable to load history</p>
            <p className="text-sm text-text/70 mb-4">{error}</p>
            <button
              onClick={() => load()}
              className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-text hover:brightness-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-leaf/15 bg-surface-raised p-12 text-center max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-card/60 mx-auto flex items-center justify-center mb-4 text-leaf font-typewriter text-xl">
              🍂
            </div>
            <p className="font-typewriter text-2xl text-text font-normal mb-2">
              Nothing here yet.
            </p>
            <p className="text-sm text-text/70 mb-6 font-normal">
              Upload a leaf specimen to begin building your pathology archive.
            </p>
            <Link
              href="/"
              className="inline-block rounded-full bg-accent px-8 py-3 text-sm font-medium text-text hover:brightness-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Classify a leaf
            </Link>
          </div>
        )}

        {/* Grid of lilac cards */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
            {items.map((item, idx) => (
              <PredictionCard key={item.id} prediction={item} index={idx} />
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {!loading && !error && items.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-leaf/15 pt-4 text-sm text-text/70">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-leaf/20 bg-surface-raised px-4 py-2 text-text transition-all hover:bg-background active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            >
              Previous
            </button>
            <span className="font-typewriter text-xs text-text/80">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-leaf/20 bg-surface-raised px-4 py-2 text-text transition-all hover:bg-background active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
