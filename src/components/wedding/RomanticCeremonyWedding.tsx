import Image from "next/image";
import { Heart } from "lucide-react";
import type { ReactNode } from "react";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface RomanticCeremonyWeddingProps {
  title: string;
  formattedDate: string | null;
  date?: string | null;
  message: string;
  children: ReactNode;
}

export function RomanticCeremonyWedding({
  title,
  formattedDate,
  date,
  message,
  children,
}: RomanticCeremonyWeddingProps) {
  return (
    <section className={styles.romanticCeremonyStage}>
      <div className={styles.romanticCeremonyCopy}>
        <Image
          src="/wedding-designs/romantic-ceremony-monogram.png"
          alt="E ve H düğün monogramı"
          width={1536}
          height={864}
          className={styles.romanticCeremonyLogo}
          preload
        />
        <h1>{title}</h1>
        {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
        <p>{message}</p>
        <span className={styles.romanticCeremonyDivider} aria-hidden="true">
          <i /><Heart size={17} fill="currentColor" /><i />
        </span>
      </div>
      <div className={styles.romanticCeremonyUpload}>{children}</div>
    </section>
  );
}
