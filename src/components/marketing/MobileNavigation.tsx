"use client";

import Link from "next/link";
import { LogIn, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { navigation } from "./data";
import styles from "./marketing.module.css";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={styles.mobileNav}>
      <button type="button" onClick={() => setOpen(true)} aria-label="Menüyü aç" aria-expanded={open}>
        <Menu size={21} />
      </button>
      {open ? (
        <div className={styles.mobileNavLayer} role="presentation">
          <button className={styles.mobileNavBackdrop} type="button" onClick={() => setOpen(false)} aria-label="Menüyü kapat" />
          <aside className={styles.mobileNavPanel} role="dialog" aria-modal="true" aria-label="Ana menü">
            <header>
              <span>SHINEQR</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X size={20} /></button>
            </header>
            <nav>
              {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
              <Link href="/sss" onClick={() => setOpen(false)}>Sık sorulan sorular</Link>
              <Link href="/iletisim" onClick={() => setOpen(false)}>İletişim</Link>
            </nav>
            <Link className={styles.mobileLogin} href="/auth" onClick={() => setOpen(false)}><LogIn size={18} /> Giriş yap</Link>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
