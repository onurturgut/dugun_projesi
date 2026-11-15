"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  BUSINESS_TYPE_LABELS,
  type PublicBusiness,
} from "@/lib/business-directory";
import type { PublicCatalogItem } from "@/lib/business-catalog";
import styles from "./business.module.css";
import { LeadForm } from "./LeadForm";

const fallbackImage = "/marketing/shineqr-wedding-hero-composition.png";
const money = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    cents / 100,
  );

export function BusinessDetail({ slug }: { slug: string }) {
  const business = useQuery({
    queryKey: ["public-business", slug],
    queryFn: () =>
      api<PublicBusiness>(`/businesses/${encodeURIComponent(slug)}`),
  });
  const catalog = useQuery({
    queryKey: ["public-business-catalog", slug],
    queryFn: () =>
      api<PublicCatalogItem[]>(
        `/businesses/${encodeURIComponent(slug)}/catalog`,
      ),
  });
  if (business.isLoading)
    return <div className={styles.state}>Mağaza yükleniyor…</div>;
  if (!business.data)
    return (
      <div className={styles.state} role="alert">
        Bu işletme mağazası bulunamadı veya yayında değil.
      </div>
    );
  const item = business.data;
  const cover =
    item.cover_images.find((image) => image.startsWith("/")) || fallbackImage;
  return (
    <article className={styles.detail}>
      <Link href="/isletmeler" className={styles.backLink}>
        <ArrowLeft size={16} /> İşletmelere dön
      </Link>
      <section className={styles.detailHero}>
        <div className={styles.detailCopy}>
          <span className={styles.detailLogo}>
            {item.logo_url.startsWith("/") ? (
              <Image src={item.logo_url} alt="" width={64} height={64} />
            ) : (
              <Building2 aria-hidden="true" />
            )}
          </span>
          <p className={styles.eyebrow}>SHINEQR İŞLETMESİ</p>
          <h1>{item.name}</h1>
          <p className={styles.categoryLine}>
            {item.business_types
              .map((type) => BUSINESS_TYPE_LABELS[type])
              .join(" · ")}
          </p>
          {item.short_description ? <p>{item.short_description}</p> : null}
          <div className={styles.contactRow}>
            {item.whatsapp_phone ? (
              <a
                href={`https://wa.me/90${item.whatsapp_phone.slice(1)}`}
                className={styles.primaryAction}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} /> WhatsApp
              </a>
            ) : null}
            {item.phone ? (
              <a href={`tel:${item.phone}`} className={styles.primaryAction}>
                <Phone size={17} /> Ara
              </a>
            ) : null}
            {item.service_cities.length ? (
              <span>
                <MapPin size={17} /> {item.service_cities.join(", ")}
              </span>
            ) : null}
          </div>
        </div>
        <div className={styles.detailImage}>
          <Image
            src={cover}
            alt=""
            fill
            priority
            sizes="(max-width: 800px) 100vw, 50vw"
          />
        </div>
      </section>
      {catalog.data?.length ? (
        <section className={styles.catalogSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>DİJİTAL MAĞAZA</p>
              <h2>Ürünler ve hizmetler</h2>
            </div>
          </div>
          <div className={styles.catalogGrid}>
            {catalog.data.map((catalogItem) => {
              const image = catalogItem.image_url.startsWith("/")
                ? catalogItem.image_url
                : fallbackImage;
              return (
                <article className={styles.catalogCard} key={catalogItem.id}>
                  <div className={styles.catalogImage}>
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(max-width: 760px) 100vw, 33vw"
                    />
                  </div>
                  <div>
                    <span>{catalogItem.category}</span>
                    <h3>{catalogItem.name}</h3>
                    <p>{catalogItem.description}</p>
                    <strong>
                      {catalogItem.price_display === "quote_only"
                        ? "Teklif alın"
                        : `${catalogItem.price_display === "from" ? "Başlangıç " : ""}${money(catalogItem.gross_price_cents || 0)}`}
                      {catalogItem.unit_label
                        ? ` / ${catalogItem.unit_label}`
                        : ""}
                    </strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      <LeadForm slug={slug} catalog={catalog.data || []} />
      <section className={styles.detailSection}>
        <div>
          <p className={styles.eyebrow}>İŞLETME HAKKINDA</p>
          <h2>Hizmetler ve çalışma alanı</h2>
          <p>{item.about || "İşletme mağaza içeriğini henüz tamamlamadı."}</p>
        </div>
        <aside className={styles.infoCard}>
          <h3>Öne çıkan hizmetler</h3>
          {item.featured_services.length ? (
            <ul>
              {item.featured_services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          ) : (
            <p>Hizmet kataloğu hazırlanıyor.</p>
          )}
          {item.address ? (
            <p>
              <MapPin size={16} /> {item.address}
            </p>
          ) : null}
        </aside>
      </section>
    </article>
  );
}
