"use client";

import { motion } from "motion/react";

interface FloatingItemProps {
  src: string;
  className: string;
  sizeClassName: string;
  duration: number;
  initialRotate: number;
  yOffset: number;
}

function FloatingItem({
  src,
  className,
  sizeClassName,
  duration,
  initialRotate,
  yOffset,
}: FloatingItemProps) {
  return (
    <motion.div
      className={`absolute pointer-events-none select-none z-0 ${className} ${sizeClassName}`}
      animate={{
        y: [0, yOffset, 0],
        rotate: [initialRotate, initialRotate + 4, initialRotate],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain pointer-events-none select-none"
      />
    </motion.div>
  );
}

export function Decor() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Leaf: empty space to the right of the headline (~176-192px on desktop, smaller on mobile) */}
      <FloatingItem
        src="/decor/leaf.png"
        className="top-1 sm:top-2 md:top-4 right-2 sm:right-6 md:right-12 lg:right-16"
        sizeClassName="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-48 lg:h-48"
        duration={6}
        initialRotate={12}
        yOffset={-10}
      />

      {/* 2. Water droplet: near the upload area on the right (~160-176px on desktop, smaller on mobile) */}
      <FloatingItem
        src="/decor/droplet.png"
        className="top-48 sm:top-44 md:top-48 right-2 sm:right-6 md:right-10 lg:right-14"
        sizeClassName="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-44 lg:h-44"
        duration={7.5}
        initialRotate={-6}
        yOffset={10}
      />

      {/* 3. Olive seed pebble: left flank near upload area */}
      <FloatingItem
        src="/decor/seed.png"
        className="top-72 left-2 sm:left-4 md:left-8"
        sizeClassName="w-11 h-11 sm:w-12 sm:h-12"
        duration={8.5}
        initialRotate={25}
        yOffset={-8}
      />
    </div>
  );
}
