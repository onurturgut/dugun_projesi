"use client";

import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { V4Button } from "./V4Ui";
import styles from "./V4Ui.module.css";

export type V4NavigationItem = {
  href: string;
  label: string;
};

export interface V4NavbarProps {
  items: readonly V4NavigationItem[];
  currentPath?: string;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
}

function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="ShineQR ana sayfa">
      <span className={styles.brandMark} aria-hidden="true">
        ✦
      </span>
      SHINEQR
    </Link>
  );
}

export function V4Navbar({
  items,
  currentPath,
  ctaHref = "/auth",
  ctaLabel = "Başlayın",
  className,
}: V4NavbarProps) {
  return (
    <header className={cn(styles.theme, styles.navbar, className)}>
      <div className={styles.navbarInner}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="Ana menü">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.navLink}
              data-active={currentPath === item.href || undefined}
              aria-current={currentPath === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.navActions}>
          <V4Button asChild tone="primary">
            <Link href={ctaHref}>
              {ctaLabel} <ArrowRight aria-hidden="true" />
            </Link>
          </V4Button>
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className={styles.mobileTrigger}
                aria-label="Ana menüyü aç"
              >
                <Menu aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent className={cn(styles.theme, styles.mobileSheet)}>
              <SheetHeader className={styles.mobileSheetHeader}>
                <SheetTitle>SHINEQR</SheetTitle>
                <SheetDescription>
                  Hizmetleri, işletmeleri ve hesap seçeneklerini keşfedin.
                </SheetDescription>
              </SheetHeader>
              <nav className={styles.mobileLinks} aria-label="Mobil ana menü">
                {items.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={styles.mobileLink}
                      data-active={currentPath === item.href || undefined}
                      aria-current={
                        currentPath === item.href ? "page" : undefined
                      }
                    >
                      {item.label}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <SheetClose asChild>
                <V4Button asChild className={styles.mobileCta} tone="primary">
                  <Link href={ctaHref}>
                    {ctaLabel} <ArrowRight aria-hidden="true" />
                  </Link>
                </V4Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
