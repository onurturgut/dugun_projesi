"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Notice, PasswordField } from "@/components/admin/Fields";
import { SecurityPanel } from "@/components/admin/SecurityPanel";
import { AdminShell } from "@/components/admin/AdminShell";
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
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">HESAP</p>
          <h1>Hesap ayarları</h1>
          <p className="admin-subtitle">Profil, görünüm ve güvenlik tercihlerinizi tek yerden yönetin.</p>
        </div>
      </div>
      <div className="account-settings-grid">
      <form
        onSubmit={submit}
        className="admin-panel account-password-card"
      >
        <div className="admin-section-heading">
          <div>
            <span>GÜVENLİK</span>
            <h2>Parola değiştir</h2>
          </div>
        </div>
        <p className="admin-hint">
          Hesabınız için başka bir yerde kullanmadığınız, en az 12 karakterli bir parola belirleyin.
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
        <button disabled={busy} className="admin-button primary account-save-button">
          {busy ? "Kaydediliyor…" : "Şifreyi değiştir"}
        </button>
      </form>
      <SecurityPanel />
      </div>
    </AdminShell>
  );
}
