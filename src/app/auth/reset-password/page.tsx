"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import styles from "../auth.module.css";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (token) {
        await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
        setMessage("Parolanız yenilendi. Şimdi giriş yapabilirsiniz.");
      } else {
        const result = await api<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
        setMessage(result.message);
      }
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }
  return <div className={styles.content}><p className={styles.kicker}>HESAP GÜVENLİĞİ</p><h1>{token ? "Yeni parolanızı belirleyin." : "Parolanızı yenileyin."}</h1><p className={styles.intro}>{token ? "En az 12 karakterli güçlü bir parola kullanın." : "Hesabınız uygunsa 30 dakika geçerli bir bağlantı gönderilir."}</p>{message ? <div className={styles.supportNotice}><p>{message}</p></div> : null}<form className={styles.form} onSubmit={submit}><label className={styles.field}><span>{token ? "Yeni parola" : "E-posta veya kullanıcı adı"}</span><input type={token ? "password" : "text"} value={token ? password : email} onChange={(event) => token ? setPassword(event.target.value) : setEmail(event.target.value)} minLength={token ? 12 : 3} maxLength={256} required /></label><button className={styles.submit} disabled={busy}>{busy ? "İşleniyor…" : token ? "PAROLAYI YENİLE" : "BAĞLANTI GÖNDER"}</button></form><Link className={styles.backButton} href="/auth">Giriş ekranına dön</Link></div>;
}

export default function ResetPasswordPage() {
  return <main className={styles.page}><section className={styles.shell} style={{ display: "grid", gridTemplateColumns: "1fr", maxWidth: 620 }}><div className={styles.formPanel}><div className={styles.formBody}><Suspense fallback={null}><ResetForm /></Suspense></div></div></section></main>;
}
