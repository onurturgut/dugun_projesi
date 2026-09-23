"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  LoaderCircle,
  X,
} from "lucide-react";

async function prepare(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("JPG, PNG veya WebP seçin.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Görsel en fazla 15 MB olabilir.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Görsel hazırlanamadı.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= 2 * 1024 * 1024) return blob;
    }
    throw new Error("Daha küçük bir görsel seçin.");
  } finally {
    bitmap.close();
  }
}

export function CoverUpload({
  value,
  onChange,
  eventId,
  partnerId,
  disabled,
  onBusyChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  eventId?: string;
  partnerId: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  async function upload(files: File[]) {
    if (!files.length || uploading.current || disabled) return;
    if (value.length + files.length > 20) {
      setErrors(["En fazla 20 kapak ekleyebilirsiniz."]);
      return;
    }
    uploading.current = true;
    onBusyChange(true);
    setErrors([]);
    const next = [...value];
    const failures: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`${index + 1} / ${files.length} yükleniyor: ${file.name}`);
        try {
          const blob = await prepare(file);
          const form = new FormData();
          form.append("file", blob, "kapak.webp");
          form.append("partner_id", partnerId);
          if (eventId) form.append("event_id", eventId);
          const response = await fetch("/api/admin/covers", {
            method: "POST",
            body: form,
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Yükleme tamamlanamadı.");
          next.push(result.url);
          onChange([...next]);
        } catch (error) {
          failures.push(
            `${file.name}: ${error instanceof Error ? error.message : "Yüklenemedi. Yeniden seçerek deneyin."}`,
          );
        }
      }
    } finally {
      setErrors(failures);
      setProgress("");
      uploading.current = false;
      onBusyChange(false);
    }
  }
  function move(index: number, delta: number) {
    const next = [...value];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }
  const locked = disabled || !!progress;
  return (
    <fieldset className="admin-covers" disabled={locked}>
      <legend>Kapak fotoğrafları</legend>
      <p className="admin-hint">
        JPG, PNG veya WebP · Görsel başına en fazla 15 MB · {value.length} / 20
      </p>
      <div className="admin-cover-grid">
        {value.map((url, index) => (
          <div className="admin-cover-card" key={`${url}-${index}`}>
            <Image
              src={url}
              alt={`${index + 1}. kapak fotoğrafı`}
              width={320}
              height={220}
              unoptimized
            />
            <div className="admin-cover-controls">
              <span>{index === 0 ? "İlk kapak" : `${index + 1}. kapak`}</span>
              <button
                type="button"
                disabled={locked || index === 0}
                onClick={() => move(index, -1)}
                aria-label={`${index + 1}. kapağı öne taşı`}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                type="button"
                disabled={locked || index === value.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`${index + 1}. kapağı arkaya taşı`}
              >
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`${index + 1}. kapağı kaldır`}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          void upload(files);
        }}
      />
      <button
        type="button"
        className="admin-cover-add"
        disabled={locked || value.length >= 20}
        onClick={() => input.current?.click()}
      >
        {progress ? (
          <LoaderCircle size={22} className="animate-spin" />
        ) : (
          <ImagePlus size={22} />
        )}
        {progress ? "Görseller yükleniyor…" : "Kapak fotoğrafı ekle"}
      </button>
      {progress && (
        <p className="admin-hint" role="status">
          {progress}
        </p>
      )}
      {errors.length > 0 && (
        <div role="alert" className="admin-cover-errors">
          {errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
          <p>Yüklenemeyen görselleri yeniden seçerek deneyebilirsiniz.</p>
        </div>
      )}
      <p className="admin-hint">
        Kapaklar misafir sayfasında bu sırayla gösterilir. Değişiklikleri
        uygulamak için formu kaydedin.
        {!value.length &&
          " Kapak eklemezseniz varsayılan görseller kullanılır."}
      </p>
    </fieldset>
  );
}
