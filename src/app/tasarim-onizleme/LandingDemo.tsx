"use client";

import { useState } from "react";
import { Check, LoaderCircle, Upload } from "lucide-react";
import { track } from "@vercel/analytics";
import styles from "./preview.module.css";

export function LandingDemo() {
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");

  function startDemo() {
    if (state === "uploading") return;
    track("landing_demo_started", { surface: "hero_phone" });
    setState("uploading");
    window.setTimeout(() => {
      setState("done");
      track("landing_demo_completed", { surface: "hero_phone" });
    }, 1100);
  }

  return (
    <button className={styles.uploadBox} onClick={startDemo} type="button">
      {state === "idle" && <Upload size={23} />}
      {state === "uploading" && (
        <LoaderCircle className={styles.spin} size={23} />
      )}
      {state === "done" && <Check size={23} />}
      <strong>
        {state === "idle" && "Anını bizimle paylaş"}
        {state === "uploading" && "Anın yükleniyor…"}
        {state === "done" && "Anın albüme eklendi"}
      </strong>
      <small>
        {state === "done"
          ? "Bu bir ürün demosudur."
          : "Galerinden fotoğraf veya video seç."}
      </small>
      <span className={styles.uploadButton}>
        {state === "done" ? "Tekrar dene" : "Demoyu çalıştır"}
      </span>
    </button>
  );
}

export function TrackedContactLink() {
  return (
    <a
      className={styles.primary}
      href="mailto:info@shineqr.com?subject=ShineQR%20Demo%20Talebi"
      onClick={() => track("demo_request_clicked", { surface: "landing_cta" })}
    >
      Demo talep et
    </a>
  );
}
