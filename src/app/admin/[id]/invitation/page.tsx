"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, Notice, TextField } from "@/components/admin/Fields";
import { api } from "@/lib/api";

type Invitation = {
  template_version: 1;
  status: "draft" | "published";
  event_date: string;
  event_time: string;
  venue: string;
  map_url: string;
  message: string;
};

const empty = { event_date: "", event_time: "", venue: "", map_url: "", message: "" };

export default function DigitalInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const invitation = useQuery({
    queryKey: ["digital-invitation", id],
    queryFn: () => api<Invitation | null>(`/admin/weddings/${id}/digital-invitation`),
  });
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invitation.data) {
      const { event_date, event_time, venue, map_url, message } = invitation.data;
      setForm({ event_date, event_time, venue, map_url, message });
    }
  }, [invitation.data]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/digital-invitation`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      await queryClient.invalidateQueries({ queryKey: ["digital-invitation", id] });
      toast.success("Dijital davetiye taslağı kaydedildi.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/digital-invitation/publish`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await queryClient.invalidateQueries({ queryKey: ["digital-invitation", id] });
      toast.success("Dijital davetiye yayınlandı.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">PREMIUM V2</p>
          <h1>Dijital davetiye</h1>
          <p className="admin-subtitle">Tarih, saat, mekân ve HTTPS harita bağlantısını yayınlayın.</p>
        </div>
      </div>
      {invitation.error ? <Notice>{invitation.error.message}</Notice> : null}
      {error ? <Notice>{error}</Notice> : null}
      <form className="admin-panel finance-add-on-form" onSubmit={save}>
        <Field label="Tarih" type="date" required value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })} />
        <Field label="Saat" type="time" required value={form.event_time} onChange={(event) => setForm({ ...form, event_time: event.target.value })} />
        <Field label="Mekân" required maxLength={200} value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
        <Field label="HTTPS harita bağlantısı" type="url" required value={form.map_url} onChange={(event) => setForm({ ...form, map_url: event.target.value })} />
        <TextField label="Davetiye mesajı" maxLength={500} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        <button className="admin-button" disabled={busy}>Taslağı kaydet</button>
        <button className="admin-button primary" type="button" disabled={busy || !invitation.data} onClick={() => void publish()}>
          {invitation.data?.status === "published" ? "Yeniden yayınla" : "Yayınla"}
        </button>
      </form>
    </AdminShell>
  );
}
