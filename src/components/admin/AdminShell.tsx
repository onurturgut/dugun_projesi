"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  FileClock,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  X,
  Users,
  Activity,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Account } from "@/lib/api";
import "./admin.css";
import { AdminUtilities } from "./AdminUtilities";
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter(),
    pathname = usePathname(),
    qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const theme = me.data?.theme || "light";
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
  useEffect(() => setMobileOpen(false), [pathname]);
  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    await api("/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify({ theme: next }),
    });
    await qc.invalidateQueries({ queryKey: ["me"] });
  };
  const navigation =
    me.data?.role === "platform"
      ? [
          { href: "/admin", label: "Organizasyonlar", icon: LayoutDashboard },
          { href: "/admin/design-center", label: "Tasarım Merkezi", icon: Palette },
          { href: "/admin/partners", label: "İşletmeler", icon: Building2 },
          { href: "/admin/accounts", label: "Yetkili hesaplar", icon: Users },
          { href: "/admin/operations", label: "Medya merkezi", icon: Activity },
          { href: "/admin/audit", label: "İşlem kayıtları", icon: FileClock },
        ]
      : me.data?.role === "owner"
        ? [{ href: "/admin", label: "Etkinliğim", icon: Images }]
        : [{ href: "/admin", label: "Organizasyonlarım", icon: LayoutDashboard }, { href: "/admin/accounts", label: "Yetkili hesaplar", icon: Users }];
  const current = navigation.find((item) =>
    item.href === "/admin"
      ? pathname === "/admin" || /^\/admin\/[^/]+/.test(pathname)
      : pathname.startsWith(item.href),
  );
  const roleLabel =
    me.data?.role === "platform"
      ? "Platform yönetimi"
      : me.data?.role === "partner"
        ? "Partner paneli"
        : "Müşteri paneli";

  const SidebarContent = () => (
    <>
      <div className="dashboard-sidebar-head">
        <Link href="/admin" className="dashboard-brand" aria-label="ShineQR panel ana sayfası">
          <Image src="/brand/shineqr-mark.png" alt="" width={36} height={36} />
          <span><strong>SHINEQR</strong><small>{roleLabel}</small></span>
        </Link>
        <button type="button" className="dashboard-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <div className="dashboard-nav-label">ÇALIŞMA ALANI</div>
      <nav className="dashboard-sidebar-nav" aria-label="Panel menüsü">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin" || /^\/admin\/[^/]+\/(design)(\/|$)/.test(pathname)
              : pathname.startsWith(href);
          return <Link href={href} key={href} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined}><Icon size={18} strokeWidth={1.7} /><span>{label}</span></Link>;
        })}
      </nav>
      <div className="dashboard-sidebar-foot">
        <Link href="/account/password" aria-current={pathname.startsWith("/account/") ? "page" : undefined}><Settings size={18} strokeWidth={1.7} /><span>Hesap ayarları</span></Link>
        <div className="dashboard-tenant">
          <span className="admin-avatar">
            {me.data?.partner_logo_url ? <Image src={me.data.partner_logo_url} alt="" fill unoptimized sizes="36px" /> : me.data?.display_name?.slice(0, 1) || "S"}
          </span>
          <span><strong>{me.data?.display_name || "Hesabım"}</strong><small>{me.data?.partner_name}</small></span>
        </div>
      </div>
    </>
  );

  return (
    <div className={`admin-app ${collapsed ? "dashboard-collapsed" : ""}`}>
      <a href="#admin-content" className="admin-skip">
        İçeriğe geç
      </a>
      <aside className="dashboard-sidebar"><SidebarContent /></aside>
      {mobileOpen && (
        <>
          <button className="dashboard-mobile-backdrop" aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} />
          <aside className="dashboard-mobile-sidebar is-open" aria-label="Mobil panel menüsü">
            <button className="dashboard-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"><X size={20} /></button>
            <SidebarContent />
          </aside>
        </>
      )}
      <div className="dashboard-page">
        <header className="dashboard-topbar">
          <button type="button" className="dashboard-menu-button" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç" aria-expanded={mobileOpen}><Menu size={20} /></button>
          <div className="dashboard-breadcrumb" aria-label="Sayfa yolu">
            <span>{roleLabel}</span><ChevronDown size={13} aria-hidden="true" /><strong>{current?.label || "Organizasyon"}</strong>
          </div>
          <div className="dashboard-topbar-actions">
          <AdminUtilities />
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
              <Link href="/account/password">
                <KeyRound size={16} /> Hesap ayarları
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
        <main id="admin-content" className="admin-main">{children}</main>
      </div>
    </div>
  );
}
