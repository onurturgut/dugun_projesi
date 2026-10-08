"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Notice, PasswordField } from "@/components/admin/Fields";
import { SecurityPanel } from "@/components/admin/SecurityPanel";
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-10">
      <form
        onSubmit={submit}
        className="card-luxe w-full space-y-4 rounded-2xl p-6"
      >
        <h1 className="text-2xl text-cream">Şifrenizi değiştirin</h1>
        <p className="text-sm text-muted-foreground">
          İlk girişte size verilen geçici şifreyi değiştirmeniz gerekir.
        </p>
        <PasswordField
          label="Mevcut / geçici şifre"
          name="current_password"
          autoComplete="current-password"
          required
        />
        <PasswordField
          label="Yeni şifre"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          required
        />
        <PasswordField
          label="Yeni şifre tekrar"
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
      <SecurityPanel />
    </main>
  );
}
