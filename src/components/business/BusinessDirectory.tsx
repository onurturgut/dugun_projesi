"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPES,
  type PublicBusiness,
} from "@/lib/business-directory";
import type { BusinessType } from "@/lib/models";
import styles from "./business.module.css";

const fallbackImage = "/marketing/shineqr-wedding-hero-composition.png";
const imageFor = (business: PublicBusiness) =>
  business.cover_images.find((image) => image.startsWith("/")) || fallbackImage;

export function BusinessDirectory() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<BusinessType | "all">("all");
  const businesses = useQuery({
    queryKey: ["public-businesses"],
    queryFn: () => api<PublicBusiness[]>("/businesses"),
  });
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return (businesses.data || []).filter((business) => {
      const matchesType =
        type === "all" || business.business_types.includes(type);
      const haystack = [
        business.name,
        business.short_description,
        ...business.service_cities,
        ...business.featured_services,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return matchesType && (!term || haystack.includes(term));
    });
  }, [businesses.data, search, type]);

  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>DOĞRULANMIŞ SHINEQR İŞLETMELERİ</p>
          <h1>Özel gününüz için doğru profesyoneller.</h1>
          <p>
            İşletmeleri, dijital mağazalarını ve sundukları hizmetleri tek bir
            yerden keşfedin.
          </p>
        </div>
        <Image
          src="/marketing/celebration.webp"
          alt="Özenle hazırlanmış bir organizasyon alanı"
          width={900}
          height={620}
          priority
        />
      </section>

      <section className={styles.directory} aria-labelledby="business-heading">
        <div className={styles.searchBar}>
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="business-search">
            İşletme, şehir veya hizmet ara
          </label>
          <input
            id="business-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="İşletme, şehir veya hizmet ara…"
          />
        </div>
        <div className={styles.filters} aria-label="İşletme kategorileri">
          <button
            type="button"
            className={type === "all" ? styles.activeFilter : ""}
            onClick={() => setType("all")}
          >
            Tümü
          </button>
          {BUSINESS_TYPES.filter((item) => item !== "other").map((item) => (
            <button
              type="button"
              className={type === item ? styles.activeFilter : ""}
              onClick={() => setType(item)}
              key={item}
            >
              {BUSINESS_TYPE_LABELS[item]}
            </button>
          ))}
        </div>

        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>DİJİTAL MAĞAZALAR</p>
            <h2 id="business-heading">İşletmeleri keşfedin</h2>
          </div>
          {!businesses.isLoading ? <span>{visible.length} işletme</span> : null}
        </div>

        {businesses.isLoading ? (
          <div className={styles.state}>İşletmeler yükleniyor…</div>
        ) : businesses.error ? (
          <div className={styles.state} role="alert">
            İşletmeler şu anda yüklenemedi. Lütfen daha sonra yeniden deneyin.
          </div>
        ) : visible.length ? (
          <div className={styles.grid}>
            {visible.map((business) => (
              <article className={styles.businessCard} key={business.id}>
                <div className={styles.cardMedia}>
                  <Image
                    src={imageFor(business)}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>
                    <span className={styles.logoBox}>
                      {business.logo_url.startsWith("/") ? (
                        <Image
                          src={business.logo_url}
                          alt=""
                          width={36}
                          height={36}
                        />
                      ) : (
                        <Building2 aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <h3>{business.name}</h3>
                      <p>
                        {business.business_types
                          .map((item) => BUSINESS_TYPE_LABELS[item])
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  {business.service_cities.length ? (
                    <p className={styles.location}>
                      <MapPin size={15} aria-hidden="true" />
                      {business.service_cities.join(", ")}
                    </p>
                  ) : null}
                  {business.short_description ? (
                    <p>{business.short_description}</p>
                  ) : null}
                  <Link
                    href={`/isletmeler/${business.slug}`}
                    className={styles.cardAction}
                  >
                    Dijital mağazayı incele <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.state}>
            Bu filtrelerle eşleşen yayınlanmış bir işletme bulunamadı.
          </div>
        )}
      </section>
    </>
  );
}
