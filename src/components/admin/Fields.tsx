"use client";
export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input {...props} />
    </label>
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
