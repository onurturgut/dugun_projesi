"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import { faqs, themes } from "./data";
import styles from "./marketing.module.css";

const homeCategories = [
  "Ivory Editorial",
  "Velvet Flow",
  "Botanical",
  "Modern Arch",
  "Aurora",
  "Champagne",
  "Retro Romance",
  "Mediterranean",
  "Cinematic",
  "Timeless",
] as const;

export function HomeThemeShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const theme = themes[activeIndex];

  return (
    <>
      <div className={styles.themeTabs} role="tablist" aria-label="Etkinlik temaları">
        {homeCategories.map((category, index) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            className={activeIndex === index ? styles.themeTabActive : undefined}
            key={category}
            onClick={() => setActiveIndex(index)}
          >
            {category}
          </button>
        ))}
      </div>
      <div className={styles.homeThemeStage}>
        <button
          type="button"
          className={styles.themeProductCard}
          onClick={() => setPreviewOpen(true)}
          aria-label={`${theme.displayName} temasını önizle`}
        >
          <span className={styles.themeProductImage}>
            <Image src={theme.image} alt={`${theme.displayName} QR kartı`} fill sizes="(max-width: 760px) 76vw, 430px" />
          </span>
          <span className={styles.themeProductMeta}>
            <small>{homeCategories[activeIndex]}</small>
            <strong>{theme.displayName}</strong>
          </span>
        </button>
        <div className={styles.themePhone} aria-label={`${theme.displayName} mobil görünümü`}>
          <span className={styles.phoneSpeaker} aria-hidden="true" />
          <div className={styles.themePhoneScreen} style={{ backgroundColor: theme.primary }}>
            <Image
              src={theme.weddingImage}
              alt={`${theme.displayName} Wedding tasarımı`}
              fill
              sizes="300px"
            />
          </div>
        </div>
        <div className={styles.themeStageCopy}>
          <p className={styles.eyebrow}>EŞLEŞEN DENEYİM</p>
          <h3>Masadan ekrana aynı tasarım dili.</h3>
          <p>Fiziksel QR kartınız ve mobil karşılama deneyiminiz birlikte şekillenir.</p>
          <button type="button" onClick={() => setPreviewOpen(true)}>
            Büyük önizle <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      {previewOpen && (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setPreviewOpen(false)}>
          <div className={styles.premiumThemeModal} role="dialog" aria-modal="true" aria-label={`${theme.displayName} önizlemesi`} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.close} onClick={() => setPreviewOpen(false)} aria-label="Kapat"><X /></button>
            <div className={styles.premiumModalImage}>
              <Image src={theme.image} alt={`${theme.displayName} QR kartı`} fill sizes="90vw" />
            </div>
            <div>
              <p className={styles.eyebrow}>{homeCategories[activeIndex]}</p>
              <h2>{theme.displayName}</h2>
              <p>QR kartı ve mobil deneyim için seçilen premium ShineQR tasarımı.</p>
              <a className={styles.primary} href="/auth">Bu temayla başla</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ThemeGallery({ limit }: { limit?: number }) {
  const [selected, setSelected] = useState<(typeof themes)[number] | null>(
    null,
  );
  const shown = limit ? themes.slice(0, limit) : themes;
  return (
    <>
      <div className={styles.themeGrid}>
        {shown.map((theme) => (
          <button
            type="button"
            key={theme.id}
            className={styles.themeCard}
            onClick={() => setSelected(theme)}
          >
            <div className={styles.themeImage}>
              <Image
                src={theme.image}
                alt={`${theme.displayName} QR kartı`}
                fill
                sizes="(max-width: 700px) 47vw, 260px"
              />
            </div>
            <span>{theme.category}</span>
            <strong>{theme.displayName}</strong>
            <small>QR kartı ve yükleme ekranını incele</small>
          </button>
        ))}
      </div>
      {selected && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.displayName} önizlemesi`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.close}
              onClick={() => setSelected(null)}
              aria-label="Kapat"
            >
              <X />
            </button>
            <div className={styles.modalVisual}>
              <Image
                src={selected.image}
                alt={`${selected.displayName} QR masa kartı`}
                fill
                sizes="90vw"
              />
            </div>
            <div>
              <p className={styles.eyebrow}>{selected.category}</p>
              <h2>{selected.displayName}</h2>
              <p>
                Bu görünüm gerçek ShineQR kart tasarımıdır. Tema, QR kartı ile
                misafir yükleme deneyiminin renklerini birlikte taşır.
              </p>
              <a className={styles.primary} href="/auth">
                Bu temayla başla
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function FaqList({ limit }: { limit?: number }) {
  return (
    <div className={styles.faqList}>
      {(limit ? faqs.slice(0, limit) : faqs).map(([question, answer]) => (
        <details key={question}>
          <summary>
            {question}
            <ChevronDown size={19} />
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}

export function ContactForm() {
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <div className={styles.success}>
        <Check size={28} />
        <h2>Mesajınız hazır.</h2>
        <p>
          E-posta uygulamanız açıldıysa mesajı göndererek bizimle
          paylaşabilirsiniz.
        </p>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setSent(false)}
        >
          Yeni mesaj
        </button>
      </div>
    );
  return (
    <form
      className={styles.contactForm}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const subject = encodeURIComponent(
          String(data.get("subject") || "ShineQR bilgi talebi"),
        );
        const body = encodeURIComponent(
          `Ad soyad: ${data.get("name")}\nTelefon: ${data.get("phone") || "-"}\n\n${data.get("message")}`,
        );
        window.location.href = `mailto:info@shineqr.com?subject=${subject}&body=${body}`;
        setSent(true);
      }}
    >
      <label>
        Ad soyad
        <input name="name" required autoComplete="name" />
      </label>
      <label>
        E-posta
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Telefon <small>(opsiyonel)</small>
        <input name="phone" type="tel" autoComplete="tel" />
      </label>
      <label>
        Konu
        <select name="subject" defaultValue="">
          <option value="" disabled>
            Seçiniz
          </option>
          <option>ShineQR bilgi talebi</option>
          <option>Kurumsal iş birliği</option>
          <option>Teknik destek</option>
        </select>
      </label>
      <label className={styles.fullField}>
        Mesaj
        <textarea name="message" rows={6} required />
      </label>
      <button className={styles.primary} type="submit">
        Mesajı hazırla
      </button>
    </form>
  );
}
