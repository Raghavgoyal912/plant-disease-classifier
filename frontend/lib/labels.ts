import { formatLabel } from "./format";

// The 38 raw PlantVillage labels: the same strings, in the same order, as
// ml/export/labels.json (model mnv2-plantvillage-v1). The frontend cannot import
// from ml/, so this is a copy. If the model is ever retrained with different
// classes, regenerate this list from the new labels.json.
// The History filter sends these exact strings to GET /predictions?label=...
export const LABELS: readonly string[] = [
  "Apple___Apple_scab",
  "Apple___Black_rot",
  "Apple___Cedar_apple_rust",
  "Apple___healthy",
  "Blueberry___healthy",
  "Cherry_(including_sour)___Powdery_mildew",
  "Cherry_(including_sour)___healthy",
  "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
  "Corn_(maize)___Common_rust_",
  "Corn_(maize)___Northern_Leaf_Blight",
  "Corn_(maize)___healthy",
  "Grape___Black_rot",
  "Grape___Esca_(Black_Measles)",
  "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
  "Grape___healthy",
  "Orange___Haunglongbing_(Citrus_greening)",
  "Peach___Bacterial_spot",
  "Peach___healthy",
  "Pepper,_bell___Bacterial_spot",
  "Pepper,_bell___healthy",
  "Potato___Early_blight",
  "Potato___Late_blight",
  "Potato___healthy",
  "Raspberry___healthy",
  "Soybean___healthy",
  "Squash___Powdery_mildew",
  "Strawberry___Leaf_scorch",
  "Strawberry___healthy",
  "Tomato___Bacterial_spot",
  "Tomato___Early_blight",
  "Tomato___Late_blight",
  "Tomato___Leaf_Mold",
  "Tomato___Septoria_leaf_spot",
  "Tomato___Spider_mites Two-spotted_spider_mite",
  "Tomato___Target_Spot",
  "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
  "Tomato___Tomato_mosaic_virus",
  "Tomato___healthy",
];

// Lowercase words of a string, ignoring punctuation: "Pepper, bell" -> ["pepper", "bell"].
function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Labels that match what the user typed. Every typed word must be the start of
// some word in the readable name ("pep bac" finds "Pepper, bell - Bacterial spot").
// Names that start with the typed text come first. An empty query returns all labels.
export function matchLabels(query: string): string[] {
  const typed = words(query);
  if (typed.length === 0) return [...LABELS];
  const typedText = typed.join(" ");
  const startsWith: string[] = [];
  const wordStart: string[] = [];
  for (const label of LABELS) {
    const nameWords = words(formatLabel(label));
    if (!typed.every((t) => nameWords.some((w) => w.startsWith(t)))) continue;
    if (nameWords.join(" ").startsWith(typedText)) startsWith.push(label);
    else wordStart.push(label);
  }
  return [...startsWith, ...wordStart];
}
