"use client";

import { motion } from "motion/react";

interface ConfidenceBarProps {
  confidence: number;
  className?: string;
  delay?: number;
}

export function ConfidenceBar({
  confidence,
  className = "",
  delay = 0.2,
}: ConfidenceBarProps) {
  const percentage = Math.min(100, Math.max(confidence * 100, 2));

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full border border-leaf/20 bg-surface-raised ${className}`}
    >
      <motion.div
        className="h-full rounded-full bg-leaf origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay }}
      />
    </div>
  );
}
