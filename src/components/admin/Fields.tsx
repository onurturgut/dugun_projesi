"use client";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { DateField } from "./DateField";
export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  if (props.type === "date")
    return (
      <div className="form-field">
        <span>{label}</span>
        <DateField
          label={label}
          name={props.name}
          defaultValue={String(props.defaultValue || "")}
          required={props.required}
          disabled={props.disabled}
        />
      </div>
    );
  return (
    <label className="form-field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
export function PasswordField({
  label,
  hideLabel = false,
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hideLabel?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const labelId = useId();
  return (
    <div className={hideLabel ? "" : "form-field"}>
      <span id={labelId} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </span>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          aria-labelledby={labelId}
          className={`${className} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
          title={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-gold"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
export function TextField({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <textarea rows={3} {...props} />
    </label>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-cream"
    >
      {children}
    </p>
  );
}
