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
          src="/wedding-designs/mugla-university-logo-transparent.png"
          alt="Muğla Sıtkı Koçman Üniversitesi"
          width={1080}
          height={1456}
          className={styles.romanticCeremonyLogo}
          priority
        />
        <h1>{title}</h1>
        {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
        <p>{message}</p>
        <strong>Anılarımızı birlikte biriktirelim</strong>
        <span className={styles.romanticCeremonyDivider} aria-hidden="true">
          <i /><Heart size={17} fill="currentColor" /><i />
        </span>
      </div>
      <div className={styles.romanticCeremonyUpload}>{children}</div>
    </section>
  );
}
