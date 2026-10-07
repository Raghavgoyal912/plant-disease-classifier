"use client";

import { useState } from "react";
import { predict, ApiError, PredictResponse } from "@/lib/api";
import { formatLabel, formatPercent } from "@/lib/format";
import { Decor } from "@/components/Decor";
import { AnalyzingLine } from "@/components/AnalyzingLine";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { AdviceTabs } from "@/components/AdviceTabs";
import { motion, AnimatePresence } from "motion/react";

export default function ClassifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotLeaf, setIsNotLeaf] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function resetState() {
    setFile(null);
    setPreviewUrl(null);
    setLoading(false);
    setError(null);
    setIsNotLeaf(false);
    setResult(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError(null);
    setIsNotLeaf(false);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped);
      setResult(null);
      setError(null);
      setIsNotLeaf(false);
      setPreviewUrl(URL.createObjectURL(dropped));
    }
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setIsNotLeaf(false);
    setResult(null);
    try {
      const data = await predict(file);
      setResult(data);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === "not_a_leaf" || err.status === 422)
      ) {
        setIsNotLeaf(true);
        setError(err.message || "That doesn't look like a leaf.");
      } else if (err instanceof Error) {
        setIsNotLeaf(false);
        setError(err.message);
      } else {
        setIsNotLeaf(false);
        setError("Something went wrong talking to the backend.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full flex-1 flex flex-col justify-center">
      <Decor />

      <div className="relative z-10 w-full max-w-4xl mx-auto py-4 sm:py-8">
        {/* Editorial Headline */}
        <header className="mb-8 md:mb-12 text-left">
          <div className="flex items-center gap-2 text-leaf text-xs font-medium tracking-wide mb-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>Botanical pathology engine</span>
          </div>
          <h1 className="font-typewriter text-4xl sm:text-5xl md:text-6xl text-text font-normal tracking-tight text-left">
            Know your leaf.
          </h1>
          <p className="text-text/70 text-base sm:text-lg font-normal text-left mt-2">
            Upload a photo. Get a diagnosis.
          </p>
        </header>

        {/* State Canvas */}
        <div className="w-full">
          {/* 1. Analyzing State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full bg-surface-raised rounded-2xl p-8 sm:p-12 md:p-16 text-center border border-leaf/15 max-w-2xl mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-background mx-auto flex items-center justify-center mb-6">
                <span className="w-3 h-3 rounded-full bg-accent" />
              </div>
              <h2 className="font-typewriter text-2xl sm:text-3xl text-text font-normal mb-2 text-center">
                Analyzing specimen...
              </h2>
              <p className="text-sm text-text/70 max-w-sm mx-auto text-center font-normal">
                Segmenting leaf contours and computing diagnostic patterns.
              </p>
              <AnalyzingLine />
            </motion.div>
          )}

          {/* 2. Not a Leaf 422 State */}
          {!loading && isNotLeaf && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full bg-surface-raised rounded-2xl p-8 sm:p-12 text-center border border-leaf/20 max-w-xl mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-card/60 mx-auto flex items-center justify-center mb-6">
                <span className="font-typewriter text-2xl text-text">✕</span>
              </div>
              <span className="text-xs uppercase tracking-wider text-text/60 font-medium block mb-2 text-center">
                Non-botanical specimen
              </span>
              <h2 className="font-typewriter text-2xl sm:text-3xl text-text font-normal mb-3 text-center">
                That doesn't look like a leaf.
              </h2>
              <p className="text-sm text-text/70 max-w-md mx-auto mb-8 text-center font-normal">
                {error && error !== "That doesn't look like a leaf."
                  ? error
                  : "No botanical leaf structure or chlorophyll patterns were detected. Please upload a clear photo of a plant leaf."}
              </p>
              <button
                type="button"
                onClick={resetState}
                className="bg-accent text-text px-8 py-3 rounded-full font-medium hover:brightness-105 active:scale-95 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Try again
              </button>
            </motion.div>
          )}

          {/* 3. Generic Error State */}
          {!loading && error && !isNotLeaf && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full bg-surface-raised rounded-2xl p-8 sm:p-12 text-center border border-leaf/20 max-w-xl mx-auto"
            >
              <h2 className="font-typewriter text-xl sm:text-2xl text-text font-normal mb-3 text-center">
                Unable to complete diagnosis
              </h2>
              <p className="text-sm text-text/70 max-w-md mx-auto mb-6 text-center font-normal">
                {error}
              </p>
              <button
                type="button"
                onClick={resetState}
                className="bg-accent text-text px-8 py-3 rounded-full font-medium hover:brightness-105 active:scale-95 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Try again
              </button>
            </motion.div>
          )}

          {/* 4. Uncertain State */}
          {!loading && !error && result && result.is_uncertain && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full bg-card/40 rounded-2xl p-8 sm:p-12 text-center border border-leaf/20 max-w-2xl mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-surface-raised mx-auto flex items-center justify-center mb-6">
                <span className="font-typewriter text-2xl text-text">?</span>
              </div>
              <span className="text-xs uppercase tracking-wider text-text/60 font-medium block mb-2 text-center">
                Indeterminate diagnosis
              </span>
              <h2 className="font-typewriter text-3xl sm:text-4xl text-text font-normal mb-3 text-center">
                We're not sure.
              </h2>
              <p className="text-sm text-text/70 max-w-md mx-auto mb-8 text-center font-normal">
                Try a clearer, closer photo of a single leaf in good light.
              </p>

              {previewUrl && (
                <div className="mx-auto mb-8 max-w-xs overflow-hidden rounded-xl border border-leaf/20 bg-surface-raised p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <motion.img
                    src={previewUrl}
                    alt="Uploaded leaf specimen"
                    initial={{ scale: 0.94, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </div>
              )}

              <div className="mb-8 text-left bg-surface-raised/80 rounded-xl p-4 sm:p-6 max-w-md mx-auto border border-leaf/15">
                <span className="text-xs font-medium uppercase tracking-wide text-text/60 block mb-3 text-left">
                  Closest possibilities
                </span>
                <div className="space-y-3">
                  {result.top3.map((item, idx) => (
                    <div key={item.label} className="text-xs">
                      <div className="flex justify-between text-text/80 mb-1">
                        <span>{formatLabel(item.label)}</span>
                        <span className="font-medium text-text/90">
                          {formatPercent(item.confidence)}
                        </span>
                      </div>
                      <ConfidenceBar
                        confidence={item.confidence}
                        delay={0.1 * idx}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={resetState}
                className="bg-accent text-text px-8 py-3 rounded-full font-medium hover:brightness-105 active:scale-95 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Scan another leaf
              </button>
            </motion.div>
          )}

          {/* 5. Diagnosis Result State */}
          {!loading && !error && result && !result.is_uncertain && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
              {/* Left Column: Specimen Image */}
              <div className="lg:col-span-5 bg-surface-raised rounded-2xl p-4 border border-leaf/15 flex flex-col justify-between">
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-background relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <motion.img
                    src={previewUrl || result.image_url}
                    alt={formatLabel(result.label)}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="h-full w-full object-cover rounded-xl"
                  />
                </div>
                <div className="pt-3 px-1 flex items-center justify-between text-xs text-text/60">
                  <span>Specimen diagnosis</span>
                  <span>Model {result.model_version}</span>
                </div>
              </div>

              {/* Right Column: Diagnosis & Monograph */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="lg:col-span-7 bg-card/40 rounded-2xl p-6 sm:p-8 border border-leaf/15 flex flex-col justify-between"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-leaf/15 text-leaf text-xs font-medium uppercase tracking-wide mb-3">
                    <span>Pathology identified</span>
                  </div>

                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="font-typewriter text-2xl sm:text-3xl md:text-4xl text-text font-normal tracking-tight text-left capitalize mb-4"
                  >
                    {formatLabel(result.label)}
                  </motion.h2>

                  {/* Confidence metric */}
                  <div className="mb-6 bg-surface-raised/80 rounded-xl p-4 border border-leaf/15 text-left">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider text-text/60 font-medium">
                        Model confidence
                      </span>
                      <span className="font-typewriter text-xl sm:text-2xl font-normal text-text">
                        {formatPercent(result.confidence)}
                      </span>
                    </div>
                    <ConfidenceBar
                      confidence={result.confidence}
                      delay={0.25}
                    />
                  </div>

                  {/* Top 3 Alternatives */}
                  <div className="mb-6 bg-surface-raised/80 rounded-xl p-4 border border-leaf/15 text-left">
                    <span className="text-xs uppercase tracking-wider text-text/60 font-medium block mb-3 text-left">
                      Alternative candidates
                    </span>
                    <div className="space-y-3">
                      {result.top3.map((item, idx) => (
                        <div key={item.label} className="text-xs">
                          <div className="flex justify-between text-text/80 mb-1">
                            <span>{formatLabel(item.label)}</span>
                            <span className="font-medium text-text/90">
                              {formatPercent(item.confidence)}
                            </span>
                          </div>
                          <ConfidenceBar
                            confidence={item.confidence}
                            delay={0.3 + 0.1 * idx}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advice Tabs (if present) */}
                  {result.advice && (
                    <div className="mb-6 bg-surface-raised/80 rounded-xl p-4 border border-leaf/15 text-left">
                      <AdviceTabs advice={result.advice} />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-leaf/15 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={resetState}
                    className="bg-accent text-text px-6 py-2.5 rounded-full font-medium hover:brightness-105 active:scale-95 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Scan another leaf
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* 6. Ready to Classify / Upload Ready State */}
          {!loading && !error && !result && (
            <div>
              {previewUrl ? (
                <div className="w-full bg-surface-raised rounded-2xl p-6 sm:p-10 text-center border border-leaf/15 max-w-xl mx-auto flex flex-col items-center">
                  <div className="max-h-64 aspect-square rounded-xl overflow-hidden mb-6 border border-leaf/20 bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selected specimen"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="font-typewriter text-lg text-text mb-6">
                    Ready for analysis
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full sm:w-auto bg-accent text-text px-8 py-3 rounded-full font-medium hover:brightness-105 active:scale-95 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Classify leaf
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="w-full sm:w-auto bg-surface-raised border border-leaf/25 text-text px-6 py-3 rounded-full font-normal hover:bg-background active:scale-95 transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Change photo
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`w-full bg-surface-raised rounded-2xl p-8 sm:p-12 md:p-16 text-center border transition-all duration-200 flex flex-col items-center justify-center relative ${
                    isDragging
                      ? "border-accent ring-2 ring-accent bg-surface-raised"
                      : "border-leaf/20 hover:border-leaf/40"
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-6 relative">
                    <svg
                      className="w-8 h-8 text-leaf"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253"
                      />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-leaf text-surface-raised flex items-center justify-center text-xs font-medium leading-none">
                      +
                    </div>
                  </div>

                  <p className="font-typewriter text-xl sm:text-2xl text-text font-normal mb-2 text-center">
                    Drop fresh specimen capture here
                  </p>

                  <p className="text-sm text-text/70 max-w-md mx-auto mb-8 text-center font-normal">
                    High-contrast macro captures of diseased leaves yield highest
                    classification fidelity. Supports JPG, PNG, WEBP.
                  </p>

                  <label
                    htmlFor="leaf-upload"
                    className="cursor-pointer bg-accent text-text px-8 py-3.5 rounded-full font-medium hover:brightness-105 active:scale-95 transition-all text-sm inline-flex items-center gap-2 focus-within:ring-2 focus-within:ring-leaf focus-within:ring-offset-2 focus-within:ring-offset-background"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Choose photo</span>
                  </label>
                  <input
                    id="leaf-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                  />

                  <div className="mt-8 pt-6 border-t border-leaf/15 flex flex-wrap items-center justify-center gap-6 text-xs text-text/60">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-leaf" />
                      Single leaf macro capture
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-leaf" />
                      38 botanical pathologies
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-leaf" />
                      Instant neural inference
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}