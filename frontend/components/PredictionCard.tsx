"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { PredictionRecord } from "@/lib/api";
import { buildImageUrl } from "@/lib/storage";
import { formatLabel, formatPercent } from "@/lib/format";

interface PredictionCardProps {
  prediction: PredictionRecord;
  index: number;
}

export function PredictionCard({ prediction, index }: PredictionCardProps) {
  const imageUrl = buildImageUrl(prediction.image_path);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={`/predictions/${prediction.id}`}
        className="flex h-full flex-col justify-between rounded-3xl border border-leaf/15 bg-card/60 p-5 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-text/70">
            <span className="font-typewriter uppercase tracking-wider">
              {new Date(prediction.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            {prediction.is_uncertain ? (
              <span className="rounded-full bg-accent/30 px-2.5 py-0.5 font-medium text-text">
                Uncertain
              </span>
            ) : (
              <span className="rounded-full bg-surface-raised/80 px-2.5 py-0.5 font-medium text-leaf">
                Verified
              </span>
            )}
          </div>

          <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-raised border border-leaf/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={prediction.predicted_label}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute bottom-2.5 left-2.5 rounded-full bg-surface-raised/95 px-2.5 py-1 text-xs font-typewriter text-text shadow-sm">
              {formatPercent(prediction.confidence)}
            </div>
          </div>

          <div className="text-left">
            <h2 className="truncate font-typewriter text-lg font-normal text-text capitalize">
              {formatLabel(prediction.predicted_label)}
            </h2>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-text/10 pt-3 text-xs text-text/70">
          <span>Review dossier</span>
          <span className="transition-transform group-hover:translate-x-1">
            &rarr;
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
