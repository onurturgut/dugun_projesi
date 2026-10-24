import type { ReactNode } from "react";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface BotanicalWeddingProps {
  title: string;
  formattedDate: string | null;
  date?: string | null;
  message: string;
  children: ReactNode;
}

export function BotanicalWedding({
  title,
  formattedDate,
  date,
  message,
  children,
}: BotanicalWeddingProps) {
  return (
    <section className={styles.botanicalStage}>
      <div className={styles.botanicalCopy}>
        <h1>{title}</h1>
        {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
        <p>{message}</p>
      </div>
      <div className={styles.botanicalUpload}>{children}</div>
    </section>
  );
}
