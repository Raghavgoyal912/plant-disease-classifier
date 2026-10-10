"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getStats, StatsResponse } from "@/lib/api";
import { formatLabel, formatPercent } from "@/lib/format";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { StatTile } from "@/components/StatTile";

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await getStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative w-full flex-1">
      <div className="relative z-10 w-full">
        <h1 className="mb-8 text-left font-typewriter text-4xl font-normal tracking-tight text-text sm:text-5xl md:text-6xl">
          Your stats.
        </h1>

        {loading && (
          <div className="py-12 text-center text-sm text-text/70">
            <p className="mb-2 font-typewriter text-lg text-text">Loading...</p>
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto my-8 max-w-md rounded-2xl border border-leaf/20 bg-surface-raised p-8 text-center">
            <p className="mb-2 font-typewriter text-lg text-text">
              Couldn't load your stats
            </p>
            <p className="mb-4 text-sm text-text/70">{error}</p>
            <button
              type="button"
              onClick={() => load()}
              className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-text transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && stats && stats.total_scans === 0 && (
          <div className="mx-auto my-8 max-w-md rounded-2xl border border-leaf/15 bg-surface-raised p-12 text-center">
            <p className="mb-2 font-typewriter text-2xl font-normal text-text">
              Nothing here yet.
            </p>
            <p className="mb-6 text-sm font-normal text-text/70">
              Scan a leaf and your numbers will show up here.
            </p>
            <Link
              href="/"
              className="inline-block rounded-full bg-accent px-8 py-3 text-sm font-medium text-text transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Classify a leaf
            </Link>
          </div>
        )}

        {!loading && !error && stats && stats.total_scans > 0 && (
          <StatsBody stats={stats} />
        )}
      </div>
    </div>
  );
}

function StatsBody({ stats }: { stats: StatsResponse }) {
  const total = stats.total_scans;
  const uncertainRate = stats.uncertain_scans / total;
  const answered = stats.feedback_yes + stats.feedback_no;
  const correctRate = answered > 0 ? stats.feedback_yes / answered : null;
  const maxCount = Math.max(1, ...stats.top_diseases.map((d) => d.count));

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatTile index={0} value={String(total)} label="Scans" />
        <StatTile
          index={1}
          value={formatPercent(uncertainRate)}
          label="Not sure"
          note={`${stats.uncertain_scans} of ${total} scans`}
        />
        <StatTile
          index={2}
          value={correctRate === null ? "—" : formatPercent(correctRate)}
          label="Marked correct"
          note={
            correctRate === null
              ? "No feedback yet"
              : `${stats.feedback_yes} of ${answered} answers`
          }
        />
      </div>

      <section className="mt-10 rounded-3xl border border-leaf/15 bg-card/40 p-6 text-left sm:p-8">
        <h2 className="mb-1 font-typewriter text-2xl font-normal text-text">
          Most scanned
        </h2>
        <p className="mb-5 text-xs text-text/70">Confident scans only.</p>

        {stats.top_diseases.length === 0 ? (
          <p className="text-sm text-text/70">No confident scans yet.</p>
        ) : (
          <ul className="space-y-4">
            {stats.top_diseases.map((item, idx) => (
              <li key={item.label} className="text-sm">
                <div className="mb-1 flex justify-between gap-4 text-text/80">
                  <span className="truncate">{formatLabel(item.label)}</span>
                  <span className="font-medium text-text">{item.count}</span>
                </div>
                <ConfidenceBar
                  confidence={item.count / maxCount}
                  delay={0.2 + idx * 0.08}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
