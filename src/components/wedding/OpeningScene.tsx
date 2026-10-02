"use client";
import { type CSSProperties } from "react";
import { designMonogram, themes, type WeddingDesign } from "@/lib/design";
import styles from "./OpeningScene.module.css";

export function OpeningScene({
  design,
  title,
  still = false,
}: {
  design: WeddingDesign;
  title: string;
  still?: boolean;
}) {
  const palette = themes[design.theme];
  return (
    <div
      className={`${styles.scene} ${design.intro === "monogram" ? styles.monogram : design.intro === "fade" ? styles.fade : ""} ${still ? styles.still : ""}`}
      style={
        {
          "--scene-base": palette.base,
          "--scene-light": palette.light,
          "--scene-gold": palette.accent,
          "--scene-ink": palette.ink,
          "--scene-duration": `${6 / design.speed}s`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className={styles.halo} />
      <div className={styles.arch} />
      <div className={styles.medallion}>
        <span className={styles.flourish}>✦</span>
        <span className={styles.initials}>{designMonogram(design, title)}</span>
        <span className={styles.flourish}>❧</span>
      </div>
      {design.intro === "curtain" && (
        <>
          <div className={`${styles.curtain} ${styles.left}`} />
          <div className={`${styles.curtain} ${styles.right}`} />
          <div className={styles.valance} />
          <div className={styles.ribbon}>
            <div className={styles.band} />
            <svg viewBox="0 0 500 280" className={styles.bow}>
              <path d="M245 122C170 32 75 33 94 102C110 150 194 154 245 122Z" />
              <path d="M255 122C330 32 425 33 406 102C390 150 306 154 255 122Z" />
              <path d="M242 127Q190 159 148 243L184 231L203 257Q222 168 253 133Z" />
              <path d="M258 127Q310 159 352 243L316 231L297 257Q278 168 247 133Z" />
              <rect x="237" y="108" width="26" height="37" rx="9" />
            </svg>
          </div>
        </>
      )}
      <svg
        className={`${styles.botanical} ${styles.botanicalLeft}`}
        viewBox="0 0 150 300"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M35 300Q110 178 54 25M38 300Q140 235 112 100M40 300Q25 222 11 174" />
          {[45, 85, 130, 180, 225].map((y, i) => (
            <g
              key={y}
              transform={`translate(${62 + i * 4} ${y}) rotate(${i * 13})`}
            >
              <path
                d="M0 0Q-40 -40 -37 -7Q-24 11 0 0M0 0Q35 -38 30 -5Q18 12 0 0"
                fill="currentColor"
                fillOpacity=".18"
              />
              <circle cx="0" cy="-10" r="12" />
              <circle cx="-9" cy="1" r="12" />
              <circle cx="9" cy="1" r="12" />
              <circle cx="0" cy="0" r="5" />
            </g>
          ))}
        </g>
      </svg>
      <div className={`${styles.candle} ${styles.candleLeft}`}>
        <i />
        <b />
        <span />
      </div>
      <div className={`${styles.candle} ${styles.candleRight}`}>
        <i />
        <b />
        <span />
      </div>
      <div className={styles.particles}>
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${8 + i * 7.5}%`,
              animationDelay: `${i * -0.43}s`,
              top: `${(i * 17) % 80}%`,
            }}
          />
        ))}
      </div>
      <div className={styles.floor} />
    </div>
  );
}
