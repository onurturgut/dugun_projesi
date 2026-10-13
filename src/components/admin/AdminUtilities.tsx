"use client";
import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, CalendarDays, Search, UserRound, X } from "lucide-react";
import { api } from "@/lib/api";

type Notification = { id: string; severity: "danger" | "warning" | "info"; title: string; description: string; href: string };
type SearchItem = { id: string; type: "event" | "partner" | "account"; title: string; subtitle: string; href: string };
const icons = { event: CalendarDays, partner: Building2, account: UserRound };

export function AdminUtilities() {
  const [searchOpen, setSearchOpen] = useState(false), [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const input = useRef<HTMLInputElement>(null);
  const notifications = useQuery({ queryKey: ["admin-notifications"], queryFn: () => api<{ items: Notification[]; total: number }>("/admin/notifications"), refetchInterval: 60_000 });
  const results = useQuery({ queryKey: ["admin-search", deferred], queryFn: () => api<{ items: SearchItem[] }>(`/admin/search?q=${encodeURIComponent(deferred)}`), enabled: searchOpen && deferred.length >= 2 });
  useEffect(() => { if (searchOpen) input.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <>
    <button className="admin-utility-button admin-global-search-button" type="button" onClick={() => setSearchOpen(true)} aria-label="Panelde ara"><Search size={17} /><span>Ara</span><kbd>Ctrl K</kbd></button>
    <details className="admin-notifications">
      <summary className="admin-utility-button" aria-label={`${notifications.data?.total || 0} bildirim`}><Bell size={17} />{notifications.data?.total ? <i>{notifications.data.total}</i> : null}</summary>
      <div className="admin-notification-menu"><header><strong>Görev merkezi</strong><span>{notifications.data?.total || 0} açık konu</span></header>{notifications.isLoading ? <p>Kontrol ediliyor…</p> : notifications.data?.items.length ? notifications.data.items.map((item) => <Link href={item.href} key={item.id} className={`notification-${item.severity}`}><i /><span><strong>{item.title}</strong><small>{item.description}</small></span></Link>) : <div className="notification-empty"><Bell size={20} /><span>Açık görev bulunmuyor.</span></div>}</div>
    </details>
    {searchOpen ? <div className="admin-command-layer" role="dialog" aria-modal="true" aria-label="Global arama"><button className="admin-command-backdrop" onClick={() => setSearchOpen(false)} aria-label="Aramayı kapat" /><section className="admin-command"><header><Search size={19} /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Organizasyon, işletme veya hesap ara…" /><button onClick={() => setSearchOpen(false)} aria-label="Kapat"><X size={18} /></button></header><div className="admin-command-results">{deferred.length < 2 ? <p>Aramak için en az iki karakter yazın.</p> : results.isLoading ? <p>Aranıyor…</p> : results.data?.items.length ? results.data.items.map((item) => { const Icon = icons[item.type]; return <Link href={item.href} key={`${item.type}-${item.id}`} onClick={() => setSearchOpen(false)}><Icon size={17} /><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></Link>; }) : <p>Sonuç bulunamadı.</p>}</div></section></div> : null}
  </>;
}
