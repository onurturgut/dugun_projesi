"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import styles from "./WeddingIntro.module.css";
import {
  resolveDesign,
  themes,
  designNames,
  type WeddingDesign,
} from "@/lib/design";
import { OpeningScene } from "./OpeningScene";

interface WeddingIntroProps {
  ready: boolean;
  failed: boolean;
  coverSrc?: string;
  children: ReactNode;
  design?: WeddingDesign;
  title?: string;
}

const POSTER = "/intro/shineqr-portrait-v2-poster.jpg";

export function WeddingIntro({
  ready,
  failed,
  coverSrc,
  children,
  design: savedDesign,
  title = "",
}: WeddingIntroProps) {
  const design = resolveDesign(savedDesign);
  const palette = themes[design.intro === "video" ? "burgundy" : design.theme];
  const [phase, setPhase] = useState<
    "checking" | "playing" | "leaving" | "done"
  >("checking");
  const [finished, setFinished] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const visible = phase !== "done";

  useEffect(() => {
    if (!ready) return;
    // Start a fresh opening on every page load, including browser refreshes.
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    setFinished(motion.matches || Boolean(connection?.saveData));
    setPhase("playing");
    const onMotionChange = () => {
      if (motion.matches) setFinished(true);
    };
    motion.addEventListener("change", onMotionChange);
    return () => motion.removeEventListener("change", onMotionChange);
  }, [ready]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  useEffect(() => {
    if (!coverSrc || !visible) return;
    const cover = new window.Image();
    const settle = () => setCoverReady(true);
    cover.onload = settle;
    cover.onerror = settle;
    cover.src = coverSrc;
    if (cover.complete) settle();
    // A slow cover must not hold the invitation behind the opening screen.
    const timer = window.setTimeout(settle, 2500);
    return () => {
      clearTimeout(timer);
      cover.onload = null;
      cover.onerror = null;
    };
  }, [coverSrc, visible]);

  useEffect(() => {
    if (phase !== "playing" || finished) return;
    if (design.intro !== "video") {
      const duration = design.intro === "fade" ? 1800 : 6000;
      const timer = window.setTimeout(
        () => setFinished(true),
        duration / design.speed,
      );
      return () => clearTimeout(timer);
    }
    const video = videoRef.current;
    if (video) {
      video.playbackRate = design.speed;
      void video.play().catch(() => setFinished(true));
    }
    // Covers a failed download, buffering or a browser that never fires ended.
    const timer = window.setTimeout(() => setFinished(true), 15000);
    return () => clearTimeout(timer);
  }, [phase, finished, design.intro, design.speed]);

  useEffect(() => {
    if (finished) videoRef.current?.pause();
    if (phase !== "playing") return;
    if (!failed && !(finished && ready && (!coverSrc || coverReady))) return;
    setPhase("leaving");
  }, [phase, finished, ready, failed, coverSrc, coverReady]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("done"), 400);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <>
      <div
        ref={contentRef}
        tabIndex={-1}
        inert={visible}
        aria-hidden={visible || undefined}
        className={styles.content}
      >
        {children}
      </div>
      {visible && (
        <section
          style={
            {
              "--intro-base": palette.base,
              "--intro-accent": palette.accent,
              "--intro-ink": palette.ink,
            } as CSSProperties
          }
          className={`${styles.intro} ${phase === "leaving" ? styles.leaving : ""}`}
          aria-label="Davetinize hoş geldiniz"
          onKeyDown={(event) => {
            if (event.key === "Escape") setFinished(true);
          }}
        >
          <div className={styles.ambient} aria-hidden="true" />
          <div className={styles.frame} aria-hidden="true" />
          <header className={styles.brand}>
            <span className={styles.brandName}>
              SHINE<span>QR</span>
            </span>
            <span className={styles.brandCaption}>
              Bir gün. Bir ömür hatıra.
            </span>
          </header>

          <div className={styles.stage} aria-hidden="true">
            {/* A CSS poster remains visible even when autoplay is unavailable. */}
            {design.intro === "video" ? (
              <div className={styles.poster} />
            ) : (
              phase !== "checking" && (
                <OpeningScene design={design} title={title} still={finished} />
              )
            )}
            {design.intro === "video" && phase !== "checking" && !finished && (
              <video
                ref={videoRef}
                className={styles.video}
                src="/intro/shineqr-portrait-v2.mp4"
                poster={POSTER}
                width={720}
                height={1280}
                autoPlay
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
                onEnded={() => setFinished(true)}
                onError={() => setFinished(true)}
              />
            )}
            {design.intro === "video" && finished && (
              <div className={`${styles.poster} ${styles.finalPoster}`} />
            )}
          </div>

          <footer className={styles.footer}>
            <h1 className={styles.title}>
              {designNames(design, title) || "Güzel anılar burada başlar."}
            </h1>
            <div className={styles.status} role="status" aria-live="polite">
              <span className={styles.pulse} aria-hidden="true" />
              {finished && !ready
                ? "Davetiniz hazırlanıyor…"
                : "Güzel bir hikâyeye hoş geldiniz…"}
            </div>
          </footer>
        </section>
      )}
    </>
  );
}
