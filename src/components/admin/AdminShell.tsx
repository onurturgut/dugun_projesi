"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Account } from "@/lib/api";
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter(),
    qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/admin"
            className="font-display text-lg tracking-[0.2em] text-gold"
          >
            ANILAR · {me.data?.role === "owner" ? "ALBÜMÜM" : "YÖNETİM"}
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <Link className="btn-secondary" href="/admin">
              Organizasyonlar
            </Link>
            {me.data?.role === "platform" && (
              <Link className="btn-secondary" href="/admin/partners">
                İşletmeler
              </Link>
            )}
            <Link className="btn-secondary" href="/account/password">
              Şifre değiştir
            </Link>
            <button
              className="btn-secondary"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" });
                qc.clear();
                router.replace("/auth");
                router.refresh();
              }}
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
