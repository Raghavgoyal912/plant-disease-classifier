"use client";

import { motion } from "motion/react";

export function AnalyzingLine() {
  return (
    <div className="mx-auto my-6 h-1 w-full max-w-sm overflow-hidden rounded-full bg-leaf/20 relative">
      <motion.div
        className="h-full w-1/2 rounded-full bg-accent"
        animate={{
          x: ["-100%", "200%"],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
