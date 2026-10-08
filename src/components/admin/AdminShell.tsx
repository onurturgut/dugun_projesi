"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, KeyRound, Moon, Sun } from "lucide-react";
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
  const theme = me.data?.theme || "dark";
  useEffect(() => {
    const resolved =
      theme === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.dataset.adminTheme = resolved;
    return () => {
      delete document.documentElement.dataset.adminTheme;
    };
  }, [theme]);
  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    await api("/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify({ theme: next }),
    });
    await qc.invalidateQueries({ queryKey: ["me"] });
  };
  return (
    <div className="admin-app">
      <a href="#admin-content" className="admin-skip">
        İçeriğe geç
      </a>
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/admin" className="admin-brand">
            <Image
              src="/brand/shineqr-mark.png"
              alt=""
              width={30}
              height={30}
            />
            <span>
              SHINEQR
              <small>
                {me.data?.role === "owner" ? "ÖZEL ALBÜM" : "YÖNETİM PANELİ"}
              </small>
            </span>
          </Link>
          <nav aria-label="Yönetim" className="admin-nav">
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
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
            {me.data?.role === "platform" && (
              <Link
                href="/admin/audit"
                aria-current={pathname.includes("audit") ? "page" : undefined}
              >
                İşlem kayıtları
              </Link>
            )}
          </nav>
          <button
            className="admin-theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Gündüz moduna geç" : "Gece moduna geç"
            }
            title={theme === "dark" ? "Gündüz modu" : "Gece modu"}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <details className="admin-account">
            <summary aria-label="Hesap ve gezinme menüsü">
              <span className="admin-avatar">
                {me.data?.partner_logo_url ? (
                  <Image
                    src={me.data.partner_logo_url}
                    alt={`${me.data.partner_name || "İşletme"} logosu`}
                    fill
                    unoptimized
                    sizes="34px"
                  />
                ) : (
                  me.data?.display_name?.slice(0, 1) || "A"
                )}
              </span>
              <span className="admin-account-label">Hesabım</span>
              <ChevronDown size={14} />
            </summary>
            <div className="admin-account-menu">
              <p>{me.data?.display_name || "Hesabım"}</p>
              <small className="admin-account-partner">
                {me.data?.partner_name}
              </small>
              <div className="admin-mobile-nav">
                <Link href="/admin">
                  {me.data?.role === "owner" ? "Albümüm" : "Organizasyonlar"}
                </Link>
                {me.data?.role === "platform" && (
                  <>
                    <Link href="/admin/partners">İşletmeler</Link>
                    <Link href="/admin/audit">İşlem kayıtları</Link>
                  </>
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
