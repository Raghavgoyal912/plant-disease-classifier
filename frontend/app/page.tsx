"use client";

import { useState } from "react";
import { predict, PredictionResult } from "@/lib/api";
import { formatLabel, formatPercent } from "@/lib/format";

const CONFIDENCE_THRESHOLD_PERCENT = 60; // section 8: 0.60 threshold

export default function ClassifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predict(file);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong talking to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section>
        <h1 className="font-serif text-3xl text-forestDark mb-2">
          Scan a leaf
        </h1>
        <p className="text-muted mb-6">
          Upload a clear photo of a single leaf. The model checks it against
          38 disease classes from the PlantVillage dataset.
        </p>

        <label
          htmlFor="leaf-upload"
          className="block cursor-pointer rounded border border-dashed border-line bg-surface p-6 text-center hover:border-forest transition-colors"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected leaf"
              className="mx-auto max-h-64 rounded"
            />
          ) : (
            <span className="text-muted text-sm">
              Click to choose an image, or drag one here
            </span>
          )}
        </label>
        <input
          id="leaf-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="mt-4 w-full rounded bg-forest px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-forestDark transition-colors"
        >
          {loading ? "Analyzing..." : "Classify leaf"}
        </button>

        {error && <p className="mt-3 text-sm text-rust">{error}</p>}
      </section>

      <section>
        <h2 className="font-serif text-xl text-forestDark mb-3">Result</h2>

        {!result && !loading && (
          <p className="text-muted text-sm">
            Upload a leaf photo to see a prediction here.
          </p>
        )}
        {loading && <p className="text-muted text-sm">Running inference...</p>}

        {result && (
          <div className="rounded border border-line bg-surface p-5">
            {result.is_uncertain && (
              <div className="mb-4 rounded border border-ochre/40 bg-ochre/10 px-3 py-2 text-sm text-ochre">
                Not confident in this result — try a clearer, closer photo of
                a single leaf in good light.
              </div>
            )}

            <div className="flex items-baseline justify-between">
              <span className="font-serif text-lg">
                {formatLabel(result.label)}
              </span>
              <span className="text-sm text-muted">
                {formatPercent(result.confidence)}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {result.top3.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>{formatLabel(item.label)}</span>
                    <span>{formatPercent(item.confidence)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-line">
                    <div
                      className="h-1.5 rounded-full bg-forest"
                      style={{
                        width: `${Math.max(item.confidence * 100, 2)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted">
              Reliable results are {CONFIDENCE_THRESHOLD_PERCENT}% confidence
              or higher.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
