"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { matchLabels } from "@/lib/labels";
import { formatLabel } from "@/lib/format";

interface LabelComboboxProps {
  // The exact raw label being filtered on, or "" for no filter.
  value: string;
  onChange: (label: string) => void;
}

// A search box with a dropdown of disease names. Typing narrows the list;
// choosing a name sets the filter. Typed text alone never filters, because the
// backend only matches a full label exactly.
export function LabelCombobox({ value, onChange }: LabelComboboxProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // While a name is chosen, show the whole list so another can be picked.
  const matches = useMemo(() => matchLabels(value ? "" : query), [query, value]);

  // Keep the highlighted row visible when moving with the arrow keys.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);

  function choose(label: string) {
    onChange(label);
    setQuery(formatLabel(label));
    setOpen(false);
  }

  function clear() {
    setQuery("");
    onChange("");
    setOpen(false);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setActive(0);
    setOpen(true);
    // Editing the text drops the chosen name, so the list is no longer filtered.
    if (value) onChange("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      className="relative w-full"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[active] ? `${listId}-${active}` : undefined
        }
        autoComplete="off"
        placeholder="Search a disease, e.g. pepper"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-2xl border border-leaf/20 bg-surface-raised px-4 py-2.5 pr-10 text-sm text-text placeholder:text-text/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {(query || value) && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear filter"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-lg leading-none text-text/60 transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
        >
          &times;
        </button>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          // Keeps the input focused while a row is clicked, so the list doesn't close early.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-leaf/20 bg-surface-raised py-1 text-left text-sm"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-text/70">No matching disease.</li>
          ) : (
            matches.map((label, i) => (
              <li
                key={label}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={label === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(label)}
                className={`cursor-pointer px-4 py-2 ${
                  i === active ? "bg-card/60 text-text" : "text-text/80"
                } ${label === value ? "font-medium" : ""}`}
              >
                {formatLabel(label)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
