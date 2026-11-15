// Vercel Functions cap request bodies at 4.5 MB. Keep enough headroom for the
// request envelope while using this only as a last-resort path for photos.
export const SAME_ORIGIN_PHOTO_FALLBACK_MAX_BYTES = 4_300_000;

export function canUseSameOriginPhotoFallback(input: {
  kind: "photo" | "video";
  size: number;
}) {
  return (
    input.kind === "photo" &&
    input.size > 0 &&
    input.size <= SAME_ORIGIN_PHOTO_FALLBACK_MAX_BYTES
  );
}
