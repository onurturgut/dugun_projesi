import type { ReactNode } from "react";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface IvoryEditorialWeddingProps {
  title: string;
  formattedDate: string | null;
  date?: string | null;
  message: string;
  children: ReactNode;
}

export function IvoryEditorialWedding({
  title,
  formattedDate,
  date,
  message,
  children,
}: IvoryEditorialWeddingProps) {
  return (
    <section className={styles.ivoryStage}>
      <div className={styles.ivoryCopy}>
        <h1>{title}</h1>
        {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
        <p>{message}</p>
      </div>
      <div className={styles.ivoryUpload}>{children}</div>
    </section>
  );
}
