"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroCarouselProps {
  images: string[];
  alt: string;
}

export function HeroCarousel({ images, alt }: HeroCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback(
    (dir: number) => setActive((i) => (i + dir + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => setActive((i) => (i + 1) % count), 4800);
    return () => clearInterval(t);
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        if (start != null && end != null && Math.abs(end - start) > 40)
          go(end < start ? 1 : -1);
        touchStart.current = null;
        setPaused(false);
      }}
    >
      <div className="relative mx-auto flex h-[58vh] max-h-[560px] min-h-[340px] w-full items-center justify-center gap-3 sm:h-[62vh] sm:max-h-[620px]">
        {images.map((src, i) => {
          const offset = ((i - active + count) % count) as number;
          const rel = offset > count / 2 ? offset - count : offset;
          const isActive = rel === 0;
          const abs = Math.abs(rel);
          if (abs > 2) return null;
          return (
            <figure
              key={src}
              className="absolute overflow-hidden rounded-[1.25rem] transition-all duration-[1100ms]"
              style={{
                transform: `translateX(${rel * 46}%) scale(${isActive ? 1 : 0.78}) rotate(${rel * 1.4}deg)`,
                width: isActive ? "min(78%, 340px)" : "min(62%, 260px)",
                height: isActive ? "100%" : "78%",
                opacity: abs === 0 ? 1 : abs === 1 ? 0.42 : 0.15,
                zIndex: 10 - abs,
                transitionTimingFunction: "var(--ease-luxe)",
                boxShadow: isActive ? "var(--shadow-luxe)" : "none",
                border: isActive
                  ? "1px solid var(--color-border)"
                  : "1px solid transparent",
              }}
            >
              <Image
                unoptimized
                src={src}
                alt={`${alt} — fotoğraf ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                width={900}
                height={1200}
                className="h-full w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, oklch(0 0 0 / 12%) 0%, transparent 35%, oklch(0 0 0 / 55%) 100%)",
                }}
              />
            </figure>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Önceki fotoğraf"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/70 text-gold backdrop-blur transition-colors hover:border-gold/60 hover:bg-surface md:flex"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.25} />
          </button>
          <button
            type="button"
            aria-label="Sonraki fotoğraf"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/70 text-gold backdrop-blur transition-colors hover:border-gold/60 hover:bg-surface md:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.25} />
          </button>

          <div className="mt-6 flex items-center justify-center gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`${i + 1}. fotoğrafa git`}
                onClick={() => setActive(i)}
                className="h-[2px] rounded-full transition-all duration-700"
                style={{
                  width: i === active ? 28 : 14,
                  background:
                    i === active
                      ? "var(--gold)"
                      : "var(--color-muted-foreground)",
                  opacity: i === active ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
