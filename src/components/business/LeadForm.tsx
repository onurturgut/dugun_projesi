"use client";

import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { PublicCatalogItem } from "@/lib/business-catalog";
import styles from "./business.module.css";

export function LeadForm({
  slug,
  catalog,
}: {
  slug: string;
  catalog: PublicCatalogItem[];
}) {
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/businesses/${encodeURIComponent(slug)}/leads`, {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: requestId,
          catalog_item_id: form.get("catalog_item_id") || null,
          customer_name: form.get("customer_name"),
          customer_email: form.get("customer_email"),
          customer_phone: form.get("customer_phone"),
          event_type: form.get("event_type"),
          event_date: form.get("event_date"),
          city: form.get("city"),
          message: form.get("message"),
          contact_preference: form.get("contact_preference"),
          privacy_notice_accepted: form.get("privacy_notice_accepted") === "on",
          marketing_consent: form.get("marketing_consent") === "on",
        }),
      });
      setSent(true);
      setRequestId(crypto.randomUUID());
      event.currentTarget.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Talep gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <section className={styles.leadSuccess} aria-live="polite">
        <CheckCircle2 size={34} />
        <div>
          <h2>Talebiniz işletmeye iletildi.</h2>
          <p>
            İşletme, seçtiğiniz iletişim yöntemi üzerinden sizinle iletişime
            geçebilir.
          </p>
          <button type="button" onClick={() => setSent(false)}>
            Yeni talep oluştur
          </button>
        </div>
      </section>
    );

  return (
    <section className={styles.leadSection} id="teklif-al">
      <div>
        <p className={styles.eyebrow}>TEKLİF VE MÜSAİTLİK</p>
        <h2>İşletmeyle iletişime geçin.</h2>
        <p>
          Talebiniz doğrudan bu işletmenin ShineQR CRM alanına iletilir. Bu form
          satış veya ödeme oluşturmaz.
        </p>
      </div>
      <form className={styles.leadForm} onSubmit={submit}>
        <label>
          <span>Ad soyad</span>
          <input name="customer_name" minLength={2} maxLength={120} required />
        </label>
        <label>
          <span>Telefon</span>
          <input
            name="customer_phone"
            inputMode="numeric"
            pattern="0[0-9]{10}"
            placeholder="05xxxxxxxxx"
            required
          />
        </label>
        <label>
          <span>E-posta</span>
          <input name="customer_email" type="email" maxLength={254} required />
        </label>
        <label>
          <span>İletişim tercihi</span>
          <select name="contact_preference" defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Telefon</option>
            <option value="email">E-posta</option>
          </select>
        </label>
        <label>
          <span>Organizasyon türü</span>
          <input
            name="event_type"
            maxLength={80}
            placeholder="Düğün, nişan, çekim…"
            required
          />
        </label>
        <label>
          <span>Organizasyon tarihi</span>
          <input name="event_date" type="date" />
        </label>
        <label>
          <span>Şehir</span>
          <input name="city" maxLength={100} required />
        </label>
        <label>
          <span>İlgilenilen ürün veya hizmet</span>
          <select name="catalog_item_id" defaultValue="">
            <option value="">Genel bilgi almak istiyorum</option>
            {catalog.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.leadWide}>
          <span>Mesaj</span>
          <textarea name="message" maxLength={2000} rows={4} />
        </label>
        <label className={`${styles.consent} ${styles.leadWide}`}>
          <input name="privacy_notice_accepted" type="checkbox" required />
          <span>
            <Link href="/hukuki/kvkk-aydinlatma" target="_blank">
              KVKK aydınlatma metnini
            </Link>{" "}
            okudum. Talebimin ilgili işletmeye iletilmesini kabul ediyorum.
          </span>
        </label>
        <label className={`${styles.consent} ${styles.leadWide}`}>
          <input name="marketing_consent" type="checkbox" />
          <span>
            Kampanya ve tanıtım iletişimi almak istiyorum. Bu seçim teklif
            talebi için zorunlu değildir.
          </span>
        </label>
        {error ? (
          <p className={`${styles.formError} ${styles.leadWide}`} role="alert">
            {error}
          </p>
        ) : null}
        <button
          className={`${styles.primaryAction} ${styles.leadWide}`}
          disabled={busy}
        >
          <Send size={17} />{" "}
          {busy ? "Gönderiliyor…" : "Talebi işletmeye gönder"}
        </button>
      </form>
    </section>
  );
}
