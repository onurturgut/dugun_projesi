"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./marketing.module.css";

type PublicPartner = { id: string; name: string; logo_url: string };

export function HomePartnerStrip() {
  const [partners, setPartners] = useState<PublicPartner[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/partners", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Partnerler yüklenemedi.");
        return (await response.json()) as PublicPartner[];
      })
      .then(setPartners)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setPartners([]);
      });
    return () => controller.abort();
  }, []);

  return (
    <section className={styles.partnerStrip} aria-labelledby="home-partners-title">
      <p id="home-partners-title" className={styles.eyebrow}>İŞ ORTAKLARIMIZ</p>
      {partners?.length ? (
        <div className={styles.homePartnerLogos}>
          {partners.map((partner) => (
            <div className={styles.homePartnerLogo} key={partner.id}>
              <Image src={partner.logo_url} alt={`${partner.name} logosu`} width={220} height={88} sizes="(max-width: 760px) 160px, 220px" unoptimized />
            </div>
          ))}
        </div>
      ) : (
        <span>{partners === null ? "İş ortaklarımız yükleniyor…" : "Doğrulanmış iş ortaklarımız yakında burada."}</span>
      )}
    </section>
  );
}
