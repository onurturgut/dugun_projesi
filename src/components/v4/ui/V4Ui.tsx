import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./V4Ui.module.css";

export function V4Theme({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.theme, className)} {...props} />;
}

export function BraidedGradient({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(styles.braid, className)}
      {...props}
    />
  );
}

export interface ElevatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const ElevatedCard = React.forwardRef<HTMLDivElement, ElevatedCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        styles.surface,
        interactive && styles.surfaceInteractive,
        className,
      )}
      {...props}
    />
  ),
);
ElevatedCard.displayName = "ElevatedCard";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "start" | "center";
  level?: 1 | 2 | 3;
  className?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  level = 2,
  className,
  id,
}: SectionHeadingProps) {
  const Heading = `h${level}` as "h1" | "h2" | "h3";
  return (
    <div className={cn(styles.heading, className)} data-align={align}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <Heading
        className={cn(styles.title, level !== 1 && styles.sectionTitle)}
        id={id}
      >
        {title}
      </Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  );
}

export interface PageHeroProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "title"
> {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  headingId?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  headingId = "page-title",
  className,
  ...props
}: PageHeroProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(styles.theme, styles.hero, className)}
      {...props}
    >
      <BraidedGradient />
      <div className={styles.heroInner}>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          level={1}
          id={headingId}
        />
        {actions ? <div className={styles.actions}>{actions}</div> : null}
        {children}
      </div>
    </section>
  );
}

export interface V4ButtonProps extends ButtonProps {
  tone?: "primary" | "secondary" | "outline";
}

export const V4Button = React.forwardRef<HTMLButtonElement, V4ButtonProps>(
  ({ className, tone = "primary", ...props }, ref) => (
    <Button
      ref={ref}
      className={cn(
        styles.button,
        tone === "primary" && styles.buttonPrimary,
        tone === "secondary" && styles.buttonSecondary,
        tone === "outline" && styles.buttonOutline,
        className,
      )}
      {...props}
    />
  ),
);
V4Button.displayName = "V4Button";

export interface StatePanelProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "start" | "center";
}

export function StatePanel({
  icon,
  title,
  description,
  action,
  align = "start",
  className,
  ...props
}: StatePanelProps) {
  return (
    <ElevatedCard
      className={cn(styles.theme, styles.state, className)}
      data-align={align}
      {...props}
    >
      {icon ? <span className={styles.stateIcon}>{icon}</span> : null}
      <h2 className={styles.stateTitle}>{title}</h2>
      {description ? (
        <p className={styles.stateDescription}>{description}</p>
      ) : null}
      {action}
    </ElevatedCard>
  );
}
