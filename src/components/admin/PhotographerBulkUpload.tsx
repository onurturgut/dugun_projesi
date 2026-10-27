"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  Files,
  FileUp,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Video,
} from "lucide-react";
import { formatBytes, UPLOAD_CONFIG } from "@/lib/config";
import { uploadItem, validateFiles, type SelectedItem } from "@/lib/uploads";

type QueueStatus = "ready" | "uploading" | "done" | "failed";
type QueueItem = SelectedItem & {
  relativePath: string;
  status: QueueStatus;
  progress: number;
  error?: string;
};

const CONCURRENT_UPLOADS = 3;

export function PhotographerBulkUpload({
  weddingId,
  disabled,
  onUploadingChange,
  onBatchComplete,
}: {
  weddingId: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  onBatchComplete?: () => void | Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectionErrors, setSelectionErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
  }, []);

  useEffect(() => {
    onUploadingChange?.(uploading);
    if (!uploading) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [onUploadingChange, uploading]);

  useEffect(
    () => () => {
      for (const item of items) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    [items],
  );

  const summary = useMemo(() => {
    const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    const done = items.filter((item) => item.status === "done").length;
    const failed = items.filter((item) => item.status === "failed").length;
    const photos = items.filter((item) => item.kind === "photo").length;
    const videos = items.length - photos;
    const weightedProgress = totalBytes
      ? Math.round(
          items.reduce(
            (sum, item) => sum + item.file.size * item.progress,
            0,
          ) / totalBytes,
        )
      : 0;
    return { totalBytes, done, failed, photos, videos, weightedProgress };
  }, [items]);

  function addFiles(files: File[]) {
    if (!files.length || uploading) return;
    const { accepted, errors } = validateFiles(files, {
      createPreviews: false,
    });
    const existing = new Set(
      items.map(
        (item) =>
          `${item.relativePath}:${item.file.size}:${item.file.lastModified}`,
      ),
    );
    const additions = accepted
      .map<QueueItem>((item) => ({
        ...item,
        relativePath: item.file.webkitRelativePath || item.file.name,
        status: "ready",
        progress: 0,
      }))
      .filter((item) => {
        const key = `${item.relativePath}:${item.file.size}:${item.file.lastModified}`;
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
    setItems((current) => [...current, ...additions]);
    setSelectionErrors(errors);
  }

  function removeItem(id: string) {
    if (uploading) return;
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function startUpload() {
    const queue = items.filter(
      (item) => item.status === "ready" || item.status === "failed",
    );
    if (!queue.length || uploading) return;
    setUploading(true);
    let cursor = 0;

    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id
              ? { ...candidate, status: "uploading", progress: 0, error: undefined }
              : candidate,
          ),
        );
        const result = await uploadItem(weddingId, item, (progress) => {
          setItems((current) =>
            current.map((candidate) =>
              candidate.id === item.id
                ? { ...candidate, progress }
                : candidate,
            ),
          );
        });
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id
              ? {
                  ...candidate,
                  status: result.ok ? "done" : "failed",
                  progress: result.ok ? 100 : candidate.progress,
                  error: result.error,
                }
              : candidate,
          ),
        );
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENT_UPLOADS, queue.length) },
        () => worker(),
      ),
    );
    setUploading(false);
    await onBatchComplete?.();
  }

  const retryable = items.some(
    (item) => item.status === "ready" || item.status === "failed",
  );

  return (
    <section className="photographer-bulk-upload" aria-labelledby="bulk-upload-title">
      <div className="photographer-bulk-heading">
        <div>
          <p className="admin-kicker">TOPLU TESLİMAT</p>
          <h3 id="bulk-upload-title">Çekim klasörünü yükleyin</h3>
          <p className="admin-hint">
            Klasörü bir kez seçin; desteklenen fotoğraf ve videolar ayrı
            ayrı, güvenli bir kuyrukla yüklensin.
          </p>
        </div>
        <span className="photographer-concurrency">3 paralel yükleme</span>
      </div>

      <div
        className={`photographer-upload-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <FolderOpen size={34} aria-hidden="true" />
        <strong>Dosyaları buraya bırakın veya klasör seçin</strong>
        <span>Klasör seçiminde alt klasörlerdeki desteklenen dosyalar da eklenir.</span>
        <div className="photographer-upload-actions">
          <button
            type="button"
            className="admin-button primary"
            disabled={disabled || uploading}
            onClick={() => folderInput.current?.click()}
          >
            <FolderOpen size={17} /> Klasör seç
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={disabled || uploading}
            onClick={() => fileInput.current?.click()}
          >
            <FileUp size={17} /> Dosya seç
          </button>
        </div>
      </div>

      <input
        ref={folderInput}
        hidden
        type="file"
        multiple
        accept={UPLOAD_CONFIG.accept}
        onChange={(event) => {
          addFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <input
        ref={fileInput}
        hidden
        type="file"
        multiple
        accept={UPLOAD_CONFIG.accept}
        onChange={(event) => {
          addFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />

      {items.length > 0 && (
        <>
          <div className="photographer-upload-summary" aria-live="polite">
            <span><Files size={17} /> {items.length} dosya</span>
            <span><FileImage size={17} /> {summary.photos} fotoğraf</span>
            <span><Video size={17} /> {summary.videos} video</span>
            <span>{formatBytes(summary.totalBytes)}</span>
          </div>

          <div className="photographer-upload-progress">
            <div>
              <strong>
                {summary.done} / {items.length} tamamlandı
              </strong>
              <span>%{summary.weightedProgress}</span>
            </div>
            <progress max={100} value={summary.weightedProgress}>
              %{summary.weightedProgress}
            </progress>
          </div>

          <ul className="photographer-upload-queue">
            {items.map((item) => (
              <li key={item.id} data-status={item.status}>
                <span className="photographer-file-status" aria-hidden="true">
                  {item.status === "done" ? (
                    <CheckCircle2 size={18} />
                  ) : item.status === "failed" ? (
                    <AlertCircle size={18} />
                  ) : item.status === "uploading" ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : item.kind === "photo" ? (
                    <FileImage size={18} />
                  ) : (
                    <Video size={18} />
                  )}
                </span>
                <span className="photographer-file-copy">
                  <strong title={item.relativePath}>{item.relativePath}</strong>
                  <small>
                    {formatBytes(item.file.size)}
                    {item.error ? ` · ${item.error}` : ""}
                  </small>
                </span>
                <span className="photographer-file-progress">
                  {item.status === "done" ? "Tamamlandı" : `%${item.progress}`}
                </span>
                {item.status !== "done" && item.status !== "uploading" && (
                  <button
                    type="button"
                    aria-label={`${item.file.name} dosyasını kaldır`}
                    disabled={uploading}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="photographer-upload-footer">
            <button
              type="button"
              className="admin-button primary"
              disabled={disabled || uploading || !retryable}
              onClick={() => void startUpload()}
            >
              {uploading ? (
                <><LoaderCircle className="animate-spin" size={17} /> Yükleniyor…</>
              ) : summary.failed ? (
                <><RefreshCw size={17} /> Başarısızları yeniden dene</>
              ) : (
                <><FileUp size={17} /> {items.length} dosyayı yükle</>
              )}
            </button>
            {!uploading && summary.done === items.length && (
              <span className="photographer-upload-complete">
                <CheckCircle2 size={17} /> Tüm dosyalar yüklendi. Teslimatı tamamlayabilirsiniz.
              </span>
            )}
          </div>
        </>
      )}

      {selectionErrors.length > 0 && (
        <details className="photographer-upload-errors">
          <summary>{selectionErrors.length} dosya seçime alınmadı</summary>
          <ul>
            {selectionErrors.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
