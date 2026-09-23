"use client";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

// Fetch metadata only when the card approaches the viewport. Never autoplay a gallery.
export function VideoPreview({ url }: { url: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [duration, setDuration] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={container}
      className="absolute inset-0 flex items-center justify-center"
    >
      {visible && !failed && (
        <video
          aria-hidden="true"
          tabIndex={-1}
          muted
          playsInline
          preload="metadata"
          src={`${url}${url.includes("?") ? "&" : "?"}preview=1#t=0.1`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
          onLoadedMetadata={(e) => {
            const seconds = Math.floor(e.currentTarget.duration);
            if (Number.isFinite(seconds))
              setDuration(
                `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
              );
          }}
        />
      )}
      <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white">
        <Play size={22} />
      </span>
      {duration && (
        <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          {duration}
        </span>
      )}
      {failed && (
        <span className="absolute top-3 right-3 text-xs text-gold">Video</span>
      )}
    </div>
  );
}
