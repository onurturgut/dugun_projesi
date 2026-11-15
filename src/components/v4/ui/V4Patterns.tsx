import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";
import { ElevatedCard } from "./V4Ui";
import styles from "./V4Ui.module.css";

export type V4FooterGroup = {
  title: string;
  links: readonly { href: string; label: string }[];
};

export interface V4FooterProps extends React.HTMLAttributes<HTMLElement> {
  description: string;
  groups: readonly V4FooterGroup[];
  legalText?: string;
  secondary?: React.ReactNode;
}

export function V4Footer({
  description,
  groups,
  legalText = `© ${new Date().getFullYear()} ShineQR. Tüm hakları saklıdır.`,
  secondary,
  className,
  ...props
}: V4FooterProps) {
  return (
    <footer className={cn(styles.theme, styles.footer, className)} {...props}>
      <div className={styles.footerGrid}>
        <div className={styles.footerIntro}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="ShineQR ana sayfa"
          >
            <span className={styles.brandMark} aria-hidden="true">
              ✦
            </span>
            SHINEQR
          </Link>
          <p>{description}</p>
        </div>
        {groups.map((group) => (
          <nav
            key={group.title}
            className={styles.footerGroup}
            aria-label={group.title}
          >
            <h2>{group.title}</h2>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.footerLink}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className={styles.footerBottom}>
        <p className={styles.footerLegal}>{legalText}</p>
        {secondary}
      </div>
    </footer>
  );
}

export interface V4FormFieldProps {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactElement<React.ComponentPropsWithoutRef<"input">>;
  className?: string;
}

export function V4FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: V4FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn(styles.formField, className)}>
      <label className={styles.formLabel} htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {React.cloneElement(children, {
        id,
        required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: cn(styles.control, children.props.className),
      })}
      {hint ? (
        <p className={styles.formHint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.formError} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
  label?: string;
}

export function FilterBar({
  actions,
  label = "Liste filtreleri",
  children,
  className,
  ...props
}: FilterBarProps) {
  return (
    <div
      className={cn(styles.theme, styles.filterBar, className)}
      role="search"
      aria-label={label}
      {...props}
    >
      <div className={styles.filterContent}>{children}</div>
      {actions ? <div className={styles.filterActions}>{actions}</div> : null}
    </div>
  );
}

export interface KpiCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
}

export function KpiCard({
  label,
  value,
  meta,
  icon,
  className,
  ...props
}: KpiCardProps) {
  return (
    <ElevatedCard
      className={cn(styles.theme, styles.kpiCard, className)}
      {...props}
    >
      <div className={styles.kpiHeader}>
        <p className={styles.kpiLabel}>{label}</p>
        {icon ? <span className={styles.kpiIcon}>{icon}</span> : null}
      </div>
      <p className={styles.kpiValue}>{value}</p>
      {meta ? <p className={styles.kpiMeta}>{meta}</p> : null}
    </ElevatedCard>
  );
}
