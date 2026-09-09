"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Account, Partner } from "@/lib/models";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, Notice } from "@/components/admin/Fields";
export default function Partners() {
  const qc = useQueryClient(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const list = useQuery({
    queryKey: ["partners"],
    queryFn: () => api<Partner[]>("/admin/partners"),
    enabled: me.data?.role === "platform",
  });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const element = e.currentTarget;
    try {
      await api("/admin/partners", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(element))),
      });
      element.reset();
      qc.invalidateQueries({ queryKey: ["partners"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(p: Partner) {
    setError("");
    try {
      await api(`/admin/partners/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !p.active }),
      });
      qc.invalidateQueries({ queryKey: ["partners"] });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <AdminShell>
      <h1 className="mb-6 text-3xl text-cream">Partner işletmeler</h1>
      {me.isLoading ? (
        <p>Yükleniyor…</p>
      ) : me.data?.role !== "platform" ? (
        <Notice>Bu alan yalnızca platform yöneticisine açıktır.</Notice>
      ) : (
        <>
          <form
            onSubmit={submit}
            className="card-luxe grid gap-4 rounded-2xl p-5 md:grid-cols-2"
          >
            <Field label="İşletme adı" name="name" required />
            <Field label="Yetkili adı" name="display_name" required />
            <Field
              label="Kullanıcı adı veya e-posta"
              name="username"
              required
            />
            <Field
              label="Geçici şifre (en az 12 karakter)"
              name="password"
              type="password"
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
              required
            />
            <Field
              label="Logo adresi (isteğe bağlı, HTTPS)"
              name="logo_url"
              type="url"
            />
            <button disabled={busy} className="btn-primary">
              {busy ? "Oluşturuluyor…" : "İşletme hesabı oluştur"}
            </button>
          </form>
          {(error || list.error) && (
            <Notice>{error || list.error?.message}</Notice>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {list.data?.map((p) => (
              <article key={p.id} className="card-luxe rounded-2xl p-5">
                <h2 className="text-xl">{p.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.active ? "Aktif" : "Erişim kapalı"}
                </p>
                {p.id !== "platform" && (
                  <button
                    onClick={() => toggle(p)}
                    className="btn-secondary mt-4"
                  >
                    {p.active ? "Erişimi kapat" : "Erişimi aç"}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}
