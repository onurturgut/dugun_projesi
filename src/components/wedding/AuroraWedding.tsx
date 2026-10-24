import type { ReactNode } from "react";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface AuroraWeddingProps {
  title: string;
  formattedDate: string | null;
  date?: string | null;
  message: string;
  children: ReactNode;
}

function getInitials(title: string) {
  const names = title.split(/\s*(?:&|ve)\s*|\s+/i).filter(Boolean);
  if (names.length === 1) return names[0]?.slice(0, 2).toLocaleUpperCase("tr-TR") || "";
  return `${names[0]?.[0] || ""}${names.at(-1)?.[0] || ""}`.toLocaleUpperCase("tr-TR");
}

export function AuroraWedding({
  title,
  formattedDate,
  date,
  message,
  children,
}: AuroraWeddingProps) {
  return (
    <section className={styles.auroraStage}>
      <div className={styles.auroraCopy}>
        <span className={styles.auroraMonogram} aria-hidden="true">{getInitials(title)}</span>
        <h1>{title}</h1>
        {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
        <p>{message}</p>
      </div>
      <div className={styles.auroraUpload}>{children}</div>
    </section>
  );
}
