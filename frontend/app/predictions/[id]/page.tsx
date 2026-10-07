"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  deletePrediction,
  getDiseaseInfo,
  getPrediction,
  Advice,
  PredictionRecord,
  sendFeedback,
} from "@/lib/api";
import { buildImageUrl } from "@/lib/storage";
import { formatLabel, formatPercent } from "@/lib/format";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { AdviceTabs } from "@/components/AdviceTabs";

export default function PredictionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [prediction, setPrediction] = useState<PredictionRecord | null>(null);
  const [advice, setAdvice] = useState<Advice | null>(null);
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
        if (
          record.feedback_correct !== null &&
          record.feedback_correct !== undefined
        ) {
          setFeedbackCorrect(record.feedback_correct);
          setCorrectedLabel(record.corrected_label ?? "");
        }
        if (!record.is_uncertain) {
          getDiseaseInfo(record.predicted_label)
            .then((adv) => setAdvice(adv))
            .catch(() => setAdvice(null));
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

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="font-typewriter text-lg text-text">Loading specimen dossier...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-leaf/20 bg-surface-raised p-8 text-center my-8">
        <p className="font-typewriter text-lg text-text mb-2">Unable to load specimen</p>
        <p className="text-sm text-text/70 mb-4">{error}</p>
        <Link
          href="/history"
          className="inline-block rounded-full bg-accent px-6 py-2 text-sm font-medium text-text hover:brightness-105 active:scale-95 transition-all"
        >
          Back to history
        </Link>
      </div>
    );
  }

  if (!prediction) return null;

  const imageUrl = buildImageUrl(prediction.image_path);

  return (
    <div className="relative w-full flex-1">
      {/* Quiet floating decor */}
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -6, 0], rotate: [-8, -12, -8] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="pointer-events-none absolute -top-6 right-2 sm:right-10 select-none z-0 hidden sm:block w-24 h-24"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/decor/droplet.png"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain opacity-75"
        />
      </motion.div>

      <div className="relative z-10 w-full">
        {/* Navigation & Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs text-text/70 transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf rounded py-1"
          >
            <span>&larr;</span>
            <span>Back to history</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-leaf/20 bg-surface-raised px-3 py-1 text-xs text-leaf font-medium">
              Archived dossier
            </span>
          </div>
        </div>

        {/* Title & Headline */}
        <header className="mb-8 text-left">
          <p className="text-xs uppercase tracking-widest text-text/60 font-medium mb-1">
            Diagnostic identification record
          </p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="font-typewriter text-3xl sm:text-4xl md:text-5xl text-text font-normal tracking-tight text-left capitalize"
          >
            {formatLabel(prediction.predicted_label)}
          </motion.h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text/70">
            <span className="font-typewriter">
              {new Date(prediction.created_at).toLocaleString()}
            </span>
            <span>&bull;</span>
            <span>Model {prediction.model_version}</span>
          </div>
        </header>

        {/* Uncertain Banner */}
        {prediction.is_uncertain && (
          <div className="mb-6 rounded-2xl border border-accent/40 bg-accent/15 px-4 py-3 text-sm text-text">
            This prediction was below the diagnostic confidence threshold. The identification may be indeterminate.
          </div>
        )}

        {/* 2-Column Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Specimen Image Viewport */}
          <div className="lg:col-span-7 flex flex-col rounded-3xl border border-leaf/15 bg-surface-raised p-4">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-background relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src={imageUrl}
                alt={prediction.predicted_label}
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-3 flex items-center justify-between px-1 text-xs text-text/60">
              <span>Specimen capture</span>
              <span className="font-typewriter">PV-REC</span>
            </div>
          </div>

          {/* Right Column: Lilac Assessment Card & Diagnostics */}
          <div className="lg:col-span-5 flex flex-col gap-6 rounded-3xl border border-leaf/15 bg-card/60 p-6 sm:p-8">
            {/* Neural Confidence Gauge */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-text/60 font-medium">
                  Neural confidence
                </span>
                <span className="font-typewriter text-2xl text-text font-normal">
                  {formatPercent(prediction.confidence)}
                </span>
              </div>
              <ConfidenceBar confidence={prediction.confidence} />
            </div>

            {/* Top 3 Alternative Candidates */}
            <div className="rounded-2xl border border-leaf/15 bg-surface-raised/80 p-4 text-left">
              <span className="text-xs uppercase tracking-wider text-text/60 font-medium block mb-3">
                Differential diagnostics
              </span>
              <ul className="space-y-3">
                {prediction.top3.map((item, idx) => (
                  <li key={item.label} className="text-xs">
                    <div className="flex justify-between text-text/80 mb-1">
                      <span>{formatLabel(item.label)}</span>
                      <span className="font-medium text-text">
                        {formatPercent(item.confidence)}
                      </span>
                    </div>
                    <ConfidenceBar confidence={item.confidence} delay={0.15 + idx * 0.1} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Advice Tabs (when cached advice is available) */}
            {advice && (
              <div className="rounded-2xl border border-leaf/15 bg-surface-raised/80 p-4 text-left">
                <AdviceTabs advice={advice} />
              </div>
            )}

            {/* Field Verification / Feedback Box */}
            <div className="rounded-2xl border border-leaf/15 bg-surface-raised/80 p-4 text-left">
              <p className="text-xs uppercase tracking-wider text-text/60 font-medium mb-3">
                Field verification: was this accurate?
              </p>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setFeedbackCorrect(true)}
                  className={`rounded-full px-4 py-1.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf ${
                    feedbackCorrect === true
                      ? "bg-leaf text-surface-raised font-medium border border-leaf shadow-sm"
                      : "bg-surface-raised text-text border border-leaf/25 hover:bg-background"
                  }`}
                >
                  Yes, accurate
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackCorrect(false)}
                  className={`rounded-full px-4 py-1.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf ${
                    feedbackCorrect === false
                      ? "bg-accent text-text font-medium border border-accent shadow-sm"
                      : "bg-surface-raised text-text border border-leaf/25 hover:bg-background"
                  }`}
                >
                  No, incorrect
                </button>
              </div>

              {feedbackCorrect === false && (
                <input
                  type="text"
                  placeholder="Correct label (optional)"
                  value={correctedLabel}
                  onChange={(e) => setCorrectedLabel(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-leaf/20 bg-background px-3 py-1.5 text-xs text-text placeholder:text-text/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
                />
              )}

              {feedbackCorrect !== null && (
                <button
                  type="button"
                  onClick={handleFeedbackSubmit}
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-text hover:brightness-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
                >
                  Submit feedback
                </button>
              )}

              {feedbackStatus && (
                <p className="mt-2 text-xs text-leaf font-medium">{feedbackStatus}</p>
              )}
            </div>

            {/* Quiet Delete Control */}
            <div className="border-t border-text/10 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-text/60 hover:text-text hover:underline transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-leaf"
              >
                {deleting ? "Deleting..." : "Delete specimen"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
