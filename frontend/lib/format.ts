// PlantVillage labels are raw folder names, e.g. "Tomato___Late_blight" or
// "Pepper,_bell___Bacterial_spot" (section 8). This turns them into
// something readable without touching the underlying label string used
// for API calls and lookups.
export function formatLabel(label: string | null | undefined): string {
  if (!label) return "Unknown";
  return label.replace(/___/g, " — ").replace(/_/g, " ");
}

export function formatPercent(confidence: number | null | undefined): string {
  if (typeof confidence !== "number") return "—";
  return `${(confidence * 100).toFixed(1)}%`;
}
