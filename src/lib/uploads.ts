import { api } from "./api";
import { UPLOAD_CONFIG, formatBytes } from "./config";

export type MediaKind = "photo" | "video";

export interface SelectedItem {
  id: string;
  file: File;
  kind: MediaKind;
  previewUrl: string;
}

export interface ValidationResult {
  accepted: SelectedItem[];
  errors: string[];
}

export function detectKind(file: File): MediaKind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "photo";
  if (["mp4", "mov", "m4v", "webm"].includes(ext)) return "video";
  if (
    ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif", "gif"].includes(ext)
  )
    return "photo";
  return null;
}

export function validateFiles(files: File[]): ValidationResult {
  const accepted: SelectedItem[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const kind = detectKind(file);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (
      !kind ||
      (ext && !UPLOAD_CONFIG.allowedExtensions.includes(ext as never))
    ) {
      errors.push(`${file.name}: Bu dosya türü desteklenmiyor.`);
      continue;
    }
    const limit =
      kind === "video"
        ? UPLOAD_CONFIG.maxVideoBytes
        : UPLOAD_CONFIG.maxPhotoBytes;
    if (file.size > limit) {
      errors.push(
        `${file.name}: Bu dosya çok büyük (${formatBytes(file.size)}). Lütfen daha küçük bir dosya seçin. En fazla ${formatBytes(limit)}.`,
      );
      continue;
    }
    accepted.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      kind,
      previewUrl: URL.createObjectURL(file),
    });
  }

  return { accepted, errors };
}

export function getSessionId(): string {
  const key = "wm_session_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export interface UploadOneResult {
  ok: boolean;
  error?: string;
}
export async function uploadItem(
  weddingId: string,
  item: SelectedItem,
  onProgress: (pct: number) => void,
  guest: { guest_name: string; guest_message: string } = {
    guest_name: "",
    guest_message: "",
  },
): Promise<UploadOneResult> {
  try {
    const types: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
      avif: "image/avif",
      gif: "image/gif",
      mp4: "video/mp4",
      mov: "video/quicktime",
      m4v: "video/mp4",
      webm: "video/webm",
    };
    const mime =
      types[item.file.name.split(".").pop()?.toLowerCase() || ""] ||
      item.file.type;
    const signed = await api<{ url: string; ticket: string }>("/uploads/sign", {
      method: "POST",
      body: JSON.stringify({
        weddingId,
        file_name: item.file.name.slice(0, 180),
        mime_type: mime,
        size_bytes: item.file.size,
        uploader_session_id: getSessionId(),
        ...guest,
      }),
    });
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.url);
      xhr.setRequestHeader("Content-Type", mime);
      xhr.timeout = 30 * 60 * 1000;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          onProgress(Math.round((e.loaded / e.total) * 95));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error("R2 yüklemesi başarısız."));
      xhr.onerror = () =>
        reject(new Error("Ağ hatası. Lütfen tekrar deneyin."));
      xhr.ontimeout = () => reject(new Error("Yükleme zaman aşımına uğradı."));
      xhr.send(item.file);
    });
    await api("/uploads/complete", {
      method: "POST",
      body: JSON.stringify({ ticket: signed.ticket }),
    });
    onProgress(100);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Yükleme başarısız.",
    };
  }
}
