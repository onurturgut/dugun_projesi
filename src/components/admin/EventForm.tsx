"use client";
import { SelectField } from "./SelectField";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Account, Partner, Wedding } from "@/lib/models";
import { Field, TextField, Notice } from "./Fields";
import { CoverUpload } from "./CoverUpload";
export function EventForm({
  event,
  user,
  onSaved,
}: {
  event?: Wedding;
  user: Account;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [covers, setCovers] = useState(event?.cover_images ?? []);
  const [coverBusy, setCoverBusy] = useState(false);
  const [partnerId, setPartnerId] = useState(
    event?.partner_id || user.partner_id || "platform",
  );
  const partners = useQuery({
    queryKey: ["partners"],
    queryFn: () => api<Partner[]>("/admin/partners"),
    enabled: user.role === "platform",
  });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (coverBusy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const get = (key: string) => String(form.get(key) || "");
    try {
      await api(event ? `/admin/weddings/${event.id}` : "/admin/weddings", {
        method: event ? "PATCH" : "POST",
        body: JSON.stringify({
          title: get("title"),
          event_type: get("event_type"),
          slug: get("slug"),
          wedding_date: get("wedding_date"),
          bride_name: get("bride_name"),
          groom_name: get("groom_name"),
          cover_images: covers,
          logo_url: get("logo_url"),
          hero_message: get("hero_message"),
          thank_you_message: get("thank_you_message"),
          ...(event
            ? { upload_enabled: form.get("upload_enabled") === "on" }
            : {}),
          ...(user.role === "platform"
            ? {
                partner_id: event?.partner_id || get("partner_id"),
                upload_days: Number(get("upload_days")),
                trash_days: Number(get("trash_days")),
              }
            : {}),
        }),
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="card-luxe grid gap-4 rounded-2xl p-5 md:grid-cols-2"
    >
      <Field
        label="Organizasyon başlığı"
        name="title"
        defaultValue={event?.title}
        placeholder="Hilal & Oğuz"
        required
        maxLength={160}
      />
      <label className="form-field">
        <span>Organizasyon türü</span>
        <SelectField
          name="event_type"
          defaultValue={event?.event_type || "Düğün"}
        >
          {["Düğün", "Nişan", "Doğum günü", "Kurumsal etkinlik", "Diğer"].map(
            (t) => (
              <option key={t}>{t}</option>
            ),
          )}
        </SelectField>
      </label>
      <Field
        label="Organizasyon tarihi"
        name="wedding_date"
        type="date"
        defaultValue={event?.wedding_date || ""}
        required
      />
      <Field
        label="Sayfa adresi"
        name="slug"
        defaultValue={event?.slug}
        placeholder="hilal-oguz"
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        required
      />
      <Field
        label="Gelin adı (isteğe bağlı)"
        name="bride_name"
        defaultValue={event?.bride_name}
      />
      <Field
        label="Damat adı (isteğe bağlı)"
        name="groom_name"
        defaultValue={event?.groom_name}
      />
      <div className="md:col-span-2">
        <CoverUpload
          value={covers}
          onChange={setCovers}
          eventId={event?.id}
          partnerId={partnerId}
          disabled={busy}
          onBusyChange={setCoverBusy}
        />
      </div>
      <Field
        label="İşletme logosu adresi (HTTPS)"
        name="logo_url"
        defaultValue={event?.logo_url || ""}
      />
      {user.role === "platform" && !event && (
        <label className="form-field">
          <span>İşletme</span>
          <SelectField
            name="partner_id"
            value={partnerId}
            disabled={coverBusy || busy}
            onValueChange={(value) => {
              setPartnerId(value);
              setCovers([]);
            }}
          >
            {partners.data
              ?.filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </SelectField>
        </label>
      )}
      <TextField
        label="Karşılama mesajı"
        name="hero_message"
        defaultValue={
          event?.hero_message || "Bu özel günü anılarınızla ölümsüzleştirelim."
        }
      />
      <TextField
        label="Teşekkür mesajı"
        name="thank_you_message"
        defaultValue={
          event?.thank_you_message ||
          "Bu mutlu günümüze eşlik ettiğiniz için teşekkür ederiz."
        }
      />
      {user.role === "platform" && (
        <>
          <Field
            label="Yüklemeler kaç gün sonra kapansın?"
            name="upload_days"
            type="number"
            min={1}
            max={90}
            defaultValue={event?.upload_days || 7}
            required
          />
          <Field
            label="Çöp kutusu süresi (gün)"
            name="trash_days"
            type="number"
            min={1}
            max={30}
            defaultValue={event?.trash_days || 7}
            required
          />
        </>
      )}
      {event && (
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="upload_enabled"
            defaultChecked={event.upload_enabled}
          />
          Misafir yüklemelerine izin ver
        </label>
      )}
      <p className="text-xs text-muted-foreground md:col-span-2">
        Saatler Türkiye saatine göredir. Fotoğraf ve videolar organizasyon
        tarihinden 3 takvim ayı sonra kalıcı silinir.
      </p>
      {error && (
        <div className="md:col-span-2">
          <Notice>{error}</Notice>
        </div>
      )}
      <button
        className="btn-primary md:col-span-2"
        disabled={busy || coverBusy || partners.isLoading}
      >
        {busy
          ? "Kaydediliyor…"
          : event
            ? "Değişiklikleri kaydet"
            : "Organizasyon oluştur"}
      </button>
    </form>
  );
}
