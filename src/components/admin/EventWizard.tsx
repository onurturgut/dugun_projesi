"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Landmark,
  LoaderCircle,
  WalletCards,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  Account,
  AddOnProduct,
  PackageConfiguration,
  Partner,
  PartnerSettings,
  QrQuantitySelection,
  Wedding,
} from "@/lib/models";
import { effectiveStaffRole } from "@/lib/access-control";
import { CoverUpload } from "./CoverUpload";
import { Field, Notice, TextField } from "./Fields";
import { SelectField } from "./SelectField";
import { type AddOnSelection, type PackageCode } from "@/lib/commercial-policy";
import { organizationDepositCents } from "@/lib/organization-sales";

const steps = [
  "Organizasyon ve satış",
  "Detaylar",
  "Karşılama",
  "Görseller",
  "Sayfa adresi",
  "Müşteri ve ödeme",
  "Kontrol",
] as const;

type DraftState = {
  title: string;
  event_type: string;
  venue: string;
  description: string;
  wedding_date: string;
  bride_name: string;
  groom_name: string;
  hero_message: string;
  thank_you_message: string;
  slug: string;
  logo_url: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  photographer_package_requested: boolean;
  custom_design_request: NonNullable<Wedding["custom_design_request"]>;
  upload_days: number;
  trash_days: number;
  package_code: PackageCode;
  add_on_selections: AddOnSelection[];
  qr_quantity_selections: QrQuantitySelection[];
  payment_plan: "full" | "deferred";
  preferred_payment_method: "card" | "cash" | "bank_transfer";
  payment_due_at: string;
};
type BusinessOption = Pick<Partner, "id" | "name" | "business_types">;
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
    hero_message:
      event?.hero_message || "Bu özel günü anılarınızla ölümsüzleştirelim.",
    thank_you_message:
      event?.thank_you_message ||
      "Bu mutlu günümüze eşlik ettiğiniz için teşekkür ederiz.",
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
    upload_days: event?.upload_days || 7,
    trash_days: event?.trash_days || 7,
    package_code: event?.package_code || "plan-1",
    add_on_selections: event?.add_on_selections || [],
    qr_quantity_selections: event?.qr_quantity_selections || [],
    payment_plan: event?.payment_plan || "full",
    preferred_payment_method: event?.preferred_payment_method || "card",
    payment_due_at: event?.payment_due_at || "",
  };
}

export function EventWizard({
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
  const [step, setStep] = useState(Math.min(initialEvent?.wizard_step || 1, 7));
  const [data, setData] = useState(() => initialState(initialEvent));
  const [covers, setCovers] = useState(initialEvent?.cover_images || []);
  const [partnerId, setPartnerId] = useState(
    initialEvent?.partner_id || user.partner_id || "platform",
  );
  const [sellerPartnerId, setSellerPartnerId] = useState(
    initialEvent?.seller_partner_id ||
      initialEvent?.partner_id ||
      user.partner_id ||
      "platform",
  );
  const [venuePartnerId, setVenuePartnerId] = useState(
    initialEvent?.venue_partner_id || "",
  );
  const [plannerPartnerId, setPlannerPartnerId] = useState(
    initialEvent?.planner_partner_id || "",
  );
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
      hero_message: defaults.hero_message || current.hero_message,
      thank_you_message:
        defaults.thank_you_message || current.thank_you_message,
    }));
  }, [initialEvent, partnerSettings.data]);
  const partners = useQuery({
    queryKey: ["partners"],
    queryFn: () => api<Partner[]>("/admin/partners"),
    enabled: user.role === "platform",
  });
  const businessDirectory = useQuery({
    queryKey: ["business-directory"],
    queryFn: () => api<BusinessOption[]>("/admin/business-directory"),
  });
  const photographers = useQuery({
    queryKey: ["photographers"],
    queryFn: () => api<PhotographerOption[]>("/admin/photographers"),
  });
  const addOns = useQuery({
    queryKey: ["add-ons"],
    queryFn: () => api<AddOnProduct[]>("/admin/add-ons"),
    enabled: user.role === "platform" || user.role === "partner",
  });
  const packages = useQuery({
    queryKey: ["finance-packages"],
    queryFn: () =>
      api<{ items: PackageConfiguration[] }>("/admin/finance/packages"),
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
  const activeAddOns = addOns.data?.filter((item) => item.active) || [];
  const qrProducts = activeAddOns.filter(
    (item) =>
      item.category === "qr_print" &&
      item.effect_type === "print_quantity" &&
      item.unit === "item" &&
      item.effect_value === 1,
  );
  const qrProductIds = new Set(qrProducts.map((item) => item.id));
  const regularAddOns = activeAddOns.filter(
    (item) => !qrProductIds.has(item.id),
  );
  const digitalInvitationAddOns = regularAddOns.filter(
    (item) => item.effect_type === "digital_invitation",
  );
  const otherRegularAddOns = regularAddOns.filter(
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
  const selectedPackage =
    packageCatalog[data.package_code] ||
    (initialEvent?.package_snapshot as PackageConfiguration | undefined);
  const packageGrossCents = selectedPackage?.grossPriceCents || 0;
  const addOnUnitGross = (product: AddOnProduct) =>
    product.pricing_type === "package_percentage_discount"
      ? -Math.round(
          (packageGrossCents * (product.percentage_bps || 0)) / 10_000,
        )
      : product.gross_price_cents;
  const totalGrossCents =
    packageGrossCents +
    selectedAddOns.reduce(
      (sum, item) => sum + addOnUnitGross(item.product) * item.quantity,
      0,
    ) +
    qrProducts.reduce((sum, product) => {
      const included =
        product.print_format === "table_card"
          ? selectedPackage?.tableQrCount || 0
          : selectedPackage?.miniQrCount || 0;
      const total =
        data.qr_quantity_selections.find(
          (item) => item.product_id === product.id,
        )?.total_quantity ?? included;
      return sum + Math.max(0, total - included) * product.gross_price_cents;
    }, 0);
  const photographerGrossCents = data.photographer_package_requested
    ? photographerPackage.data?.grossPriceCents || 0
    : 0;
  const grandTotalGrossCents = totalGrossCents + photographerGrossCents;
  const depositCents = organizationDepositCents(grandTotalGrossCents);
  const money = (cents: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(cents / 100);
  const selectedPartner = partners.data?.find((item) => item.id === partnerId);
  const businessOptions = (
    type: NonNullable<Partner["business_types"]>[number],
  ) =>
    businessDirectory.data?.filter(
      (item) =>
        !item.business_types?.length || item.business_types.includes(type),
    ) || [];
  const businessName = (id: string) =>
    businessDirectory.data?.find((item) => item.id === id)?.name ||
    "Belirtilmedi";
  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const setCustomDesign = <K extends keyof DraftState["custom_design_request"]>(
    key: K,
    value: DraftState["custom_design_request"][K],
  ) =>
    set("custom_design_request", {
      ...data.custom_design_request,
      [key]: value,
    });
  function toggleAddOn(productId: string, checked: boolean) {
    set(
      "add_on_selections",
      checked
        ? [...data.add_on_selections, { product_id: productId, quantity: 1 }]
        : data.add_on_selections.filter(
            (item) => item.product_id !== productId,
          ),
    );
  }
  function setAddOnQuantity(productId: string, quantity: number) {
    set(
      "add_on_selections",
      data.add_on_selections.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(100, Math.max(1, quantity || 1)) }
          : item,
      ),
    );
  }
  function setQrTotal(productId: string, totalQuantity: number) {
    const next = Math.max(0, Math.min(10_000, totalQuantity || 0));
    set("qr_quantity_selections", [
      ...data.qr_quantity_selections.filter(
        (item) => item.product_id !== productId,
      ),
      { product_id: productId, total_quantity: next },
    ]);
  }
  useEffect(() => {
    const listener = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !busy && !coverBusy) onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [busy, coverBusy, onClose]);

  const missing = useMemo(() => {
    if (step === 1 && !data.title.trim())
      return "Organizasyon başlığını girin.";
    if (step === 2 && !data.wedding_date) return "Organizasyon tarihini seçin.";
    if (step === 3 && (!data.bride_name.trim() || !data.groom_name.trim()))
      return "İki ismi de girin.";
    if (step === 5 && !data.slug.trim()) return "Sayfa adresini girin.";
    if (
      step === 6 &&
      (!data.customer_name.trim() ||
        !data.customer_email.trim() ||
        !/^0[0-9]{10}$/.test(data.customer_phone))
    )
      return "Müşteri adı, e-posta adresi ve 11 haneli telefonu gerekli.";
    if (
      step === 6 &&
      customDesignSelected &&
      (!data.custom_design_request.description.trim() ||
        !data.custom_design_request.colors.trim() ||
        !data.custom_design_request.text_content.trim() ||
        !data.custom_design_request.main_image_url ||
        !data.custom_design_request.surfaces.length ||
        !data.custom_design_request.due_date)
    )
      return "Kişiye özel tasarımın açıklama, renk, metin, ana görsel, yüzey ve teslim tarihi alanlarını tamamlayın.";
    if (step === 6 && data.payment_plan === "deferred" && !data.payment_due_at)
      return "Kalan bakiye için son ödeme tarihini seçin.";
    return "";
  }, [customDesignSelected, data, step]);

  async function saveDraft(nextStep = step) {
    const payload = {
      ...(event ? { id: event.id } : {}),
      ...data,
      add_on_selections: data.add_on_selections.filter(
        (item) => !qrProductIds.has(item.product_id),
      ),
      slug: data.slug || undefined,
      wedding_date: data.wedding_date || undefined,
      bride_name: data.bride_name.trim() || undefined,
      groom_name: data.groom_name.trim() || undefined,
      cover_images: covers,
      partner_id: partnerId,
      lead_partner_id: partnerId,
      ...(user.role === "platform"
        ? { seller_partner_id: sellerPartnerId || partnerId }
        : {}),
      deposit_rate_bps: 2000,
      payment_due_at:
        data.payment_plan === "deferred" ? data.payment_due_at : null,
      venue_partner_id: venuePartnerId || null,
      planner_partner_id: plannerPartnerId || null,
      wizard_step: nextStep,
    };
    const saved = await api<Wedding>("/admin/weddings/draft", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (assignedPhotographerId && assignedPhotographerId !== photographerId) {
      await api(`/admin/weddings/${saved.id}/photographers`, {
        method: "DELETE",
        body: JSON.stringify({ account_id: assignedPhotographerId }),
      });
    }
    if (photographerId && assignedPhotographerId !== photographerId) {
      await api(`/admin/weddings/${saved.id}/photographers`, {
        method: "POST",
        body: JSON.stringify({ account_id: photographerId }),
      });
    }
    setAssignedPhotographerId(photographerId);
    setEvent(saved);
    return saved;
  }

  async function next() {
    if (missing) return setError(missing);
    setBusy(true);
    setError("");
    try {
      const nextStep = Math.min(7, step + 1);
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
      await saveDraft(7);
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

  return (
    <div className="event-wizard-layer" role="presentation">
      <button
        className="event-wizard-backdrop"
        aria-label="Sihirbazı kapat"
        onClick={onClose}
      />
      <section
        className="event-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        <header className="event-wizard-header">
          <div>
            <p className="admin-kicker">YENİ ORGANİZASYON</p>
            <h2 id="wizard-title">
              {event ? "Taslağa devam et" : "Organizasyon oluştur"}
            </h2>
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
        <ol className="event-wizard-progress" aria-label="Oluşturma adımları">
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
        <div className="event-wizard-body">
          <div className="event-wizard-step-copy">
            <span>ADIM {step} / 7</span>
            <h3>{steps[step - 1]}</h3>
          </div>
          {step === 1 && (
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
                    "Doğum günü",
                    "Kurumsal etkinlik",
                    "Diğer",
                  ].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </SelectField>
              </label>
              <label className="form-field">
                <span>Paket</span>
                <SelectField
                  value={data.package_code}
                  onValueChange={(value) =>
                    set("package_code", value as PackageCode)
                  }
                >
                  {(
                    Object.entries(packageCatalog) as Array<
                      [PackageCode, PackageConfiguration]
                    >
                  )
                    .filter(([, plan]) => plan.active)
                    .map(([code, plan], index) => (
                      <option key={code} value={code}>
                        Plan {index + 1} · {plan.name} ·{" "}
                        {money(plan.grossPriceCents)}
                      </option>
                    ))}
                </SelectField>
              </label>
              {user.role === "platform" && !event ? (
                <label className="form-field">
                  <span>İşletme</span>
                  <SelectField value={partnerId} onValueChange={setPartnerId}>
                    {partners.data
                      ?.filter((partner) => partner.active)
                      .map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                  </SelectField>
                </label>
              ) : null}
              {user.role === "platform" ? (
                <label className="form-field">
                  <span>Satışı yapan partner</span>
                  <SelectField
                    value={sellerPartnerId}
                    onValueChange={setSellerPartnerId}
                  >
                    <option value="platform">ShineQR Platform</option>
                    {partners.data
                      ?.filter(
                        (partner) =>
                          partner.active && partner.id !== "platform",
                      )
                      .map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                  </SelectField>
                  <small>
                    Finansal hak ediş bu işletmeye yazılır ve satıştan sonra
                    değişmez.
                  </small>
                </label>
              ) : (
                <div className="event-wizard-seller-lock">
                  <Building2 size={20} aria-hidden="true" />
                  <div>
                    <small>SATIŞİ YAPAN İŞLETME</small>
                    <strong>{user.partner_name || "Partner hesabınız"}</strong>
                    <span>
                      Hesabınızdan otomatik belirlendi ve partner tarafından
                      değiştirilemez.
                    </span>
                  </div>
                </div>
              )}
              {qrProducts.length ? (
                <div className="event-wizard-add-ons">
                  <div className="event-wizard-add-on-heading">
                    <div>
                      <strong>Toplam QR adetleri</strong>
                      <small>
                        Pakete dahil adet düşülür; yalnızca ekstra adet
                        ücretlendirilir.
                      </small>
                    </div>
                  </div>
                  {qrProducts.map((product) => {
                    const included =
                      product.print_format === "table_card"
                        ? selectedPackage?.tableQrCount || 0
                        : selectedPackage?.miniQrCount || 0;
                    const total =
                      data.qr_quantity_selections.find(
                        (item) => item.product_id === product.id,
                      )?.total_quantity ?? included;
                    const extra = Math.max(0, total - included);
                    return (
                      <label className="event-wizard-add-on" key={product.id}>
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            Pakete dahil {included} · ekstra {extra} ×{" "}
                            {money(product.gross_price_cents)} ={" "}
                            {money(extra * product.gross_price_cents)}
                          </small>
                        </span>
                        <input
                          aria-label={`${product.name} toplam adedi`}
                          type="number"
                          min={included}
                          max={
                            included +
                            (product.quantity ??
                              product.maximum_quantity ??
                              100)
                          }
                          value={total}
                          onChange={(event) =>
                            setQrTotal(product.id, Number(event.target.value))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}
              {digitalInvitationAddOns.length ? (
                <div className="event-wizard-add-ons event-wizard-featured-add-ons">
                  <div className="event-wizard-add-on-heading">
                    <div>
                      <strong>Dijital davetiye</strong>
                      <small>
                        Organizasyon sayfasından ayrı bir hizmet olarak seçilir
                        ve satış özetinde ayrı gösterilir.
                      </small>
                    </div>
                  </div>
                  {digitalInvitationAddOns.map((product) => {
                    const selection = data.add_on_selections.find(
                      (item) => item.product_id === product.id,
                    );
                    return (
                      <label
                        className={`event-wizard-add-on ${selection ? "selected" : ""}`}
                        key={product.id}
                      >
                        <input
                          type="checkbox"
                          checked={!!selection}
                          onChange={(event) =>
                            toggleAddOn(product.id, event.target.checked)
                          }
                        />
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {product.description || "Dijital davetiye hizmeti"}
                          </small>
                        </span>
                        <b>{money(product.gross_price_cents)}</b>
                      </label>
                    );
                  })}
                </div>
              ) : null}
              <div className="event-wizard-add-ons">
                <div className="event-wizard-add-on-heading">
                  <div>
                    <strong>Ek ürünler</strong>
                    <small>
                      Fiyatlar KDV dahildir. Seçim anındaki tutar organizasyona
                      kaydedilir.
                    </small>
                  </div>
                  <strong>{money(totalGrossCents)}</strong>
                </div>
                {addOns.isLoading ? <p>Ek ürünler yükleniyor…</p> : null}
                {!addOns.isLoading && !otherRegularAddOns.length ? (
                  <p className="admin-hint">Satışa açık ek ürün bulunmuyor.</p>
                ) : null}
                {otherRegularAddOns.map((product) => {
                  const selection = data.add_on_selections.find(
                    (item) => item.product_id === product.id,
                  );
                  return (
                    <label className="event-wizard-add-on" key={product.id}>
                      <input
                        type="checkbox"
                        checked={!!selection}
                        onChange={(e) =>
                          toggleAddOn(product.id, e.target.checked)
                        }
                      />
                      <span>
                        <strong>{product.name}</strong>
                        <small>
                          {product.description ||
                            (product.commissionable
                              ? "Partner komisyonuna dahil"
                              : "Partner komisyonuna dahil değil")}
                          {product.print_format === "vertical_mini"
                            ? " · Dikey Mini QR"
                            : ""}
                        </small>
                      </span>
                      <b>
                        {product.pricing_type === "package_percentage_discount"
                          ? `-%${(product.percentage_bps || 0) / 100}`
                          : money(product.gross_price_cents)}
                      </b>
                      {selection && product.effect_type === "storage_gib" ? (
                        <input
                          aria-label={`${product.name} adedi`}
                          type="number"
                          min="1"
                          max="100"
                          value={selection.quantity}
                          onChange={(e) =>
                            setAddOnQuantity(product.id, Number(e.target.value))
                          }
                        />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="event-wizard-fields">
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
              <label className="form-field">
                <span>Düğün salonu / mekân işletmesi</span>
                <SelectField
                  value={venuePartnerId}
                  onValueChange={setVenuePartnerId}
                >
                  <option value="">Kayıtlı işletme seçilmedi</option>
                  {businessOptions("venue").map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </SelectField>
              </label>
              <label className="form-field">
                <span>Organizasyon firması</span>
                <SelectField
                  value={plannerPartnerId}
                  onValueChange={setPlannerPartnerId}
                >
                  <option value="">Kayıtlı işletme seçilmedi</option>
                  {businessOptions("planner").map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </SelectField>
              </label>
              <label className="form-field">
                <span>Fotoğrafçı</span>
                <SelectField
                  value={photographerId}
                  onValueChange={setPhotographerId}
                >
                  <option value="">Fotoğrafçı daha sonra atanacak</option>
                  {photographers.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name}
                    </option>
                  ))}
                </SelectField>
                <small>
                  Fotoğrafçı yalnızca profesyonel dosya yükleyebilir; albümü
                  göremez.
                </small>
              </label>
              <TextField
                label="Kısa açıklama"
                value={data.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={1200}
              />
            </div>
          )}
          {step === 3 && (
            <div className="event-wizard-fields">
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
              <TextField
                label="Karşılama mesajı"
                value={data.hero_message}
                onChange={(e) => set("hero_message", e.target.value)}
                maxLength={1000}
              />
              <TextField
                label="Teşekkür mesajı"
                value={data.thank_you_message}
                onChange={(e) => set("thank_you_message", e.target.value)}
                maxLength={2000}
              />
            </div>
          )}
          {step === 4 && (
            <CoverUpload
              value={covers}
              onChange={setCovers}
              eventId={event?.id}
              partnerId={partnerId}
              disabled={busy}
              onBusyChange={setCoverBusy}
            />
          )}
          {step === 5 && (
            <div className="event-wizard-fields">
              <Field
                label="Sayfa adresi"
                value={data.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder="hilal-oguz"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
              <Field
                label="Logo adresi (isteğe bağlı)"
                value={data.logo_url}
                onChange={(e) => set("logo_url", e.target.value)}
              />
              <p className="event-wizard-url">
                shineqr.com/wedding/
                <strong>{data.slug || "sayfa-adresi"}</strong>
              </p>
            </div>
          )}
          {step === 6 && (
            <div className="event-wizard-fields">
              <Field
                label="Müşteri adı soyadı"
                value={data.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                maxLength={100}
              />
              <Field
                label="Müşteri e-posta adresi"
                type="email"
                value={data.customer_email}
                onChange={(e) => set("customer_email", e.target.value)}
                maxLength={254}
              />
              <Field
                label="Müşteri telefonu"
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
              <section
                className="event-wizard-payment"
                aria-labelledby="payment-plan-title"
              >
                <div className="event-wizard-section-heading">
                  <div>
                    <small>ÖDEME PLANI</small>
                    <h4 id="payment-plan-title">Tahsilat nasıl yapılacak?</h4>
                  </div>
                  <strong>{money(grandTotalGrossCents)}</strong>
                </div>
                <div className="event-wizard-choice-grid">
                  <label
                    className={data.payment_plan === "full" ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="payment-plan"
                      checked={data.payment_plan === "full"}
                      onChange={() => set("payment_plan", "full")}
                    />
                    <WalletCards size={20} aria-hidden="true" />
                    <span>
                      <strong>Tam ödeme</strong>
                      <small>Toplam tutar tek seferde tahsil edilir.</small>
                    </span>
                  </label>
                  <label
                    className={
                      data.payment_plan === "deferred" ? "selected" : ""
                    }
                  >
                    <input
                      type="radio"
                      name="payment-plan"
                      checked={data.payment_plan === "deferred"}
                      onChange={() => set("payment_plan", "deferred")}
                    />
                    <Landmark size={20} aria-hidden="true" />
                    <span>
                      <strong>İleri tarihli ödeme</strong>
                      <small>
                        %20 kapora alınır, kalan tutara vade verilir.
                      </small>
                    </span>
                  </label>
                </div>
                <div
                  className="event-wizard-payment-methods"
                  role="radiogroup"
                  aria-label="Ödeme yöntemi"
                >
                  {(
                    [
                      ["card", "Kredi / banka kartı", CreditCard],
                      ["cash", "Nakit", WalletCards],
                      ["bank_transfer", "Havale / EFT", Landmark],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <label
                      key={value}
                      className={
                        data.preferred_payment_method === value
                          ? "selected"
                          : ""
                      }
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        checked={data.preferred_payment_method === value}
                        onChange={() => set("preferred_payment_method", value)}
                      />
                      <Icon size={18} aria-hidden="true" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {data.payment_plan === "deferred" ? (
                  <div className="event-wizard-deposit">
                    <div>
                      <span>%20 kapora</span>
                      <strong>{money(depositCents)}</strong>
                    </div>
                    <div>
                      <span>Kalan bakiye</span>
                      <strong>
                        {money(grandTotalGrossCents - depositCents)}
                      </strong>
                    </div>
                    <Field
                      label="Kalan bakiye son ödeme tarihi"
                      type="date"
                      value={data.payment_due_at}
                      onValueChange={(value) => set("payment_due_at", value)}
                    />
                  </div>
                ) : null}
                <p className="event-wizard-payment-note">
                  Bu seçim tahsilat tercihini kaydeder. Nakit yetkili onayıyla,
                  havale banka eşleşmesiyle, kart ise sanal POS bildirimiyle
                  muhasebeleşir.
                </p>
              </section>
              {photographerPackage.data?.active ? (
                <label
                  className={`event-wizard-photo-package ${data.photographer_package_requested ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={data.photographer_package_requested}
                    disabled={!photographerId}
                    onChange={(event) =>
                      set(
                        "photographer_package_requested",
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    <strong>Fotoğraf paketini ayrı satış olarak ekle</strong>
                    <small>
                      {!photographerId
                        ? "Önce organizasyon detaylarından fotoğrafçı atayın."
                        : "Fotoğrafçı, kaynak partner ve platform payları ayrı muhasebeleşir."}
                    </small>
                  </span>
                  <b>{money(photographerPackage.data.grossPriceCents)}</b>
                </label>
              ) : null}
              {customDesignSelected ? (
                <fieldset className="admin-panel">
                  <legend>Kişiye özel tasarım bilgileri</legend>
                  <label className="form-field">
                    <span>Ayrıntılı açıklama</span>
                    <textarea
                      value={data.custom_design_request.description}
                      onChange={(e) =>
                        setCustomDesign("description", e.target.value)
                      }
                      maxLength={2000}
                    />
                  </label>
                  <label className="form-field">
                    <span>Tercih edilen renkler</span>
                    <input
                      value={data.custom_design_request.colors}
                      onChange={(e) =>
                        setCustomDesign("colors", e.target.value)
                      }
                      maxLength={500}
                    />
                  </label>
                  <label className="form-field">
                    <span>Kullanılacak metinler</span>
                    <textarea
                      value={data.custom_design_request.text_content}
                      onChange={(e) =>
                        setCustomDesign("text_content", e.target.value)
                      }
                      maxLength={2000}
                    />
                  </label>
                  <label className="form-field">
                    <span>Ana görsel</span>
                    <select
                      value={data.custom_design_request.main_image_url}
                      onChange={(e) =>
                        setCustomDesign("main_image_url", e.target.value)
                      }
                    >
                      <option value="">
                        Organizasyon görsellerinden seçin
                      </option>
                      {covers.map((url, index) => (
                        <option key={url} value={url}>
                          {index + 1}. görsel
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="finance-check">
                    {(
                      [
                        ["qr_card", "QR kartı"],
                        ["loading_page", "Loading page"],
                        ["wedding_page", "Wedding page"],
                        ["welcome_sign", "Karşılama panosu"],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="checkbox"
                          checked={data.custom_design_request.surfaces.includes(
                            value,
                          )}
                          onChange={(e) =>
                            setCustomDesign(
                              "surfaces",
                              e.target.checked
                                ? [
                                    ...data.custom_design_request.surfaces,
                                    value,
                                  ]
                                : data.custom_design_request.surfaces.filter(
                                    (item) => item !== value,
                                  ),
                            )
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <label className="form-field">
                    <span>Son teslim tarihi</span>
                    <input
                      type="date"
                      value={data.custom_design_request.due_date}
                      onChange={(e) =>
                        setCustomDesign("due_date", e.target.value)
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Ek notlar</span>
                    <textarea
                      value={data.custom_design_request.notes}
                      onChange={(e) => setCustomDesign("notes", e.target.value)}
                      maxLength={2000}
                    />
                  </label>
                </fieldset>
              ) : null}
              <div className="event-wizard-security">
                <strong>Parola taslağa kaydedilmez.</strong>
                <p>
                  Sayfayı yenilediğinizde bu güvenli profil alanları korunur.
                  Geçici parolayı yayınlama adımında yeniden gireceksiniz.
                </p>
              </div>
            </div>
          )}
          {step === 7 && (
            <div className="event-wizard-review">
              <dl>
                <div>
                  <dt>Organizasyon</dt>
                  <dd>{data.title}</dd>
                </div>
                <div>
                  <dt>Tarih ve mekân</dt>
                  <dd>
                    {data.wedding_date} {data.venue ? `· ${data.venue}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Sayfa</dt>
                  <dd>/wedding/{data.slug}</dd>
                </div>
                <div>
                  <dt>Müşteri</dt>
                  <dd>
                    {data.customer_name} · {data.customer_email} ·{" "}
                    {data.customer_phone}
                  </dd>
                </div>
                <div>
                  <dt>İşletme</dt>
                  <dd>
                    {selectedPartner?.name ||
                      user.partner_name ||
                      "ShineQR Platform"}
                  </dd>
                </div>
                <div>
                  <dt>Satışı yapan</dt>
                  <dd>
                    {sellerPartnerId === "platform"
                      ? "ShineQR Platform"
                      : businessName(sellerPartnerId)}
                  </dd>
                </div>
                <div>
                  <dt>Mekân işletmesi</dt>
                  <dd>
                    {venuePartnerId
                      ? businessName(venuePartnerId)
                      : "Belirtilmedi"}
                  </dd>
                </div>
                <div>
                  <dt>Organizasyon firması</dt>
                  <dd>
                    {plannerPartnerId
                      ? businessName(plannerPartnerId)
                      : "Belirtilmedi"}
                  </dd>
                </div>
                <div>
                  <dt>Fotoğrafçı</dt>
                  <dd>
                    {photographers.data?.find(
                      (item) => item.id === photographerId,
                    )?.display_name || "Daha sonra atanacak"}
                  </dd>
                </div>
                <div>
                  <dt>Ödeme planı</dt>
                  <dd>
                    {data.payment_plan === "deferred"
                      ? `%20 kapora ${money(depositCents)} · kalan ${money(grandTotalGrossCents - depositCents)} · vade ${data.payment_due_at}`
                      : "Tam ödeme"}
                    <br />
                    {data.preferred_payment_method === "card"
                      ? "Kredi / banka kartı"
                      : data.preferred_payment_method === "cash"
                        ? "Nakit"
                        : "Havale / EFT"}
                  </dd>
                </div>
                <div>
                  <dt>Paket ve ek ürünler</dt>
                  <dd>
                    {selectedPackage?.name || data.package_code}
                    {selectedAddOns.length
                      ? ` · ${selectedAddOns.map((item) => `${item.product.name} × ${item.quantity}`).join(", ")}`
                      : " · Ek ürün yok"}
                    <br />
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
                        <span key={product.id}>
                          {product.name}: toplam {total}, ekstra{" "}
                          {Math.max(0, total - included)}
                          <br />
                        </span>
                      );
                    })}
                    KDV dahil toplam: {money(grandTotalGrossCents)}
                  </dd>
                </div>
              </dl>
              <div className="event-wizard-fields">
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
                <p className="admin-hint">
                  Parola yalnızca şimdi gönderilir, hashlenerek hesapta saklanır
                  ve ilk girişte değiştirilmesi istenir.
                </p>
              </div>
            </div>
          )}
          {error && <Notice>{error}</Notice>}
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
            {step < 7 ? (
              <button
                type="button"
                className="admin-button primary"
                onClick={next}
                disabled={busy || coverBusy || partners.isLoading}
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
                  ? user.role === "platform"
                    ? "Yayınlanıyor…"
                    : "Onaya gönderiliyor…"
                  : user.role === "platform"
                    ? "Organizasyonu yayınla"
                    : "Süper admin onayına gönder"}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
