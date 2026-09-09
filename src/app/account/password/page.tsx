"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Field, Notice } from "@/components/admin/Fields";
export default function Password() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter(),
    qc = useQueryClient();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError("");
    if (form.get("password") !== form.get("confirm")) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: form.get("current_password"),
          password: form.get("password"),
        }),
      });
      qc.clear();
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5">
      <form
        onSubmit={submit}
        className="card-luxe w-full space-y-4 rounded-2xl p-6"
      >
        <h1 className="text-2xl text-cream">Şifrenizi değiştirin</h1>
        <p className="text-sm text-muted-foreground">
          İlk girişte size verilen geçici şifreyi değiştirmeniz gerekir.
        </p>
        <Field
          label="Mevcut / geçici şifre"
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
        />
        <Field
          label="Yeni şifre"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          required
        />
        <Field
          label="Yeni şifre tekrar"
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          required
        />
        {error && <Notice>{error}</Notice>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Kaydediliyor…" : "Şifreyi değiştir"}
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={async () => {
            await api("/auth/logout", { method: "POST" });
            qc.clear();
            router.replace("/auth");
            router.refresh();
          }}
        >
          Çıkış yap
        </button>
      </form>
    </main>
  );
}
