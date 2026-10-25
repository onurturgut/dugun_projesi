"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Account, Partner } from "@/lib/models";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Field,
  Notice,
  PasswordField,
  TextField,
} from "@/components/admin/Fields";
import { PartnerLogoUpload } from "@/components/admin/PartnerLogoUpload";
import { SelectField } from "@/components/admin/SelectField";

type OverviewItem = {
  partner_id: string;
  events: number;
  customers: number;
  accounts: number;
  media: number;
  bytes: number;
};
export default function Partners() {
  const qc = useQueryClient();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [createOpen, setCreateOpen] = useState(false),
    [search, setSearch] = useState("");
  const [draftId, setDraftId] = useState(() => crypto.randomUUID()),
    [draftLogo, setDraftLogo] = useState(""),
    [businessType, setBusinessType] = useState("planner");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const list = useQuery({
    queryKey: ["partners"],
    queryFn: () => api<Partner[]>("/admin/partners"),
    enabled: me.data?.role === "platform",
  });
  const overview = useQuery({
    queryKey: ["partner-overview"],
    queryFn: () =>
      api<{
        items: OverviewItem[];
        relationship_model: string;
        usage_rights: { enforcement: string; reason: string };
      }>("/admin/partner-overview"),
    enabled: me.data?.role === "platform",
  });
  const stats = useMemo(
    () => ({
      active: list.data?.filter((item) => item.active).length || 0,
      events:
        overview.data?.items.reduce((sum, item) => sum + item.events, 0) || 0,
      customers:
        overview.data?.items.reduce((sum, item) => sum + item.customers, 0) ||
        0,
    }),
    [list.data, overview.data?.items],
  );
  const partners = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return (list.data || []).filter(
      (item) => !term || item.name.toLocaleLowerCase("tr-TR").includes(term),
    );
  }, [list.data, search]);
  const itemFor = (id: string) =>
    overview.data?.items.find((item) => item.partner_id === id);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const element = e.currentTarget;
    try {
      const values = Object.fromEntries(new FormData(element));
      await api("/admin/partners", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          business_types: [values.business_type],
          id: draftId,
          logo_url: draftLogo,
        }),
      });
      element.reset();
      setDraftLogo("");
      setDraftId(crypto.randomUUID());
      setBusinessType("planner");
      setCreateOpen(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["partners"] }),
        qc.invalidateQueries({ queryKey: ["partner-overview"] }),
      ]);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(partner: Partner) {
    setError("");
    try {
      await api(`/admin/partners/${partner.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !partner.active }),
      });
      await qc.invalidateQueries({ queryKey: ["partners"] });
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  return (
    <AdminShell>
      <div className="admin-heading partners-heading">
        <div>
          <p className="admin-kicker">PLATFORM</p>
          <h1>İşletmeler</h1>
          <p className="admin-subtitle">
            Partner hesaplarını, müşterilerini ve platform kullanımını yönetin.
          </p>
        </div>
        {me.data?.role === "platform" ? (
          <button
            className="admin-button primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={17} /> Yeni işletme
          </button>
        ) : null}
      </div>
      {me.isLoading ? (
        <div className="admin-empty">İşletmeler yükleniyor…</div>
      ) : me.data?.role !== "platform" ? (
        <Notice>Bu alan yalnızca platform yöneticisine açıktır.</Notice>
      ) : (
        <>
          <section className="partner-stat-grid" aria-label="İşletme özeti">
            <article>
              <Building2 size={18} />
              <span>Toplam işletme</span>
              <strong>{list.data?.length || 0}</strong>
            </article>
            <article>
              <ShieldCheck size={18} />
              <span>Aktif işletme</span>
              <strong>{stats.active}</strong>
            </article>
            <article>
              <span>Organizasyonlar</span>
              <strong>{stats.events}</strong>
            </article>
            <article>
              <span>Müşteriler</span>
              <strong>{stats.customers}</strong>
            </article>
          </section>
          {overview.data ? (
            <div className="partner-policy-note">
              <ShieldCheck size={18} />
              <div>
                <strong>Kullanım hakları bilgilendirmesi</strong>
                <p>
                  {overview.data.usage_rights.reason} Müşteri ilişkisi şu anda
                  etkinlik başına tek sahip olarak korunuyor.
                </p>
              </div>
            </div>
          ) : null}
          {error || list.error ? (
            <Notice>{error || list.error?.message}</Notice>
          ) : null}
          <div className="partner-list-toolbar">
            <label className="admin-search">
              <Search size={17} />
              <span className="sr-only">İşletme ara</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="İşletme ara"
              />
            </label>
            <span>{partners.length} işletme</span>
          </div>
          <section className="partner-table-shell">
            <div className="partner-table-head">
              <span>İşletme</span>
              <span>Kullanım</span>
              <span>Durum</span>
              <span>İşlem</span>
            </div>
            {partners.map((partner) => {
              const item = itemFor(partner.id);
              return (
                <article className="partner-table-row" key={partner.id}>
                  <div className="partner-identity">
                    <span className="partner-logo-small">
                      {partner.logo_url ? (
                        <Image
                          src={partner.logo_url}
                          alt=""
                          fill
                          unoptimized
                          sizes="44px"
                        />
                      ) : (
                        partner.name.slice(0, 1)
                      )}
                    </span>
                    <div>
                      <Link href={`/admin/partners/${partner.id}`}>
                        <strong>{partner.name}</strong>
                      </Link>
                      <small>
                        {new Date(partner.created_at).toLocaleDateString(
                          "tr-TR",
                        )}{" "}
                        tarihinde eklendi
                      </small>
                    </div>
                  </div>
                  <div className="partner-usage">
                    <strong>{item?.events || 0} organizasyon</strong>
                    <small>
                      {item?.customers || 0} müşteri · {item?.accounts || 0}{" "}
                      hesap · {item?.media || 0} medya
                    </small>
                  </div>
                  <span
                    className={`admin-status-pill ${partner.active ? "active" : "inactive"}`}
                  >
                    <i />
                    {partner.active ? "Aktif" : "Erişim kapalı"}
                  </span>
                  {partner.id !== "platform" ? (
                    <button
                      className="admin-button"
                      onClick={() => toggle(partner)}
                    >
                      {partner.active ? "Erişimi kapat" : "Erişimi aç"}
                    </button>
                  ) : (
                    <span className="admin-hint">Sistem</span>
                  )}
                </article>
              );
            })}
            {partners.length === 0 ? (
              <div className="admin-empty">
                <h2>İşletme bulunamadı</h2>
                <p>Arama ifadenizi değiştirin.</p>
              </div>
            ) : null}
          </section>
        </>
      )}
      {createOpen ? (
        <div className="admin-drawer-layer" role="presentation">
          <button
            className="admin-drawer-backdrop"
            aria-label="Yeni işletme formunu kapat"
            onClick={() => setCreateOpen(false)}
          />
          <aside
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-partner-title"
          >
            <header>
              <div>
                <span>YENİ KAYIT</span>
                <h2 id="new-partner-title">İşletme oluştur</h2>
              </div>
              <button onClick={() => setCreateOpen(false)} aria-label="Kapat">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={submit} className="partner-create-form">
              <Field label="İşletme adı" name="name" required />
              <Field
                label="Telefon numarası"
                name="phone"
                type="text"
                inputMode="numeric"
                pattern="0[0-9]{10}"
                minLength={11}
                maxLength={11}
                placeholder="05xxxxxxxxx"
                autoComplete="tel"
                required
              />
              <TextField
                label="İşletme adresi"
                name="address"
                minLength={5}
                maxLength={500}
                placeholder="Mahalle, cadde/sokak, bina no, ilçe ve il"
                autoComplete="street-address"
                required
              />
              <Field label="Yetkili adı" name="display_name" required />
              <Field
                label="Yetkili e-posta adresi"
                name="username"
                type="email"
                maxLength={254}
                autoComplete="email"
                placeholder="yetkili@isletme.com"
                required
              />
              <label className="form-field">
                <span>İşletme türü</span>
                <SelectField
                  name="business_type"
                  value={businessType}
                  onValueChange={setBusinessType}
                >
                  <option value="venue">Düğün salonu</option>
                  <option value="planner">Organizasyon firması</option>
                  <option value="photography">Fotoğraf işletmesi</option>
                  <option value="print_vendor">Baskıcı</option>
                  <option value="other">Diğer</option>
                </SelectField>
                <small className="admin-hint">
                  {businessType === "photography"
                    ? "İlk yetkili hesabı Fotoğrafçı rolüyle oluşturulur."
                    : businessType === "print_vendor"
                      ? "İlk yetkili hesabı Baskıcı rolüyle oluşturulur."
                      : "İlk yetkili hesabı İşletme yöneticisi rolüyle oluşturulur."}
                </small>
              </label>
              <PasswordField
                label="Geçici şifre (en az 12 karakter)"
                name="password"
                minLength={12}
                maxLength={256}
                autoComplete="new-password"
                required
              />
              <div className="partner-create-logo">
                <PartnerLogoUpload
                  partnerId={draftId}
                  partnerName="Yeni işletme"
                  value={draftLogo}
                  draft
                  disabled={busy}
                  onUploaded={async (url) => setDraftLogo(url)}
                />
                <p className="admin-hint">
                  Kare ve yüksek çözünürlüklü bir logo kullanın.
                </p>
              </div>
              <footer>
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => setCreateOpen(false)}
                >
                  Vazgeç
                </button>
                <button disabled={busy} className="admin-button primary">
                  {busy ? "Oluşturuluyor…" : "İşletme oluştur"}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </AdminShell>
  );
}
