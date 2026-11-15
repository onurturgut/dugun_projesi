export const SAME_ORIGIN_PHOTO_FALLBACK_MAX_BYTES = 4 * 1024 * 1024;

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
