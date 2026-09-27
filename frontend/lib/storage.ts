// PredictionRecord (list/detail) stores a raw Storage path, not a URL
// (see backend/app/schemas.py). Only /predict's response already includes
// a full image_url. This builds the public URL for the "plant-images"
// bucket (section 7) everywhere else it's needed.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET = "plant-images";

export function buildImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "";
  if (!SUPABASE_URL) {
    console.warn(
      "NEXT_PUBLIC_SUPABASE_URL is not set — image will not load. Add it to .env.local."
    );
    return "";
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${imagePath}`;
}
