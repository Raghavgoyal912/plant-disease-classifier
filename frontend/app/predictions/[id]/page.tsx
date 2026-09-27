"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  deletePrediction,
  getPrediction,
  PredictionRecord,
  sendFeedback,
} from "@/lib/api";
import { buildImageUrl } from "@/lib/storage";
import { formatLabel, formatPercent } from "@/lib/format";

export default function PredictionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [prediction, setPrediction] = useState<PredictionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(
    null
  );
  const [correctedLabel, setCorrectedLabel] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getPrediction(params.id)
      .then((record) => {
        setPrediction(record);
        // reflect any feedback already on file
        if (record.feedback_correct !== null && record.feedback_correct !== undefined) {
          setFeedbackCorrect(record.feedback_correct);
          setCorrectedLabel(record.corrected_label ?? "");
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Could not load prediction."
        )
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    if (!params.id) return;
    if (!window.confirm("Delete this prediction? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      await deletePrediction(params.id);
      router.push("/history");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete prediction."
      );
      setDeleting(false);
    }
  }

  async function handleFeedbackSubmit() {
    if (!params.id || feedbackCorrect === null) return;
    setFeedbackStatus(null);
    try {
      const updated = await sendFeedback(params.id, {
        correct: feedbackCorrect,
        corrected_label: feedbackCorrect
          ? undefined
          : correctedLabel || undefined,
      });
      setPrediction(updated);
      setFeedbackStatus("Thanks — feedback saved.");
    } catch (err) {
      setFeedbackStatus(
        err instanceof Error ? err.message : "Could not save feedback."
      );
    }
  }

  if (loading) return <p className="text-muted text-sm">Loading...</p>;
  if (error) return <p className="text-rust text-sm">{error}</p>;
  if (!prediction) return null;

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={buildImageUrl(prediction.image_path)}
          alt={prediction.predicted_label}
          className="w-full rounded border border-line"
        />
      </section>

      <section>
        <Link href="/history" className="text-sm text-muted hover:text-forest">
          &larr; Back to history
        </Link>
        <h1 className="font-serif text-2xl text-forestDark mt-2 mb-1">
          {formatLabel(prediction.predicted_label)}
        </h1>
        <p className="text-sm text-muted mb-4">
          {formatPercent(prediction.confidence)} confidence
          {` · ${new Date(prediction.created_at).toLocaleString()}`}
        </p>

        {prediction.is_uncertain && (
          <div className="mb-4 rounded border border-ochre/40 bg-ochre/10 px-3 py-2 text-sm text-ochre">
            This prediction was below the confidence threshold.
          </div>
        )}

        <div className="rounded border border-line bg-surface p-4 mb-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-2">
            Top 3
          </p>
          <ul className="space-y-1 text-sm">
            {prediction.top3.map((item) => (
              <li key={item.label} className="flex justify-between">
                <span>{formatLabel(item.label)}</span>
                <span className="text-muted">
                  {formatPercent(item.confidence)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Model version: {prediction.model_version}
          </p>
        </div>

        <div className="rounded border border-line bg-surface p-4 mb-4">
          <p className="text-sm mb-2">Was this prediction correct?</p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setFeedbackCorrect(true)}
              className={`rounded border px-3 py-1 text-sm ${
                feedbackCorrect === true
                  ? "bg-forest text-white border-forest"
                  : "border-line"
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setFeedbackCorrect(false)}
              className={`rounded border px-3 py-1 text-sm ${
                feedbackCorrect === false
                  ? "bg-rust text-white border-rust"
                  : "border-line"
              }`}
            >
              No
            </button>
          </div>

          {feedbackCorrect === false && (
            <input
              type="text"
              placeholder="Correct label (optional)"
              value={correctedLabel}
              onChange={(e) => setCorrectedLabel(e.target.value)}
              className="mb-3 w-full rounded border border-line px-3 py-1.5 text-sm"
            />
          )}

          <button
            onClick={handleFeedbackSubmit}
            disabled={feedbackCorrect === null}
            className="rounded bg-forest px-4 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Submit feedback
          </button>
          {feedbackStatus && (
            <p className="mt-2 text-xs text-muted">{feedbackStatus}</p>
          )}
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-rust hover:underline disabled:opacity-40"
        >
          {deleting ? "Deleting..." : "Delete this prediction"}
        </button>
      </section>
    </div>
  );
}
