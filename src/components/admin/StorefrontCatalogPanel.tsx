"use client";

import { Edit3, PackagePlus, Power, Save, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BusinessCatalogItem } from "@/lib/models";
import { Notice } from "./Fields";

type Draft = {
  kind: BusinessCatalogItem["kind"];
  name: string;
  description: string;
  category: string;
  image_url: string;
  price_display: BusinessCatalogItem["price_display"];
  price_lira: string;
  unit_label: string;
  active: boolean;
  display_order: number;
};

const emptyDraft: Draft = {
  kind: "service",
  name: "",
  description: "",
  category: "",
  image_url: "",
  price_display: "quote_only",
  price_lira: "",
  unit_label: "",
  active: false,
  display_order: 0,
};

const money = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    cents / 100,
  );

function payload(draft: Draft) {
  const amount = draft.price_lira.trim().replace(",", ".");
  return {
    kind: draft.kind,
    name: draft.name,
    description: draft.description,
    category: draft.category,
    image_url: draft.image_url,
    price_display: draft.price_display,
    gross_price_cents:
      draft.price_display === "quote_only"
        ? null
        : Math.round(Number(amount) * 100),
    unit_label: draft.unit_label,
    active: draft.active,
    display_order: draft.display_order,
  };
}

function draftFor(item: BusinessCatalogItem): Draft {
  return {
    kind: item.kind,
    name: item.name,
    description: item.description,
    category: item.category,
    image_url: item.image_url,
    price_display: item.price_display,
    price_lira:
      item.gross_price_cents === null
        ? ""
        : String(item.gross_price_cents / 100),
    unit_label: item.unit_label,
    active: item.active,
    display_order: item.display_order,
  };
}

export function StorefrontCatalogPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const catalog = useQuery({
    queryKey: ["storefront-catalog"],
    queryFn: () => api<BusinessCatalogItem[]>("/admin/storefront-catalog"),
  });

  async function save() {
    setBusy(true);
    try {
      await api(
        editingId
          ? `/admin/storefront-catalog/${editingId}`
          : "/admin/storefront-catalog",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload(draft)),
        },
      );
      setDraft(emptyDraft);
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ["storefront-catalog"] });
      toast.success(
        editingId ? "Katalog kaydı güncellendi." : "Katalog kaydı oluşturuldu.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Katalog kaydedilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: BusinessCatalogItem) {
    setBusy(true);
    try {
      await api(`/admin/storefront-catalog/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          kind: item.kind,
          name: item.name,
          description: item.description,
          category: item.category,
          image_url: item.image_url,
          price_display: item.price_display,
          gross_price_cents: item.gross_price_cents,
          unit_label: item.unit_label,
          active: !item.active,
          display_order: item.display_order,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["storefront-catalog"] });
      toast.success(
        item.active
          ? "Kayıt mağazadan kaldırıldı."
          : "Kayıt mağazada yayınlandı.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Durum değiştirilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="catalog-settings"
      className="admin-panel partner-settings-section storefront-catalog"
    >
      <header>
        <PackagePlus size={21} />
        <div>
          <h3>Ürün ve hizmet kataloğu</h3>
          <p>
            Mağazanızda gösterilecek ürünleri, hizmetleri ve paketleri yönetin.
          </p>
        </div>
      </header>
      {catalog.error ? <Notice>{catalog.error.message}</Notice> : null}
      <div className="catalog-editor-grid">
        <label className="form-field">
          <span>Kayıt türü</span>
          <select
            value={draft.kind}
            onChange={(event) =>
              setDraft({ ...draft, kind: event.target.value as Draft["kind"] })
            }
          >
            <option value="service">Hizmet</option>
            <option value="product">Ürün</option>
            <option value="package">Paket</option>
          </select>
        </label>
        <label className="form-field">
          <span>Kategori</span>
          <input
            value={draft.category}
            maxLength={100}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value })
            }
          />
        </label>
        <label className="form-field">
          <span>Ad</span>
          <input
            value={draft.name}
            maxLength={160}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
          />
        </label>
        <label className="form-field">
          <span>Fiyat görünümü</span>
          <select
            value={draft.price_display}
            onChange={(event) =>
              setDraft({
                ...draft,
                price_display: event.target.value as Draft["price_display"],
                price_lira:
                  event.target.value === "quote_only" ? "" : draft.price_lira,
              })
            }
          >
            <option value="quote_only">Teklif al</option>
            <option value="from">Başlangıç fiyatı</option>
            <option value="fixed">Sabit fiyat</option>
          </select>
        </label>
        {draft.price_display !== "quote_only" ? (
          <label className="form-field">
            <span>KDV dahil fiyat (₺)</span>
            <input
              inputMode="decimal"
              value={draft.price_lira}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  price_lira: event.target.value.replace(/[^0-9.,]/g, ""),
                })
              }
            />
          </label>
        ) : null}
        <label className="form-field">
          <span>Birim</span>
          <input
            value={draft.unit_label}
            maxLength={40}
            placeholder="organizasyon, adet, paket"
            onChange={(event) =>
              setDraft({ ...draft, unit_label: event.target.value })
            }
          />
        </label>
        <label className="form-field catalog-wide">
          <span>Açıklama</span>
          <textarea
            value={draft.description}
            maxLength={1200}
            rows={4}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </label>
        <label className="form-field catalog-wide">
          <span>Görsel adresi</span>
          <input
            value={draft.image_url}
            maxLength={2048}
            placeholder="HTTPS veya ShineQR medya adresi"
            onChange={(event) =>
              setDraft({ ...draft, image_url: event.target.value })
            }
          />
        </label>
        <label className="partner-setting-toggle">
          <span>
            <strong>Mağazada aktif</strong>
            <small>Kaydedildiğinde genel mağazada gösterilir.</small>
          </span>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) =>
              setDraft({ ...draft, active: event.target.checked })
            }
          />
        </label>
        <label className="form-field">
          <span>Gösterim sırası</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={draft.display_order}
            onChange={(event) =>
              setDraft({ ...draft, display_order: Number(event.target.value) })
            }
          />
        </label>
      </div>
      <div className="storefront-actions">
        <button
          type="button"
          className="admin-button primary"
          disabled={busy}
          onClick={save}
        >
          <Save size={16} />{" "}
          {editingId ? "Değişiklikleri kaydet" : "Kataloğa ekle"}
        </button>
        {editingId ? (
          <button
            type="button"
            className="admin-button"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft);
            }}
          >
            <X size={16} /> Vazgeç
          </button>
        ) : null}
      </div>
      <div className="catalog-list">
        {catalog.isLoading ? <p>Katalog yükleniyor…</p> : null}
        {catalog.data?.map((item) => (
          <article key={item.id}>
            <div>
              <span>
                {item.kind === "service"
                  ? "Hizmet"
                  : item.kind === "product"
                    ? "Ürün"
                    : "Paket"}
              </span>
              <h4>{item.name}</h4>
              <p>
                {item.category} ·{" "}
                {item.price_display === "quote_only"
                  ? "Teklif al"
                  : `${item.price_display === "from" ? "Başlangıç " : ""}${money(item.gross_price_cents || 0)}`}
              </p>
            </div>
            <em className={item.active ? "active" : "passive"}>
              {item.active ? "Aktif" : "Pasif"}
            </em>
            <button
              type="button"
              className="admin-button"
              onClick={() => {
                setEditingId(item.id);
                setDraft(draftFor(item));
              }}
            >
              <Edit3 size={14} /> Düzenle
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => toggle(item)}
            >
              <Power size={14} /> {item.active ? "Pasife al" : "Yayınla"}
            </button>
          </article>
        ))}
        {!catalog.isLoading && !catalog.data?.length ? (
          <p className="admin-hint">Henüz ürün veya hizmet eklenmedi.</p>
        ) : null}
      </div>
    </section>
  );
}
