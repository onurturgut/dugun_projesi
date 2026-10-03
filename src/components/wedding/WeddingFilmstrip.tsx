"use client";

import Image from "next/image";
import styles from "./WeddingFilmstrip.module.css";

interface WeddingFilmstripProps {
  images: string[];
  alt: string;
  date?: string | null;
}

interface FilmRowProps {
  images: string[];
  alt: string;
  direction: "left" | "right";
}

function fillReel(images: string[]) {
  const reel = [...images];
  const minimumFrames = 10;

  while (reel.length < minimumFrames) {
    reel.push(images[reel.length % images.length]);
  }

  while (reel.length % 5 !== 0) {
    reel.push(images[reel.length % images.length]);
  }

  return reel;
}

function FilmRow({ images, alt, direction }: FilmRowProps) {
  const reel = fillReel(images);

  return (
    <div className={styles.row}>
      <div className={`${styles.track} ${direction === "left" ? styles.moveLeft : styles.moveRight}`}>
        {[0, 1].map((copy) => (
          <div className={styles.sequence} aria-hidden={copy > 0} key={copy}>
            {reel.map((src, index) => (
              <figure className={styles.frame} key={`${copy}-${src}-${index}`}>
                <Image
                  unoptimized
                  src={src}
                  alt={copy === 0 ? `${alt} fotoğraf ${index + 1}` : ""}
                  fill
                  loading="eager"
                  decoding="async"
                  sizes="(max-width: 700px) 42vw, 270px"
                  className={styles.image}
                />
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeddingFilmstrip({ images, alt }: WeddingFilmstripProps) {
  const gallery = images.length ? images : ["/covers/couple-1.jpg"];
  const topImages = gallery.filter((_, index) => index % 2 === 0);
  const bottomImages = gallery.filter((_, index) => index % 2 === 1);

  return (
    <section className={styles.stage} aria-label={`${alt} düğün fotoğrafları`}>
      <FilmRow images={topImages.length ? topImages : gallery} alt={alt} direction="left" />
      <FilmRow images={bottomImages.length ? bottomImages : gallery} alt={alt} direction="right" />
    </section>
  );
}
