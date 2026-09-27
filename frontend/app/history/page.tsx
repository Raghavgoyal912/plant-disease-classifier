"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listPredictions, PredictionRecord } from "@/lib/api";
import { buildImageUrl } from "@/lib/storage";
import { formatLabel, formatPercent } from "@/lib/format";

const PAGE_SIZE = 10;

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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-serif text-3xl text-forestDark">History</h1>
        <input
          type="text"
          placeholder="Filter by label..."
          value={labelFilter}
          onChange={(e) => {
            setPage(1);
            setLabelFilter(e.target.value);
          }}
          className="rounded border border-line px-3 py-1.5 text-sm bg-surface"
        />
      </div>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}
      {loading && <p className="text-muted text-sm mb-4">Loading...</p>}
      {!loading && items.length === 0 && (
        <p className="text-muted text-sm mb-4">No predictions yet.</p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-line border border-line rounded bg-surface">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/predictions/${item.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-canvas transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={buildImageUrl(item.image_path)}
                  alt={item.predicted_label}
                  className="h-12 w-12 rounded object-cover flex-shrink-0 border border-line"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{formatLabel(item.predicted_label)}</p>
                  <p className="text-xs text-muted">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                {item.is_uncertain && (
                  <span className="text-xs text-ochre flex-shrink-0">uncertain</span>
                )}
                <span className="text-sm text-muted flex-shrink-0">
                  {formatPercent(item.confidence)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded border border-line px-3 py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-muted">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded border border-line px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
