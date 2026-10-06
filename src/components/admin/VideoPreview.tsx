"use client";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

// Fetch metadata only when the card approaches the viewport. Never autoplay a gallery.
export function VideoPreview() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
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
      <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white">
        <Play size={22} />
      </span>
      <span className="absolute top-3 right-3 text-xs text-gold">
        {visible ? "Hazırlanıyor" : "Video"}
      </span>
    </div>
  );
}
