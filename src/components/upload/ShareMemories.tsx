import { useEffect, useRef, useState } from "react";
import {
  Check,
  Heart,
  Flower2,
  ImageUp,
  Lock,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { GoldDivider } from "../wedding/GoldDivider";
import { UPLOAD_CONFIG, formatBytes } from "@/lib/config";
import { uploadItem, validateFiles, type SelectedItem } from "@/lib/uploads";

type Phase = "idle" | "review" | "uploading" | "done";

interface ShareMemoriesProps {
  weddingId: string;
}

export function ShareMemories({ weddingId }: ShareMemoriesProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState<SelectedItem[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (phase !== "uploading") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    const { accepted, errors: errs } = validateFiles(files);
    setErrors(errs);
    setItems((prev) =>
      [...prev, ...accepted].slice(0, UPLOAD_CONFIG.maxFilesPerBatch),
    );
    if (accepted.length > 0) setPhase("review");
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setPhase("idle");
      return next;
    });
  };

  const startUpload = async (queue: SelectedItem[]) => {
    setPhase("uploading");
    setFailed([]);
    setErrors([]);
    let success = 0;
    const failures: SelectedItem[] = [];
    for (const item of queue) {
      const result = await uploadItem(
        weddingId,
        item,
        (pct) => setProgress((p) => ({ ...p, [item.id]: pct })),
        { guest_name: guestName, guest_message: guestMessage },
      );
      if (result.ok) success += 1;
      else {
        failures.push(item);
        setErrors((previous) => [
          ...previous,
          result.error || "Yükleme başarısız.",
        ]);
      }
    }
    setUploadedCount((c) => c + success);
    if (failures.length > 0) {
      setFailed(failures);
      setItems(failures);
      setPhase("review");
    } else {
      setItems([]);
      setPhase("done");
    }
  };

  const totalProgress =
    items.length === 0
      ? 0
      : Math.round(
          items.reduce((sum, i) => sum + (progress[i.id] ?? 0), 0) /
            Math.max(items.length, 1),
        );

  return (
    <section id="paylas" className="mx-auto w-full max-w-2xl px-5 pb-16">
      <div className="memory-upload-card rounded-3xl px-5 py-8 sm:px-10 sm:py-10">
        <Flower2
          aria-hidden="true"
          className="memory-motif memory-motif-top"
          strokeWidth={0.7}
        />
        <Flower2
          aria-hidden="true"
          className="memory-motif memory-motif-bottom"
          strokeWidth={0.7}
        />
        <div className="text-center">
          <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-gold">
            Sizin gözünüzden, bizim hikâyemiz
          </p>
          <h2 className="font-display text-3xl font-light text-cream sm:text-4xl">
            Bir anı da sen bırak
          </h2>
          <GoldDivider className="my-4" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Yakaladığınız bir gülüş, bir dans, bir güzel an… Fotoğraf ve
            videolarınızla hikâyemizi tamamlayın.
          </p>
        </div>

        {(phase === "idle" || phase === "review") && (
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              addFiles(Array.from(event.dataTransfer.files));
            }}
            className={`memory-dropzone mt-7 w-full ${isDragging ? "is-dragging" : ""}`}
          >
            <span className="memory-upload-icon">
              <ImageUp className="h-7 w-7" strokeWidth={1.3} />
            </span>
            <span className="mt-4 text-base font-medium text-cream">
              Fotoğraf veya video seç
            </span>
            <span className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Galerinizden anılarınızı eklemek için dokunun
            </span>
            <span className="mt-1 hidden text-xs text-muted-foreground sm:block">
              veya dosyalarınızı buraya sürükleyin
            </span>
            <span className="mt-5 rounded-full border border-gold/30 px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] text-gold">
              Birden fazla anı seçebilirsiniz
            </span>
          </button>
        )}

        {phase === "idle" && (
          <div className="mt-6 space-y-3">
            <label className="form-field">
              <span>İsminiz (isteğe bağlı)</span>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label className="form-field">
              <span>Mesajınız (isteğe bağlı)</span>
              <textarea
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </label>
          </div>
        )}

        {phase === "review" && (
          <div className="mt-8">
            <p className="eyebrow text-center">{items.length} anınız seçildi</p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface"
                >
                  {item.kind === "photo" ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface">
                      <Play className="h-6 w-6 text-gold" strokeWidth={1.1} />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-beige">
                    {formatBytes(item.file.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`${item.file.name} dosyasını kaldır`}
                    onClick={() => removeItem(item.id)}
                    className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-cream transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.25} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
              >
                + Ekle
              </button>
            </div>

            {phase === "review" && (
              <div className="mt-6 space-y-3">
                <label className="form-field">
                  <span>İsminiz (isteğe bağlı)</span>
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
                <label className="form-field">
                  <span>Mesajınız (isteğe bağlı)</span>
                  <textarea
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    maxLength={1000}
                    rows={3}
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={() => startUpload(items)}
              className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[image:var(--gradient-gold)] px-6 text-sm font-medium uppercase tracking-[0.18em] text-primary-foreground transition-transform duration-500 hover:scale-[1.01]"
            >
              {failed.length > 0 ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />{" "}
                  Tekrar Dene
                </>
              ) : (
                "Anıları paylaş"
              )}
            </button>
          </div>
        )}

        {phase === "uploading" && (
          <div className="mt-8">
            <p className="text-center text-sm text-beige">
              Anılarınız yükleniyor...
            </p>
            <div className="mt-4 h-[6px] w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-[image:var(--gradient-gold)] transition-all duration-500"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              %{totalProgress}
            </p>
            <ul className="mt-5 space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 text-xs text-muted-foreground"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.file.name}
                  </span>
                  <span className="shrink-0 text-gold">
                    %{progress[item.id] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Lütfen bu sayfadan ayrılmayın.
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="mt-8 text-center" role="status">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/50 bg-gold/10 fade-up">
              <Check className="h-7 w-7 text-gold" strokeWidth={1.2} />
            </div>
            <h3 className="mt-5 text-xl font-light text-cream">
              Anınız başarıyla paylaşıldı{" "}
              <Heart className="inline h-4 w-4 fill-gold text-gold" />
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bu güzel anıyı bizimle paylaştığınız için teşekkür ederiz.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Toplam {uploadedCount} anı paylaştınız.
            </p>
            <button
              type="button"
              onClick={() => {
                setPhase("idle");
                setProgress({});
              }}
              className="mt-6 min-h-[48px] w-full rounded-xl border border-gold/50 px-6 text-sm uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/10"
            >
              Yeni Anı Paylaş
            </button>
          </div>
        )}

        {errors.length > 0 && (
          <ul
            role="alert"
            className="mt-5 space-y-1 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-cream"
          >
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" strokeWidth={1.5} />
          Paylaştığınız içerikleri yalnızca organizasyon sahibi, ilgili işletme
          ve platform yöneticisi görebilir.
        </p>
      </div>

      <input
        ref={galleryRef}
        type="file"
        multiple
        accept={UPLOAD_CONFIG.accept}
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </section>
  );
}
