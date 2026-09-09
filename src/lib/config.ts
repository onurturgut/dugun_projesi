export const UPLOAD_CONFIG = {
  maxPhotoBytes: 15 * 1024 * 1024, // 15 MB
  maxVideoBytes: 200 * 1024 * 1024, // 200 MB
  maxFilesPerBatch: 20,
  photoMimePrefixes: ["image/"],
  videoMimePrefixes: ["video/"],
  allowedExtensions: [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "heic",
    "heif",
    "avif",
    "gif",
    "mp4",
    "mov",
    "m4v",
    "webm",
    "quicktime",
  ],
  accept:
    "image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/gif,video/mp4,video/quicktime,video/webm,video/*,image/*",
} as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
