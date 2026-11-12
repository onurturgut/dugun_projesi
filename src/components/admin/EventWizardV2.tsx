"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Landmark,
  LoaderCircle,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  Account,
  AddOnProduct,
  PackageConfiguration,
  PartnerSettings,
  QrQuantitySelection,
  Wedding,
} from "@/lib/models";
import { effectiveStaffRole } from "@/lib/access-control";
import { organizationDepositCents } from "@/lib/organization-sales";
import type { AddOnSelection, PackageCode } from "@/lib/commercial-policy";
import { CoverUpload } from "./CoverUpload";
import { Field, Notice, TextField } from "./Fields";
import { SelectField } from "./SelectField";

const steps = ["Detaylar", "Paket", "Ek ürünler", "Ödeme", "Kontrol"] as const;

type DraftState = {
  title: string;
  event_type: string;
  venue: string;
  description: string;
  wedding_date: string;
  bride_name: string;
  groom_name: string;
  bride_email: string;
  groom_email: string;
  slug: string;
  logo_url: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  photographer_package_requested: boolean;
  custom_design_request: NonNullable<Wedding["custom_design_request"]>;
  package_code: PackageCode;
  add_on_selections: AddOnSelection[];
  qr_quantity_selections: QrQuantitySelection[];
  payment_plan: "full" | "deferred";
  preferred_payment_method: "card" | "cash" | "bank_transfer";
  payment_due_at: string;
};

type PhotographerOption = {
  id: string;
  display_name: string;
  partner_id: string;
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function initialState(event?: Wedding): DraftState {
  return {
    title: event?.title === "İsimsiz organizasyon" ? "" : event?.title || "",
    event_type: event?.event_type || "Düğün",
    venue: event?.venue || "",
    description: event?.description || "",
    wedding_date: event?.wedding_date || "",
    bride_name: event?.bride_name === "Gelin" ? "" : event?.bride_name || "",
    groom_name: event?.groom_name === "Damat" ? "" : event?.groom_name || "",
    bride_email: event?.bride_email || "",
    groom_email: event?.groom_email || "",
    slug: event?.slug?.startsWith("taslak-") ? "" : event?.slug || "",
    logo_url: event?.logo_url || "",
    customer_name: event?.customer_name || "",
    customer_email: event?.customer_email || "",
    customer_phone: event?.customer_phone || "",
    photographer_package_requested:
      event?.photographer_package_requested || false,
    custom_design_request: event?.custom_design_request || {
      description: "",
      colors: "",
      text_content: "",
      main_image_url: "",
      reference_image_urls: [],
      surfaces: [],
      due_date: "",
      notes: "",
    },
    package_code: event?.package_code || "plan-1",
    add_on_selections: event?.add_on_selections || [],
    qr_quantity_selections: event?.qr_quantity_selections || [],
    payment_plan: event?.payment_plan || "full",
    preferred_payment_method: event?.preferred_payment_method || "card",
    payment_due_at: event?.payment_due_at || "",
  };
}

export function EventWizardV2({
  user,
  initialEvent,
  onClose,
  onPublished,
}: {
  user: Account;
  initialEvent?: Wedding;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [event, setEvent] = useState<Wedding | undefined>(initialEvent);
  const [step, setStep] = useState(Math.min(initialEvent?.wizard_step || 1, 5));
  const [data, setData] = useState(() => initialState(initialEvent));
  const [covers, setCovers] = useState(initialEvent?.cover_images || []);
  const [photographerId, setPhotographerId] = useState(
    initialEvent?.assigned_photographers?.[0]?.id || "",
  );
  const [assignedPhotographerId, setAssignedPhotographerId] = useState(
    initialEvent?.assigned_photographers?.[0]?.id || "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState("");
  const defaultsApplied = useRef(false);
  const partnerId = initialEvent?.partner_id || user.partner_id || "platform";

  const partnerSettings = useQuery({
    queryKey: ["partner-settings"],
    queryFn: () => api<PartnerSettings>("/admin/partner-settings"),
    enabled:
      !initialEvent &&
      user.role === "partner" &&
      effectiveStaffRole(user) === "partner_owner",
  });
  useEffect(() => {
    if (!partnerSettings.data || initialEvent || defaultsApplied.current)
      return;
    defaultsApplied.current = true;
    const defaults = partnerSettings.data.organization_defaults;
    setData((current) => ({
      ...current,
      event_type: defaults.event_type || current.event_type,
      venue: defaults.venue || current.venue,
    }));
  }, [initialEvent, partnerSettings.data]);

  const packages = useQuery({
    queryKey: ["finance-packages"],
    queryFn: () =>
      api<{ items: PackageConfiguration[] }>("/admin/finance/packages"),
  });
  const addOns = useQuery({
    queryKey: ["add-ons"],
    queryFn: () => api<AddOnProduct[]>("/admin/add-ons"),
  });
  const photographers = useQuery({
    queryKey: ["photographers"],
    queryFn: () => api<PhotographerOption[]>("/admin/photographers"),
  });
  const photographerPackage = useQuery({
    queryKey: ["finance-photographer-package"],
    queryFn: () =>
      api<{ grossPriceCents: number; active: boolean }>(
        "/admin/finance/photographer-package",
      ),
  });

  const packageCatalog = Object.fromEntries(
    (packages.data?.items || []).map((item) => [item.code, item]),
  ) as Partial<Record<PackageCode, PackageConfiguration>>;
  const selectedPackage =
    packageCatalog[data.package_code] ||
    (initialEvent?.package_snapshot as PackageConfiguration | undefined);
  const activeAddOns = addOns.data?.filter((item) => item.active) || [];
  const qrProducts = activeAddOns.filter(
    (item) =>
      item.category === "qr_print" &&
      item.effect_type === "print_quantity" &&
      item.unit === "item" &&
      item.effect_value === 1,
  );
  const qrIds = new Set(qrProducts.map((item) => item.id));
  const regularAddOns = activeAddOns.filter((item) => !qrIds.has(item.id));
  const invitationAddOns = regularAddOns.filter(
    (item) => item.effect_type === "digital_invitation",
  );
  const otherAddOns = regularAddOns.filter(
    (item) => item.effect_type !== "digital_invitation",
  );
  const selectedAddOns = data.add_on_selections.flatMap((selection) => {
    const product = regularAddOns.find(
      (item) => item.id === selection.product_id,
    );
    return product ? [{ ...selection, product }] : [];
  });
  const customDesignSelected = selectedAddOns.some(
    (item) => item.product.effect_type === "custom_design",
  );
  const packageGross = selectedPackage?.grossPriceCents || 0;
  const addOnPrice = (product: AddOnProduct) =>
    product.pricing_type === "package_percentage_discount"
      ? -Math.round((packageGross * (product.percentage_bps || 0)) / 10_000)
      : product.gross_price_cents;
  const addOnGross = selectedAddOns.reduce(
    (sum, item) => sum + addOnPrice(item.product) * item.quantity,
    0,
  );
  const qrGross = qrProducts.reduce((sum, product) => {
    const included =
      product.print_format === "table_card"
        ? selectedPackage?.tableQrCount || 0
        : selectedPackage?.miniQrCount || 0;
    const total =
      data.qr_quantity_selections.find((item) => item.product_id === product.id)
        ?.total_quantity ?? included;
    return sum + Math.max(0, total - included) * product.gross_price_cents;
  }, 0);
  const photoGross = data.photographer_package_requested
    ? photographerPackage.data?.grossPriceCents || 0
    : 0;
  const grandTotal = packageGross + addOnGross + qrGross + photoGross;
  const deposit = organizationDepositCents(grandTotal);
  const money = (cents: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(cents / 100);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const toggleAddOn = (id: string) =>
    set(
      "add_on_selections",
      data.add_on_selections.some((item) => item.product_id === id)
        ? data.add_on_selections.filter((item) => item.product_id !== id)
        : [...data.add_on_selections, { product_id: id, quantity: 1 }],
    );
  const setQrTotal = (id: string, value: number) =>
    set("qr_quantity_selections", [
      ...data.qr_quantity_selections.filter((item) => item.product_id !== id),
      {
        product_id: id,
        total_quantity: Math.max(0, Math.min(10_000, value || 0)),
      },
    ]);

  useEffect(() => {
    const listener = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !busy && !coverBusy) onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [busy, coverBusy, onClose]);

  const missing = useMemo(() => {
    if (
      step === 1 &&
      (!data.title.trim() ||
        !data.wedding_date ||
        !data.bride_name.trim() ||
        !data.groom_name.trim())
    )
      return "Organizasyon, tarih, gelin ve damat bilgilerini tamamlayın.";
    if (
      step === 1 &&
      (!data.customer_name.trim() ||
        !data.customer_email.trim() ||
        !/^0[0-9]{10}$/.test(data.customer_phone))
    )
      return "Müşteri adı, e-posta adresi ve 11 haneli telefonu gerekli.";
    if (step === 1 && !data.slug.trim()) return "Sayfa adresini girin.";
    if (
      step === 3 &&
      customDesignSelected &&
      (!data.custom_design_request.description.trim() ||
        !data.custom_design_request.colors.trim() ||
        !data.custom_design_request.text_content.trim() ||
        !data.custom_design_request.main_image_url ||
        !data.custom_design_request.surfaces.length ||
        !data.custom_design_request.due_date)
    )
      return "Kişiye özel tasarım bilgilerini tamamlayın.";
    if (step === 4 && data.payment_plan === "deferred" && !data.payment_due_at)
      return "Kalan bakiye için son ödeme tarihini seçin.";
    return "";
  }, [customDesignSelected, data, step]);

  async function saveDraft(nextStep = step) {
    const payload = {
      ...(event ? { id: event.id } : {}),
      ...data,
      add_on_selections: data.add_on_selections.filter(
        (item) => !qrIds.has(item.product_id),
      ),
      slug: data.slug || undefined,
      wedding_date: data.wedding_date || undefined,
      bride_name: data.bride_name.trim() || undefined,
      groom_name: data.groom_name.trim() || undefined,
      cover_images: covers,
      partner_id: partnerId,
      ...(user.role === "platform" ? { seller_partner_id: partnerId } : {}),
      venue_partner_id: null,
      planner_partner_id: null,
      wizard_step: nextStep,
      hero_message: "",
      thank_you_message: "",
      upload_days: initialEvent?.upload_days || 7,
      trash_days: initialEvent?.trash_days || 7,
      deposit_rate_bps: 2000,
      payment_due_at:
        data.payment_plan === "deferred" ? data.payment_due_at : null,
    };
    const saved = await api<Wedding>("/admin/weddings/draft", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (assignedPhotographerId && assignedPhotographerId !== photographerId)
      await api(`/admin/weddings/${saved.id}/photographers`, {
        method: "DELETE",
        body: JSON.stringify({ account_id: assignedPhotographerId }),
      });
    if (photographerId && assignedPhotographerId !== photographerId)
      await api(`/admin/weddings/${saved.id}/photographers`, {
        method: "POST",
        body: JSON.stringify({ account_id: photographerId }),
      });
    setAssignedPhotographerId(photographerId);
    setEvent(saved);
    return saved;
  }
  async function next() {
    if (missing) return setError(missing);
    setBusy(true);
    setError("");
    try {
      const nextStep = Math.min(5, step + 1);
      await saveDraft(nextStep);
      setStep(nextStep);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveAndClose() {
    setBusy(true);
    setError("");
    try {
      await saveDraft(step);
      onPublished();
      onClose();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!event) return setError("Önce taslağı kaydedin.");
    if (password.length < 12)
      return setError("Geçici parola en az 12 karakter olmalı.");
    if (password !== confirmPassword) return setError("Parolalar eşleşmiyor.");
    setBusy(true);
    setError("");
    try {
      await saveDraft(5);
      await api(`/admin/weddings/${event.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setConfirmPassword("");
      onPublished();
      onClose();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const paymentMethod =
    data.preferred_payment_method === "card"
      ? "Kredi / banka kartı"
      : data.preferred_payment_method === "cash"
        ? "Nakit"
        : "Havale / EFT";
  return (
    <div
      className="event-wizard-layer event-wizard-v2-layer"
      role="presentation"
    >
      <button
        className="event-wizard-backdrop"
        aria-label="Sihirbazı kapat"
        onClick={onClose}
      />
      <section
        className="event-wizard event-wizard-v2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-v2-title"
      >
        <header className="event-wizard-header">
          <div>
            <p className="admin-kicker">HIZLI SATIŞ AKIŞI</p>
            <h2 id="wizard-v2-title">
              {event ? "Organizasyon taslağı" : "Organizasyon oluştur"}
            </h2>
            <small>
              {user.partner_name
                ? `${user.partner_name} hesabından oluşturuluyor`
                : "ShineQR organizasyonu"}
            </small>
          </div>
          <button
            type="button"
            className="event-wizard-close"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </header>
        <ol
          className="event-wizard-progress event-wizard-v2-progress"
          aria-label="Oluşturma adımları"
        >
          {steps.map((label, index) => (
            <li
              key={label}
              className={
                index + 1 === step ? "active" : index + 1 < step ? "done" : ""
              }
            >
              <span>{index + 1 < step ? <Check size={13} /> : index + 1}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>
        <div className="event-wizard-v2-layout">
          <main className="event-wizard-body">
            <div className="event-wizard-step-copy">
              <span>ADIM {step} / 5</span>
              <h3>{steps[step - 1]}</h3>
            </div>
            {step === 1 ? (
              <div className="event-wizard-v2-stack">
                <section className="event-wizard-form-section">
                  <div className="event-wizard-section-title">
                    <span>01</span>
                    <div>
                      <h4>Organizasyon bilgileri</h4>
                      <p>
                        Etkinliğin temel bilgilerini tek seferde tamamlayın.
                      </p>
                    </div>
                  </div>
                  <div className="event-wizard-fields">
                    <Field
                      label="Organizasyon başlığı"
                      value={data.title}
                      onChange={(e) => {
                        set("title", e.target.value);
                        if (!data.slug) set("slug", slugify(e.target.value));
                      }}
                      placeholder="Hilal & Oğuz"
                      maxLength={160}
                      autoFocus
                    />
                    <label className="form-field">
                      <span>Organizasyon türü</span>
                      <SelectField
                        value={data.event_type}
                        onValueChange={(value) => set("event_type", value)}
                      >
                        {[
                          "Düğün",
                          "Nişan",
                          "Kına",
                          "Sünnet",
                          "Doğum günü",
                          "Kurumsal etkinlik",
                          "Diğer",
                        ].map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </SelectField>
                    </label>
                    <Field
                      label="Organizasyon tarihi"
                      type="date"
                      value={data.wedding_date}
                      onValueChange={(value) => set("wedding_date", value)}
                    />
                    <Field
                      label="Mekân"
                      value={data.venue}
                      onChange={(e) => set("venue", e.target.value)}
                      placeholder="Mekân adı, ilçe"
                      maxLength={200}
                    />
                    <Field
                      label="Gelin adı"
                      value={data.bride_name}
                      onChange={(e) => set("bride_name", e.target.value)}
                    />
                    <Field
                      label="Damat adı"
                      value={data.groom_name}
                      onChange={(e) => set("groom_name", e.target.value)}
                    />
                    <Field
                      label="Gelin e-posta"
                      type="email"
                      value={data.bride_email}
                      onChange={(e) => set("bride_email", e.target.value)}
                      maxLength={254}
                    />
                    <Field
                      label="Damat e-posta"
                      type="email"
                      value={data.groom_email}
                      onChange={(e) => set("groom_email", e.target.value)}
                      maxLength={254}
                    />
                    <TextField
                      label="Organizasyon notu"
                      value={data.description}
                      onChange={(e) => set("description", e.target.value)}
                      maxLength={1200}
                    />
                  </div>
                </section>
                <section className="event-wizard-form-section">
                  <div className="event-wizard-section-title">
                    <span>02</span>
                    <div>
                      <h4>Müşteri ve erişim</h4>
                      <p>İletişim ve geçici hesap bilgileri.</p>
                    </div>
                  </div>
                  <div className="event-wizard-fields">
                    <Field
                      label="Müşteri adı soyadı"
                      value={data.customer_name}
                      onChange={(e) => set("customer_name", e.target.value)}
                      maxLength={100}
                    />
                    <Field
                      label="Telefon"
                      inputMode="numeric"
                      value={data.customer_phone}
                      onChange={(e) =>
                        set(
                          "customer_phone",
                          e.target.value.replace(/\D/g, "").slice(0, 11),
                        )
                      }
                      maxLength={11}
                      placeholder="05xxxxxxxxx"
                    />
                    <Field
                      label="E-posta"
                      type="email"
                      value={data.customer_email}
                      onChange={(e) => set("customer_email", e.target.value)}
                      maxLength={254}
                    />
                    <Field
                      label="Sayfa adresi"
                      value={data.slug}
                      onChange={(e) => set("slug", slugify(e.target.value))}
                      placeholder="hilal-oguz"
                    />
                    <Field
                      label="Geçici parola"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={12}
                      maxLength={256}
                      autoComplete="new-password"
                    />
                    <Field
                      label="Geçici parolayı tekrar girin"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={12}
                      maxLength={256}
                      autoComplete="new-password"
                    />
                    <div className="event-wizard-security">
                      <ShieldCheck size={18} />
                      <div>
                        <strong>Parola taslağa kaydedilmez.</strong>
                        <p>
                          Yalnızca onaya gönderme sırasında güvenli biçimde
                          işlenir.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="event-wizard-form-section">
                  <div className="event-wizard-section-title">
                    <span>03</span>
                    <div>
                      <h4>Organizasyon görselleri</h4>
                      <p>Müşteri sayfasında kullanılacak fotoğraflar.</p>
                    </div>
                  </div>
                  <CoverUpload
                    value={covers}
                    onChange={setCovers}
                    eventId={event?.id}
                    partnerId={partnerId}
                    disabled={busy}
                    onBusyChange={setCoverBusy}
                  />
                </section>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="event-wizard-card-grid event-wizard-package-grid">
                {packages.isLoading ? (
                  <p>Paketler yükleniyor…</p>
                ) : (
                  (packages.data?.items || [])
                    .filter((item) => item.active)
                    .map((plan, index) => {
                      const selected = data.package_code === plan.code;
                      return (
                        <button
                          type="button"
                          key={plan.code}
                          className={`event-wizard-product-card package ${selected ? "selected" : ""}`}
                          onClick={() => set("package_code", plan.code)}
                          aria-pressed={selected}
                        >
                          <span className="event-wizard-card-eyebrow">
                            PLAN {index + 1}
                          </span>
                          <h4>{plan.name}</h4>
                          <strong>{money(plan.grossPriceCents)}</strong>
                          <small>KDV dahil</small>
                          <ul>
                            <li>{plan.tableQrCount} masa QR</li>
                            <li>{plan.miniQrCount} mini QR</li>
                            <li>
                              {plan.digitalRetentionMonths} ay dijital saklama
                            </li>
                            <li>
                              {plan.uploadWindow === "event-day"
                                ? "Organizasyon günü yükleme"
                                : "Esnek yükleme penceresi"}
                            </li>
                          </ul>
                          <span className="event-wizard-card-action">
                            {selected ? (
                              <>
                                <Check size={16} /> Seçildi
                              </>
                            ) : (
                              "Bu paketi seç"
                            )}
                          </span>
                        </button>
                      );
                    })
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="event-wizard-v2-stack">
                {invitationAddOns.length ? (
                  <section>
                    <div className="event-wizard-section-title">
                      <span>
                        <Sparkles size={16} />
                      </span>
                      <div>
                        <h4>Dijital davetiye</h4>
                        <p>
                          Davetiye hizmetini ayrı bir satış kalemi olarak
                          ekleyin.
                        </p>
                      </div>
                    </div>
                    <div className="event-wizard-card-grid">
                      {invitationAddOns.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          selected={data.add_on_selections.some(
                            (item) => item.product_id === product.id,
                          )}
                          price={money(addOnPrice(product))}
                          onToggle={() => toggleAddOn(product.id)}
                          featured
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
                <section>
                  <div className="event-wizard-section-title">
                    <span>+</span>
                    <div>
                      <h4>Ek hizmetler</h4>
                      <p>
                        İhtiyaca göre satışa ekleyin; fiyat anında güncellenir.
                      </p>
                    </div>
                  </div>
                  <div className="event-wizard-card-grid">
                    {otherAddOns.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        selected={data.add_on_selections.some(
                          (item) => item.product_id === product.id,
                        )}
                        price={
                          product.pricing_type === "package_percentage_discount"
                            ? `-%${(product.percentage_bps || 0) / 100}`
                            : money(product.gross_price_cents)
                        }
                        onToggle={() => toggleAddOn(product.id)}
                      />
                    ))}
                  </div>
                </section>
                {qrProducts.length ? (
                  <section>
                    <div className="event-wizard-section-title">
                      <span>#</span>
                      <div>
                        <h4>QR ve baskı adetleri</h4>
                        <p>Pakete dahil adetler otomatik düşülür.</p>
                      </div>
                    </div>
                    <div className="event-wizard-card-grid">
                      {qrProducts.map((product) => {
                        const included =
                          product.print_format === "table_card"
                            ? selectedPackage?.tableQrCount || 0
                            : selectedPackage?.miniQrCount || 0;
                        const total =
                          data.qr_quantity_selections.find(
                            (item) => item.product_id === product.id,
                          )?.total_quantity ?? included;
                        return (
                          <article
                            className="event-wizard-product-card quantity"
                            key={product.id}
                          >
                            <span className="event-wizard-card-eyebrow">
                              PAKETE DAHİL {included}
                            </span>
                            <h4>{product.name}</h4>
                            <strong>
                              {money(
                                Math.max(0, total - included) *
                                  product.gross_price_cents,
                              )}
                            </strong>
                            <small>
                              {Math.max(0, total - included)} ekstra adet
                            </small>
                            <div className="event-wizard-quantity">
                              <button
                                type="button"
                                onClick={() =>
                                  setQrTotal(
                                    product.id,
                                    Math.max(included, total - 1),
                                  )
                                }
                                aria-label="Adedi azalt"
                              >
                                <Minus size={16} />
                              </button>
                              <b>{total}</b>
                              <button
                                type="button"
                                onClick={() =>
                                  setQrTotal(product.id, total + 1)
                                }
                                aria-label="Adedi artır"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
                {photographerPackage.data?.active ? (
                  <section>
                    <div className="event-wizard-section-title">
                      <span>◎</span>
                      <div>
                        <h4>Fotoğraf paketi</h4>
                        <p>
                          Ayrı hizmet satışı ve hakediş kaydıyla takip edilir.
                        </p>
                      </div>
                    </div>
                    <article
                      className={`event-wizard-photo-card ${data.photographer_package_requested ? "selected" : ""}`}
                    >
                      <div>
                        <span className="event-wizard-card-eyebrow">
                          PROFESYONEL HİZMET
                        </span>
                        <h4>Fotoğrafçı paketi</h4>
                        <p>
                          Fotoğrafçı, kaynak partner ve platform payları ayrı
                          muhasebeleşir.
                        </p>
                      </div>
                      <label className="form-field">
                        <span>Fotoğrafçı</span>
                        <SelectField
                          value={photographerId}
                          onValueChange={setPhotographerId}
                        >
                          <option value="">Fotoğrafçı seçin</option>
                          {photographers.data?.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.display_name}
                            </option>
                          ))}
                        </SelectField>
                      </label>
                      <div className="event-wizard-photo-price">
                        <strong>
                          {money(photographerPackage.data.grossPriceCents)}
                        </strong>
                        <small>KDV dahil</small>
                        <button
                          type="button"
                          className="admin-button"
                          disabled={!photographerId}
                          onClick={() =>
                            set(
                              "photographer_package_requested",
                              !data.photographer_package_requested,
                            )
                          }
                        >
                          {data.photographer_package_requested
                            ? "Paketi kaldır"
                            : "Paketi ekle"}
                        </button>
                      </div>
                    </article>
                  </section>
                ) : null}
                {customDesignSelected ? (
                  <section className="event-wizard-form-section">
                    <div className="event-wizard-section-title">
                      <span>✎</span>
                      <div>
                        <h4>Kişiye özel tasarım</h4>
                        <p>Tasarım ekibinin ihtiyaç duyduğu brief.</p>
                      </div>
                    </div>
                    <div className="event-wizard-fields">
                      <TextField
                        label="Ayrıntılı açıklama"
                        value={data.custom_design_request.description}
                        onChange={(e) =>
                          set("custom_design_request", {
                            ...data.custom_design_request,
                            description: e.target.value,
                          })
                        }
                      />
                      <Field
                        label="Tercih edilen renkler"
                        value={data.custom_design_request.colors}
                        onChange={(e) =>
                          set("custom_design_request", {
                            ...data.custom_design_request,
                            colors: e.target.value,
                          })
                        }
                      />
                      <TextField
                        label="Kullanılacak metinler"
                        value={data.custom_design_request.text_content}
                        onChange={(e) =>
                          set("custom_design_request", {
                            ...data.custom_design_request,
                            text_content: e.target.value,
                          })
                        }
                      />
                      <label className="form-field">
                        <span>Ana görsel</span>
                        <select
                          value={data.custom_design_request.main_image_url}
                          onChange={(e) =>
                            set("custom_design_request", {
                              ...data.custom_design_request,
                              main_image_url: e.target.value,
                            })
                          }
                        >
                          <option value="">Görsel seçin</option>
                          {covers.map((url, index) => (
                            <option key={url} value={url}>
                              {index + 1}. görsel
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field
                        label="Son teslim tarihi"
                        type="date"
                        value={data.custom_design_request.due_date}
                        onValueChange={(value) =>
                          set("custom_design_request", {
                            ...data.custom_design_request,
                            due_date: value,
                            surfaces: data.custom_design_request.surfaces.length
                              ? data.custom_design_request.surfaces
                              : ["qr_card"],
                          })
                        }
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="event-wizard-v2-stack">
                <div className="event-wizard-choice-grid">
                  <ChoiceCard
                    selected={data.payment_plan === "full"}
                    icon={<WalletCards />}
                    title="Tam ödeme"
                    description="Toplam tutar tek seferde tahsil edilir."
                    onClick={() => set("payment_plan", "full")}
                  />
                  <ChoiceCard
                    selected={data.payment_plan === "deferred"}
                    icon={<Landmark />}
                    title="İleri tarihli ödeme"
                    description="%20 kapora alınır, kalan tutara vade verilir."
                    onClick={() => set("payment_plan", "deferred")}
                  />
                </div>
                <section className="event-wizard-form-section">
                  <div className="event-wizard-section-title">
                    <span>02</span>
                    <div>
                      <h4>Ödeme yöntemi</h4>
                      <p>
                        Tahsilat tercihi kaydedilir; gerçek para hareketi ayrıca
                        doğrulanır.
                      </p>
                    </div>
                  </div>
                  <div className="event-wizard-payment-methods">
                    <ChoiceCard
                      selected={data.preferred_payment_method === "card"}
                      icon={<CreditCard />}
                      title="Kredi / banka kartı"
                      description="Sanal POS bildirimiyle doğrulanır."
                      onClick={() => set("preferred_payment_method", "card")}
                    />
                    <ChoiceCard
                      selected={data.preferred_payment_method === "cash"}
                      icon={<WalletCards />}
                      title="Nakit"
                      description="Yetkili kullanıcı kasa tahsilatını onaylar."
                      onClick={() => set("preferred_payment_method", "cash")}
                    />
                    <ChoiceCard
                      selected={
                        data.preferred_payment_method === "bank_transfer"
                      }
                      icon={<Landmark />}
                      title="Havale / EFT"
                      description="IBAN ve satış referansıyla eşleşir."
                      onClick={() =>
                        set("preferred_payment_method", "bank_transfer")
                      }
                    />
                  </div>
                </section>
                {data.payment_plan === "deferred" ? (
                  <section className="event-wizard-deposit-card">
                    <div>
                      <span>%20 kapora</span>
                      <strong>{money(deposit)}</strong>
                    </div>
                    <div>
                      <span>Kalan bakiye</span>
                      <strong>{money(grandTotal - deposit)}</strong>
                    </div>
                    <Field
                      label="Kalan bakiye son ödeme tarihi"
                      type="date"
                      value={data.payment_due_at}
                      onValueChange={(value) => set("payment_due_at", value)}
                    />
                  </section>
                ) : null}
              </div>
            ) : null}

            {step === 5 ? (
              <div className="event-wizard-review-v2">
                <ReviewSection title="Organizasyon" onEdit={() => setStep(1)}>
                  <b>{data.title}</b>
                  <span>
                    {data.wedding_date} · {data.venue || "Mekân belirtilmedi"}
                  </span>
                  <span>
                    {data.bride_name} & {data.groom_name}
                  </span>
                </ReviewSection>
                <ReviewSection title="Müşteri" onEdit={() => setStep(1)}>
                  <b>{data.customer_name}</b>
                  <span>
                    {data.customer_phone} · {data.customer_email}
                  </span>
                </ReviewSection>
                <ReviewSection title="Paket" onEdit={() => setStep(2)}>
                  <b>{selectedPackage?.name || data.package_code}</b>
                  <span>{money(packageGross)}</span>
                </ReviewSection>
                <ReviewSection title="Ek ürünler" onEdit={() => setStep(3)}>
                  <b>
                    {selectedAddOns.length
                      ? selectedAddOns
                          .map((item) => item.product.name)
                          .join(", ")
                      : "Ek ürün yok"}
                  </b>
                  {data.photographer_package_requested ? (
                    <span>Fotoğraf paketi dahil</span>
                  ) : null}
                </ReviewSection>
                <ReviewSection title="Ödeme" onEdit={() => setStep(4)}>
                  <b>
                    {data.payment_plan === "deferred"
                      ? `%20 kapora: ${money(deposit)}`
                      : "Tam ödeme"}
                  </b>
                  <span>
                    {paymentMethod}
                    {data.payment_due_at
                      ? ` · vade ${data.payment_due_at}`
                      : ""}
                  </span>
                </ReviewSection>
              </div>
            ) : null}
            {error ? <Notice>{error}</Notice> : null}
          </main>
          <aside className="event-wizard-live-summary">
            <span className="event-wizard-card-eyebrow">SATIŞ ÖZETİ</span>
            <h3>{money(grandTotal)}</h3>
            <small>KDV dahil toplam</small>
            <div className="event-wizard-summary-lines">
              <p>
                <span>{selectedPackage?.name || "Paket"}</span>
                <b>{money(packageGross)}</b>
              </p>
              {selectedAddOns.map((item) => (
                <p key={item.product_id}>
                  <span>{item.product.name}</span>
                  <b>{money(addOnPrice(item.product) * item.quantity)}</b>
                </p>
              ))}
              {qrGross ? (
                <p>
                  <span>Ek QR / baskı</span>
                  <b>{money(qrGross)}</b>
                </p>
              ) : null}
              {photoGross ? (
                <p>
                  <span>Fotoğraf paketi</span>
                  <b>{money(photoGross)}</b>
                </p>
              ) : null}
            </div>
            {data.payment_plan === "deferred" ? (
              <div className="event-wizard-summary-deposit">
                <span>Bugün alınacak %20 kapora</span>
                <strong>{money(deposit)}</strong>
                <small>Kalan {money(grandTotal - deposit)}</small>
              </div>
            ) : null}
          </aside>
        </div>
        <footer className="event-wizard-footer">
          <button
            type="button"
            className="admin-button"
            onClick={saveAndClose}
            disabled={busy || coverBusy}
          >
            {busy ? "Kaydediliyor…" : "Taslak olarak kaydet"}
          </button>
          <div>
            <button
              type="button"
              className="admin-button"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              disabled={step === 1 || busy}
            >
              <ArrowLeft size={15} /> Geri
            </button>
            {step < 5 ? (
              <button
                type="button"
                className="admin-button primary"
                onClick={next}
                disabled={busy || coverBusy}
              >
                {busy ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : null}{" "}
                Kaydet ve devam et <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="admin-button primary"
                onClick={publish}
                disabled={busy}
              >
                {busy
                  ? "Gönderiliyor…"
                  : user.role === "platform"
                    ? "Organizasyonu oluştur"
                    : "Organizasyonu onaya gönder"}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

function ProductCard({
  product,
  selected,
  price,
  onToggle,
  featured = false,
}: {
  product: AddOnProduct;
  selected: boolean;
  price: string;
  onToggle: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      className={`event-wizard-product-card ${featured ? "featured" : ""} ${selected ? "selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span className="event-wizard-card-eyebrow">
        {featured
          ? "DİJİTAL HİZMET"
          : (product.category || "ek hizmet").replaceAll("_", " ")}
      </span>
      <h4>{product.name}</h4>
      <p>{product.description || "Organizasyon satışına ek hizmet."}</p>
      <strong>{price}</strong>
      <small>KDV dahil</small>
      <span className="event-wizard-card-action">
        {selected ? (
          <>
            <Check size={16} /> Satışa eklendi
          </>
        ) : (
          <>
            <Plus size={16} /> Satışa ekle
          </>
        )}
      </span>
    </button>
  );
}
function ChoiceCard({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`event-wizard-choice-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <i>{icon}</i>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {selected ? <Check size={18} /> : null}
    </button>
  );
}
function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header>
        <span>{title}</span>
        <button type="button" onClick={onEdit}>
          Düzenle
        </button>
      </header>
      <div>{children}</div>
    </section>
  );
}
