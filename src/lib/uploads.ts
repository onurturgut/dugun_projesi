import { api } from "./api";
import { UPLOAD_CONFIG, formatBytes } from "./config";
import { canUseSameOriginPhotoFallback } from "./upload-fallback";

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

const MIME_BY_EXTENSION: Record<string, string> = {
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

export function resolveUploadMime(file: Pick<File, "name" | "type">) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const normalizedType = file.type.trim().toLowerCase();
  return (
    MIME_BY_EXTENSION[extension] ||
    (normalizedType === "image/jpg" ? "image/jpeg" : normalizedType) ||
    "application/octet-stream"
  );
}

export function createFallbackSessionId(bytes?: Uint8Array) {
  const random = bytes ?? new Uint8Array(16);
  if (!bytes) {
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(random);
    } else {
      for (let index = 0; index < random.length; index += 1)
        random[index] = Math.floor(Math.random() * 256);
    }
  }
  random[6] = (random[6] & 0x0f) | 0x40;
  random[8] = (random[8] & 0x3f) | 0x80;
  const hex = Array.from(random, (value) =>
    value.toString(16).padStart(2, "0"),
  );
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
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

export function validateFiles(
  files: File[],
  options: { createPreviews?: boolean } = {},
): ValidationResult {
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
      previewUrl:
        options.createPreviews === false ? "" : URL.createObjectURL(file),
    });
  }

  return { accepted, errors };
}

export function getSessionId(): string {
  const key = "wm_session_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created =
      globalThis.crypto?.randomUUID?.() ?? createFallbackSessionId();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return globalThis.crypto?.randomUUID?.() ?? createFallbackSessionId();
  }
}

export interface UploadOneResult {
  ok: boolean;
  error?: string;
}

export function buildUploadSignPayload(
  weddingId: string,
  item: Pick<SelectedItem, "file">,
  mime: string,
  durationSeconds: number | undefined,
) {
  return {
    weddingId,
    file_name: item.file.name.slice(0, 180),
    mime_type: mime,
    size_bytes: item.file.size,
    duration_seconds: durationSeconds,
    uploader_session_id: getSessionId(),
  };
}

export function buildUploadCompletePayload(
  ticket: string,
  guest: { guest_name: string; guest_message: string },
) {
  return {
    ticket,
    guest_name: guest.guest_name.trim().slice(0, 100),
    guest_message: guest.guest_message.trim().slice(0, 1000),
  };
}

function uploadStageError(stage: string, error: unknown) {
  const detail =
    error instanceof Error ? error.message : "Bilinmeyen ağ hatası.";
  if (/failed to fetch|networkerror|load failed/i.test(detail))
    return new Error(
      `${stage} sırasında sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.`,
    );
  return new Error(`${stage}: ${detail}`);
}

async function directUpload(
  url: string,
  file: File,
  mime: string,
  onProgress: (pct: number) => void,
) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.timeout = 30 * 60 * 1000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 95));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error(
              `Doğrudan depolama yüklemesi reddedildi (HTTP ${xhr.status}).`,
            ),
          );
    xhr.onerror = () =>
      reject(
        new Error(
          "Doğrudan depolama bağlantısı kurulamadı (durum 0). Android'de Chrome'u güncelleyip VPN, Özel DNS ve veri tasarrufunu kapatarak tekrar deneyin.",
        ),
      );
    xhr.ontimeout = () => reject(new Error("Doğrudan depolama zaman aşımı."));
    xhr.send(file);
  });
}

async function sameOriginPhotoUpload(ticket: string, file: File, mime: string) {
  const response = await fetch("/api/uploads/proxy", {
    method: "PUT",
    headers: {
      "Content-Type": mime,
      "X-Upload-Ticket": ticket,
    },
    body: file,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Yedek fotoğraf yüklemesi başarısız.",
    );
}

async function videoDuration(file: File) {
  return await new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = () => URL.revokeObjectURL(url);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      done();
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("Video süresi doğrulanamadı."));
    };
    video.onerror = () => {
      done();
      reject(new Error("Video süresi doğrulanamadı."));
    };
    video.src = url;
  });
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
    const mime = resolveUploadMime(item.file);
    const durationSeconds =
      item.kind === "video" ? await videoDuration(item.file) : undefined;
    if (
      durationSeconds &&
      durationSeconds > UPLOAD_CONFIG.maxVideoDurationSeconds
    )
      throw new Error("Videolar en fazla 15 dakika olabilir.");
    let signed: { url: string; ticket: string };
    try {
      signed = await api<{ url: string; ticket: string }>("/uploads/sign", {
        method: "POST",
        body: JSON.stringify(
          buildUploadSignPayload(weddingId, item, mime, durationSeconds),
        ),
      });
    } catch (error) {
      throw uploadStageError("Yükleme başlatma", error);
    }
    try {
      await directUpload(signed.url, item.file, mime, onProgress);
    } catch (directError) {
      try {
        onProgress(0);
        await directUpload(signed.url, item.file, mime, onProgress);
      } catch {
        if (
          !canUseSameOriginPhotoFallback({
            kind: item.kind,
            size: item.file.size,
          })
        )
          throw directError;
        onProgress(96);
        await sameOriginPhotoUpload(signed.ticket, item.file, mime);
      }
    }
    try {
      await api("/uploads/complete", {
        method: "POST",
        body: JSON.stringify(buildUploadCompletePayload(signed.ticket, guest)),
      });
    } catch (error) {
      throw uploadStageError("Yüklemeyi tamamlama", error);
    }
    onProgress(100);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Yükleme başarısız.",
    };
  }
}
