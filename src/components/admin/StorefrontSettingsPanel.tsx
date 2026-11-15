"use client";

import Link from "next/link";
import { ExternalLink, Save, Store, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { BUSINESS_TYPE_LABELS } from "@/lib/business-directory";
import type { BusinessStorefront, BusinessType } from "@/lib/models";
import { Notice } from "./Fields";

type StorefrontResponse = {
  storefront: BusinessStorefront;
  business_types: BusinessType[];
  preview_url: string;
};

export function StorefrontSettingsPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState<BusinessStorefront | null>(null);
  const [busy, setBusy] = useState(false);
  const storefront = useQuery({
    queryKey: ["partner-storefront"],
    queryFn: () => api<StorefrontResponse>("/admin/storefront"),
  });
  useEffect(() => {
    if (storefront.data) setForm(storefront.data.storefront);
  }, [storefront.data]);

  async function save(status: BusinessStorefront["status"]) {
    if (!form) return;
    setBusy(true);
    try {
      const editable = {
        slug: form.slug,
        short_description: form.short_description,
        about: form.about,
        cover_images: form.cover_images,
        service_cities: form.service_cities,
        featured_services: form.featured_services,
        whatsapp_phone: form.whatsapp_phone,
        show_phone: form.show_phone,
        show_address: form.show_address,
      };
      const updated = await api<StorefrontResponse>("/admin/storefront", {
        method: "PATCH",
        body: JSON.stringify({ ...editable, status }),
      });
      setForm(updated.storefront);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["partner-storefront"] }),
        qc.invalidateQueries({ queryKey: ["public-businesses"] }),
      ]);
      toast.success(
        status === "published"
          ? "Dijital mağaza yayınlandı."
          : status === "suspended"
            ? "Dijital mağaza yayından kaldırıldı."
            : "Mağaza taslağı kaydedildi.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Mağaza kaydedilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (storefront.error) return <Notice>{storefront.error.message}</Notice>;
  if (!form)
    return <div className="admin-empty">Dijital mağaza yükleniyor…</div>;

  const categories = storefront.data?.business_types || [];
  const published = form.status === "published";
  return (
    <section
      id="storefront-settings"
      className="admin-panel partner-settings-section storefront-settings"
    >
      <header>
        <Store size={21} />
        <div>
          <h3>Dijital mağaza</h3>
          <p>
            İşletmenizin genel profilde görünen açıklamasını, hizmet bölgelerini
            ve iletişim tercihlerini yönetin.
          </p>
        </div>
        <span className={`storefront-status ${form.status}`}>
          {published
            ? "Yayında"
            : form.status === "suspended"
              ? "Askıda"
              : "Taslak"}
        </span>
      </header>

      <div
        className="storefront-category-list"
        aria-label="İşletme kategorileri"
      >
        {categories.map((category) => (
          <span key={category}>{BUSINESS_TYPE_LABELS[category]}</span>
        ))}
      </div>

      <div className="partner-settings-grid">
        <label className="form-field">
          <span>Mağaza adresi</span>
          <div className="storefront-slug-field">
            <small>shineqr.com/isletmeler/</small>
            <input
              value={form.slug}
              maxLength={100}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value.toLowerCase() })
              }
            />
          </div>
        </label>
        <label className="form-field">
          <span>WhatsApp telefonu</span>
          <input
            value={form.whatsapp_phone}
            inputMode="numeric"
            placeholder="05xxxxxxxxx"
            onChange={(event) =>
              setForm({
                ...form,
                whatsapp_phone: event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 11),
              })
            }
          />
        </label>
        <label className="form-field partner-settings-wide">
          <span>Kısa mağaza açıklaması</span>
          <textarea
            value={form.short_description}
            maxLength={240}
            placeholder="Müşterilerinizin sizi neden tercih etmesi gerektiğini kısaca anlatın."
            onChange={(event) =>
              setForm({ ...form, short_description: event.target.value })
            }
          />
          <small>
            {form.short_description.length}/240 · Yayınlamak için en az 20
            karakter
          </small>
        </label>
        <label className="form-field partner-settings-wide">
          <span>İşletme hakkında</span>
          <textarea
            value={form.about}
            maxLength={4000}
            rows={6}
            onChange={(event) =>
              setForm({ ...form, about: event.target.value })
            }
          />
        </label>
        <label className="form-field partner-settings-wide">
          <span>Hizmet verilen şehirler</span>
          <input
            value={form.service_cities.join(", ")}
            placeholder="Elazığ, Malatya"
            onChange={(event) =>
              setForm({
                ...form,
                service_cities: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 20),
              })
            }
          />
          <small>Yayınlamak için en az bir şehir ekleyin.</small>
        </label>
        <label className="form-field partner-settings-wide">
          <span>Öne çıkan hizmetler</span>
          <input
            value={form.featured_services.join(", ")}
            placeholder="Düğün çekimi, albüm, drone"
            onChange={(event) =>
              setForm({
                ...form,
                featured_services: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 12),
              })
            }
          />
        </label>
        <label className="partner-setting-toggle">
          <span>
            <strong>Telefonu mağazada göster</strong>
            <small>
              İşletmenin kayıtlı telefonu genel profilde yayınlanır.
            </small>
          </span>
          <input
            type="checkbox"
            checked={form.show_phone}
            onChange={(event) =>
              setForm({ ...form, show_phone: event.target.checked })
            }
          />
        </label>
        <label className="partner-setting-toggle">
          <span>
            <strong>Adresi mağazada göster</strong>
            <small>İşletmenin kayıtlı adresi genel profilde yayınlanır.</small>
          </span>
          <input
            type="checkbox"
            checked={form.show_address}
            onChange={(event) =>
              setForm({ ...form, show_address: event.target.checked })
            }
          />
        </label>
      </div>

      <div className="storefront-media-note">
        <UploadCloud size={18} />
        <p>
          Kapak galerisi için güvenli medya yükleme alanı ürün/hizmet kataloğu
          diliminde eklenecek. Mevcut kapaklar korunur.
        </p>
      </div>

      <div className="storefront-actions">
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => save("draft")}
        >
          <Save size={16} /> Taslak kaydet
        </button>
        {published ? (
          <button
            type="button"
            className="admin-button danger"
            disabled={busy}
            onClick={() => save("suspended")}
          >
            Yayından kaldır
          </button>
        ) : (
          <button
            type="button"
            className="admin-button primary"
            disabled={busy}
            onClick={() => save("published")}
          >
            Mağazayı yayınla
          </button>
        )}
        {published && storefront.data ? (
          <Link
            className="admin-button"
            href={storefront.data.preview_url}
            target="_blank"
          >
            Mağazayı görüntüle <ExternalLink size={15} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
