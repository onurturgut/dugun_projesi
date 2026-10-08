"use client";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Account } from "@/lib/api";
import { Notice } from "./Fields";

type SessionRow = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  userAgent: string;
  ip: string | null;
  current: boolean;
};

export function SecurityPanel() {
  const qc = useQueryClient();
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api<SessionRow[]>("/auth/sessions"),
  });
  const refresh = async () => {
    setCode("");
    setSecret("");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["me"] }),
      qc.invalidateQueries({ queryKey: ["sessions"] }),
    ]);
  };
  return (
    <section className="card-luxe w-full rounded-2xl p-6">
      <h2 className="text-xl text-cream">Hesap güvenliği</h2>
      {me.data ? (
        <div className="account-profile-card">
          <div className="account-profile-logo">
            {me.data.partner_logo_url ? (
              <Image
                src={me.data.partner_logo_url}
                alt={`${me.data.partner_name || "İşletme"} logosu`}
                fill
                unoptimized
                sizes="64px"
              />
            ) : (
              <span>{me.data.display_name.slice(0, 1)}</span>
            )}
          </div>
          <div>
            <strong>{me.data.display_name}</strong>
            <p>{me.data.partner_name}</p>
            <small>
              {me.data.role === "platform"
                ? "Süperadmin"
                : me.data.role === "partner"
                  ? "İşletme yöneticisi"
                  : "Organizasyon sahibi"}
            </small>
          </div>
        </div>
      ) : null}
      {me.data ? (
        <div className="account-appearance">
          <div>
            <h3>Görünüm</h3>
            <p>Panel temasını cihazdan bağımsız hesabınıza kaydedin.</p>
          </div>
          <div className="admin-segment" aria-label="Panel görünümü">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed={(me.data?.theme || "dark") === theme}
                onClick={async () => {
                  await api("/auth/preferences", {
                    method: "PATCH",
                    body: JSON.stringify({ theme }),
                  });
                  await qc.invalidateQueries({ queryKey: ["me"] });
                }}
              >
                {theme === "light"
                  ? "Gündüz"
                  : theme === "dark"
                    ? "Gece"
                    : "Sistem"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {me.data?.role === "platform" ? (
        <div className="mt-4 border-b border-border pb-5">
          <h3 className="text-sm text-cream">İki aşamalı doğrulama</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {me.data.mfa_enabled
              ? "Hesabınız doğrulama uygulamasıyla korunuyor."
              : "Google Authenticator, Microsoft Authenticator veya benzeri bir uygulama kullanın."}
          </p>
          {!me.data.mfa_enabled && !secret ? (
            <button
              className="btn-secondary mt-3"
              onClick={async () => {
                try {
                  setError("");
                  const result = await api<{ secret: string }>(
                    "/auth/2fa/setup",
                    { method: "POST" },
                  );
                  setSecret(result.secret);
                } catch (cause) {
                  setError((cause as Error).message);
                }
              }}
            >
              2FA kurulumu başlat
            </button>
          ) : null}
          {secret || me.data.mfa_enabled ? (
            <div className="mt-3 space-y-3">
              {secret ? (
                <p className="break-all rounded-xl border border-border bg-surface p-3 font-mono text-sm text-gold">
                  {secret}
                </p>
              ) : null}
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 haneli kod"
                aria-label="Doğrulama kodu"
                className="min-h-12 w-full rounded-xl border border-border bg-surface px-4"
              />
              <button
                className="btn-secondary"
                disabled={code.length !== 6}
                onClick={async () => {
                  try {
                    setError("");
                    await api(
                      me.data?.mfa_enabled
                        ? "/auth/2fa/disable"
                        : "/auth/2fa/enable",
                      { method: "POST", body: JSON.stringify({ code }) },
                    );
                    await refresh();
                  } catch (cause) {
                    setError((cause as Error).message);
                  }
                }}
              >
                {me.data.mfa_enabled
                  ? "2FA'yı kapat"
                  : "Doğrula ve etkinleştir"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-5">
        <h3 className="text-sm text-cream">Aktif oturumlar</h3>
        <div className="mt-3 space-y-3">
          {sessions.data?.map((session) => (
            <div
              key={session.id}
              className="rounded-xl border border-border p-3 text-xs text-muted-foreground"
            >
              <p className="line-clamp-2 text-cream">{session.userAgent}</p>
              <p className="mt-1">
                {session.ip || "IP bilinmiyor"} ·{" "}
                {new Date(session.createdAt).toLocaleString("tr-TR")}
              </p>
              {session.current ? (
                <span className="mt-2 inline-block text-gold">Bu cihaz</span>
              ) : (
                <button
                  className="btn-secondary mt-2"
                  onClick={async () => {
                    await api(`/auth/sessions/${session.id}`, {
                      method: "DELETE",
                    });
                    await qc.invalidateQueries({ queryKey: ["sessions"] });
                  }}
                >
                  Oturumu kapat
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {error || me.error || sessions.error ? (
        <div className="mt-4">
          <Notice>
            {error || me.error?.message || sessions.error?.message}
          </Notice>
        </div>
      ) : null}
    </section>
  );
}
