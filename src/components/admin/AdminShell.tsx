"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, KeyRound, Images } from "lucide-react";
import { toast } from "sonner";
import { api, type Account } from "@/lib/api";
import "./admin.css";
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter(),
    pathname = usePathname(),
    qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  return (
    <div className="admin-app">
      <a href="#admin-content" className="admin-skip">
        İçeriğe geç
      </a>
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/admin" className="admin-brand">
            <Images size={22} />
            <span>
              ANILAR
              <small>
                {me.data?.role === "owner" ? "ÖZEL ALBÜM" : "YÖNETİM PANELİ"}
              </small>
            </span>
          </Link>
          <nav aria-label="Yönetim" className="admin-nav">
            <Link
              href="/admin"
              aria-current={!pathname.includes("partners") ? "page" : undefined}
            >
              {me.data?.role === "owner" ? "Albümüm" : "Organizasyonlar"}
            </Link>
            {me.data?.role === "platform" && (
              <Link
                href="/admin/partners"
                aria-current={
                  pathname.includes("partners") ? "page" : undefined
                }
              >
                İşletmeler
              </Link>
            )}
          </nav>
          <details className="admin-account">
            <summary aria-label="Hesap ve gezinme menüsü">
              <span className="admin-avatar">
                {me.data?.display_name?.slice(0, 1) || "A"}
              </span>
              <span className="admin-account-label">Hesabım</span>
              <ChevronDown size={14} />
            </summary>
            <div className="admin-account-menu">
              <p>{me.data?.display_name || "Hesabım"}</p>
              <div className="admin-mobile-nav">
                <Link href="/admin">
                  {me.data?.role === "owner" ? "Albümüm" : "Organizasyonlar"}
                </Link>
                {me.data?.role === "platform" && (
                  <Link href="/admin/partners">İşletmeler</Link>
                )}
              </div>
              <Link href="/account/password">
                <KeyRound size={16} /> Şifre değiştir
              </Link>
              <button
                onClick={async () => {
                  try {
                    await api("/auth/logout", { method: "POST" });
                    qc.clear();
                    router.replace("/auth");
                    router.refresh();
                  } catch {
                    toast.error("Çıkış yapılamadı. Tekrar deneyin.");
                  }
                }}
              >
                <LogOut size={16} /> Çıkış yap
              </button>
            </div>
          </details>
        </div>
      </header>
      <main id="admin-content" className="admin-main">
        {children}
      </main>
    </div>
  );
}
