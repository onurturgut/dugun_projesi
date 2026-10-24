"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import styles from "./RouteState.module.css";

type RouteStateProps = {
  code: string;
  title: string;
  description: string;
  loading?: boolean;
  compact?: boolean;
  retry?: () => void;
  homeHref?: string;
  homeLabel?: string;
};

export function RouteState({
  code,
  title,
  description,
  loading = false,
  compact = false,
  retry,
  homeHref = "/",
  homeLabel = "Ana sayfaya dön",
}: RouteStateProps) {
  const Container = compact ? "div" : "main";
  return (
    <Container
      className={`${styles.page} ${compact ? styles.compact : ""}`}
      aria-live={loading ? "polite" : undefined}
      aria-busy={loading || undefined}
    >
      <section className={styles.card}>
        <Image
          className={styles.logo}
          src="/brand/shineqr-lockup-transparent.png"
          alt="ShineQR"
          width={210}
          height={72}
          priority
        />
        {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
        <span className={styles.code}>{code}</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        {!loading ? (
          <div className={styles.actions}>
            {retry ? (
              <button className={styles.primary} type="button" onClick={retry}>
                <RefreshCw size={16} aria-hidden="true" /> Tekrar dene
              </button>
            ) : null}
            <Link className={retry ? styles.secondary : styles.primary} href={homeHref}>
              <ArrowLeft size={16} aria-hidden="true" /> {homeLabel}
            </Link>
          </div>
        ) : null}
      </section>
    </Container>
  );
}
