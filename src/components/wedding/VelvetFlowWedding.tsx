"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface VelvetFlowWeddingProps {
  title: string;
  formattedDate: string | null;
  date?: string | null;
  message: string;
  children: ReactNode;
}

export function VelvetFlowWedding({
  title,
  formattedDate,
  date,
  message,
  children,
}: VelvetFlowWeddingProps) {
  return (
    <section className={styles.velvetStage}>
      <header className={styles.velvetCopy}>
        <Image
          src="/brand/shineqr-mark.png"
          alt=""
          aria-hidden="true"
          width={72}
          height={48}
          className={styles.velvetMark}
        />
        <h1>{title}</h1>
        {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
        <p>{message}</p>
      </header>

      <div className={styles.velvetUpload}>{children}</div>
    </section>
  );
}
