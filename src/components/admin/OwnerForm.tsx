"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Field, Notice } from "./Fields";
export function OwnerForm({ id }: { id: string }) {
  const qc = useQueryClient(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const owner = useQuery({
    queryKey: ["owner", id],
    queryFn: () =>
      api<{
        email: string;
        display_name: string;
        must_change_password: boolean;
      } | null>(`/admin/weddings/${id}/owner`),
  });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api(`/admin/weddings/${id}/owner`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      qc.invalidateQueries({ queryKey: ["owner", id] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card-luxe rounded-2xl p-5">
      <h2 className="text-xl text-cream">Organizasyon sahibi</h2>
      {owner.isLoading ? (
        <p>Yükleniyor…</p>
      ) : owner.data ? (
        <div className="mt-3 text-sm">
          <p>{owner.data.display_name}</p>
          <p className="mt-2 break-all text-gold">{owner.data.email}</p>
          <p className="mt-2 text-muted-foreground">
            {owner.data.must_change_password
              ? "İlk girişte şifresini değiştirecek."
              : "Hesap kullanıma hazır."}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Ad soyad" name="display_name" required />
          <Field
            label="Kullanıcı adı veya e-posta"
            name="username"
            required
            autoComplete="off"
          />
          <Field
            label="Geçici şifre (en az 12 karakter)"
            name="password"
            type="password"
            minLength={12}
            maxLength={256}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Geçici şifreyi kullanıcıya iletin. İlk girişte değiştirmesi
            zorunludur.
          </p>
          <button disabled={busy} className="btn-primary w-full">
            {busy ? "Oluşturuluyor…" : "Sahip hesabı oluştur"}
          </button>
        </form>
      )}
      {(error || owner.error) && (
        <Notice>{error || owner.error?.message}</Notice>
      )}
    </section>
  );
}
