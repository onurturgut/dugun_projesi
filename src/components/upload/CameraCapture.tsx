import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleStop, RotateCcw, Video, X } from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (files: File[]) => void;
}

export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setError(
          "Kameraya erişilemedi. Lütfen tarayıcı ayarlarından kamera iznini verin veya galeriden yükleyin.",
        );
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facing, stop]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture([new File([blob], `ani-${Date.now()}.jpg`, { type: "image/jpeg" })]);
      onClose();
    }, "image/jpeg", 0.92);
  };

  const toggleRecording = () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const type = mime.split(";")[0] ?? "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      onCapture([new File([blob], `ani-${Date.now()}.${ext}`, { type })]);
      setRecording(false);
      onClose();
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="eyebrow">Anını Çek</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kamerayı kapat"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-cream"
        >
          <X className="h-5 w-5" strokeWidth={1.25} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        {error ? (
          <p className="max-w-sm text-center text-sm leading-relaxed text-muted-foreground">{error}</p>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-full w-full rounded-2xl object-cover"
          />
        )}
        {recording && (
          <span className="absolute left-8 top-4 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs text-cream">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cream" /> Kayıt
          </span>
        )}
      </div>

      {!error && (
        <div className="flex items-center justify-center gap-6 px-4 py-8">
          <button
            type="button"
            aria-label="Kamerayı çevir"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-cream"
          >
            <RotateCcw className="h-5 w-5" strokeWidth={1.25} />
          </button>
          <button
            type="button"
            aria-label="Fotoğraf çek"
            onClick={takePhoto}
            disabled={recording}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-gold bg-gold/10 text-gold disabled:opacity-40"
          >
            <Camera className="h-7 w-7" strokeWidth={1.25} />
          </button>
          <button
            type="button"
            aria-label={recording ? "Kaydı durdur" : "Video kaydet"}
            onClick={toggleRecording}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-cream"
          >
            {recording ? (
              <CircleStop className="h-5 w-5 text-destructive" strokeWidth={1.25} />
            ) : (
              <Video className="h-5 w-5" strokeWidth={1.25} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
