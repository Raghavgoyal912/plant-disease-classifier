"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Advice } from "@/lib/api";
import { motion, AnimatePresence } from "motion/react";

interface AdviceTabsProps {
  advice: Advice;
}

type TabKey = keyof Advice;

const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "symptoms", label: "Symptoms" },
  { key: "treatment", label: "Treatment" },
  { key: "prevention", label: "Prevention" },
];

// Swipe must travel this far (px) to count as a tab change.
const SWIPE_DISTANCE = 50;

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

export function AdviceTabs({ advice }: AdviceTabsProps) {
  const underlineId = useId();
  // direction: 1 = moving forward (slide in from the right), -1 = backward.
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(next: number) {
    if (next < 0 || next >= TABS.length || next === index) return;
    setState([next, next > index ? 1 : -1]);
  }

  // Keep the active tab visible when the tab row scrolls sideways.
  useEffect(() => {
    tabRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  return (
    <div className="w-full min-w-0 text-left">
      {/* One-line tab row. Scrolls sideways on narrow cards, scrollbar hidden. */}
      <div
        role="tablist"
        aria-label="Advice sections"
        className="mb-3 flex gap-5 overflow-x-auto border-b border-leaf/20 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab, i) => {
          const isActive = i === index;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => select(i)}
              className={`relative shrink-0 whitespace-nowrap pb-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf rounded ${
                isActive
                  ? "text-text font-medium"
                  : "text-text/60 hover:text-text font-normal"
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId={`${underlineId}-underline`}
                  className="absolute bottom-0 left-0 h-0.5 w-full bg-accent"
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Swipe left/right on touch screens to change tabs. */}
      <div className="min-h-16 overflow-hidden touch-pan-y">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.p
            key={TABS[index].key}
            role="tabpanel"
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_DISTANCE) select(index + 1);
              else if (info.offset.x > SWIPE_DISTANCE) select(index - 1);
            }}
            className="text-sm leading-relaxed text-text/80 text-left"
          >
            {advice[TABS[index].key]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-4 border-t border-leaf/15 pt-3 text-xs text-text/60 text-left">
        AI-generated, not professional agronomic advice.
      </p>
    </div>
  );
}