"use client";

import { motion } from "motion/react";

interface StatTileProps {
  value: string;
  label: string;
  note?: string;
  index: number;
}

// One big number on a lilac card. Fades and slides in once, staggered by index.
export function StatTile({ value, label, note, index }: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="rounded-3xl border border-leaf/15 bg-card/60 p-6 text-left"
    >
      <p className="font-typewriter text-4xl sm:text-5xl text-text font-normal tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-text">{label}</p>
      {note && <p className="mt-1 text-xs text-text/70">{note}</p>}
    </motion.div>
  );
}
