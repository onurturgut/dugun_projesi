"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { GoldDivider } from "@/components/wedding/GoldDivider";
export default function AuthPage() {
  const navigate = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await api<{ must_change_password: boolean }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      navigate.push(
        result.must_change_password ? "/account/password" : "/admin",
      );
      navigate.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Giriş yapılamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="card-luxe w-full max-w-sm rounded-2xl px-6 py-8">
        <h1 className="text-center text-xl font-light uppercase tracking-[0.24em] text-cream">
          Yönetim
        </h1>
        <GoldDivider className="my-5" />
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            aria-label="Kullanıcı adı veya e-posta"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Kullanıcı adı veya e-posta"
            className="min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-sm text-cream outline-none placeholder:text-muted-foreground focus:border-gold/60"
          />
          <input
            type="password"
            aria-label="Şifre"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            className="min-h-[48px] w-full rounded-xl border border-border bg-surface px-4 text-sm text-cream outline-none placeholder:text-muted-foreground focus:border-gold/60"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-[50px] w-full rounded-xl bg-[image:var(--gradient-gold)] text-sm uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </main>
  );
}
