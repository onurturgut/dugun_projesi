"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PasswordField, Field, Notice } from "@/components/admin/Fields";
import { api } from "@/lib/api";

export default function PhotographerInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/photographer-invitations/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({ display_name: name, password }),
      });
      router.replace("/auth");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="admin-kicker">SHINEQR FOTOĞRAFÇI DAVETİ</p>
        <h1>Fotoğrafçı hesabınızı etkinleştirin</h1>
        <p>
          Hesabınız yalnızca davet edildiğiniz organizasyona profesyonel dosya
          yükleyebilir.
        </p>
        {error ? <Notice>{error}</Notice> : null}
        <Field
          label="Ad soyad"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={100}
          required
        />
        <PasswordField
          label="Parola"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={12}
          maxLength={256}
          required
        />
        <button className="admin-button primary" disabled={busy}>
          {busy ? "Etkinleştiriliyor…" : "Hesabı etkinleştir"}
        </button>
      </form>
    </main>
  );
}
