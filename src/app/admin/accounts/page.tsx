"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, KeyRound, Plus, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, Notice, PasswordField } from "@/components/admin/Fields";
import { SelectField } from "@/components/admin/SelectField";
import { api, type Account, type Partner } from "@/lib/api";

type Managed = Pick<
  Account,
  | "id"
  | "email"
  | "display_name"
  | "role"
  | "staff_role"
  | "partner_id"
  | "disabled"
>;
const labels: Record<string, string> = {
  partner_sales: "Satış",
  partner_operations_design: "Operasyon ve tasarım",
  photographer: "Fotoğrafçı",
  print_vendor: "Baskıcı",
  organization_owner: "Organizasyon sahibi",
};
const newPassword = () =>
  `Sh!${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}9a`;

export default function AccountsPage() {
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<"create" | "reset" | null>(null);
  const [target, setTarget] = useState<Managed | null>(null);
  const [password, setPassword] = useState(newPassword);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const accounts = useQuery({
    queryKey: ["managed-accounts"],
    queryFn: () => api<Managed[]>("/admin/accounts"),
    enabled: !!me.data && me.data.role !== "owner",
  });
  const partners = useQuery({
    queryKey: ["partners"],
    queryFn: () => api<Partner[]>("/admin/partners"),
    enabled: me.data?.role === "platform",
  });

  async function update(account: Managed, patch: object) {
    setError("");
    try {
      await api(`/admin/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await qc.invalidateQueries({ queryKey: ["managed-accounts"] });
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = Object.fromEntries(new FormData(event.currentTarget));
      await api("/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ ...form, password }),
      });
      setDrawer(null);
      await qc.invalidateQueries({ queryKey: ["managed-accounts"] });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reset(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/accounts/${target.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setDrawer(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function preview(account: Managed) {
    try {
      await api(`/admin/accounts/${account.id}/preview`, { method: "POST" });
      qc.clear();
      window.location.assign("/admin");
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">ERİŞİM YÖNETİMİ</p>
          <h1>Yetkili hesaplar</h1>
          <p className="admin-subtitle">
            Hesapları, görevleri ve geçici parolaları yönetin.
          </p>
        </div>
        {me.data?.role !== "owner" ? (
          <button
            className="admin-button primary"
            onClick={() => {
              setPassword(newPassword());
              setDrawer("create");
            }}
          >
            <Plus size={16} /> Yeni yetkili
          </button>
        ) : null}
      </div>
      {error ? <Notice>{error}</Notice> : null}
      {me.data?.role === "owner" ? (
        <Notice>Bu alan yönetici hesaplarına açıktır.</Notice>
      ) : (
        <div className="account-access-list">
          {accounts.data?.map((account) => (
            <article key={account.id}>
              <div>
                <strong>{account.display_name}</strong>
                <span>
                  {account.email} ·{" "}
                  {account.role === "owner"
                    ? "Organizasyon sahibi"
                    : labels[account.staff_role || ""] || "Yetkili"}
                </span>
              </div>
              <div className="account-actions">
                {me.data?.role === "platform" ? (
                  <button
                    className="admin-button"
                    onClick={() => void preview(account)}
                  >
                    <Eye size={14} /> Salt okunur görünüm
                  </button>
                ) : null}
                <button
                  className="admin-button"
                  onClick={() => {
                    setTarget(account);
                    setPassword(newPassword());
                    setDrawer("reset");
                  }}
                >
                  <KeyRound size={14} /> Parola
                </button>
                <button
                  className="admin-button"
                  onClick={() =>
                    void update(account, { disabled: !account.disabled })
                  }
                >
                  {account.disabled ? "Erişimi aç" : "Erişimi kapat"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {drawer ? (
        <div className="admin-drawer-layer">
          <button
            className="admin-drawer-backdrop"
            aria-label="Kapat"
            onClick={() => setDrawer(null)}
          />
          <aside className="admin-drawer" role="dialog" aria-modal="true">
            <header>
              <div>
                <span>ERİŞİM</span>
                <h2>
                  {drawer === "create"
                    ? "Yeni yetkili hesabı"
                    : `${target?.display_name} parolası`}
                </h2>
              </div>
              <button onClick={() => setDrawer(null)} aria-label="Kapat">
                <X size={20} />
              </button>
            </header>
            {drawer === "create" ? (
              <form className="partner-create-form" onSubmit={create}>
                <Field name="display_name" label="Ad soyad" required />
                <Field name="username" type="email" label="E-posta" required />
                {me.data?.role === "platform" ? (
                  <label className="form-field">
                    <span>İşletme</span>
                    <SelectField name="partner_id" required>
                      {partners.data
                        ?.filter((item) => item.active)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </SelectField>
                  </label>
                ) : null}
                <label className="form-field">
                  <span>Görev</span>
                  <SelectField name="staff_role" defaultValue="partner_sales">
                    <option value="partner_sales">Satış</option>
                    <option value="partner_operations_design">
                      Operasyon ve tasarım
                    </option>
                    <option value="photographer">Fotoğrafçı</option>
                    <option value="print_vendor">Baskıcı</option>
                  </SelectField>
                </label>
                <PasswordField
                  label="Geçici parola"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  required
                />
                <p className="admin-hint">
                  Fotoğrafçı ve baskıcı albümü göremez; yalnızca atandıkları işi
                  yapar.
                </p>
                <footer>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => setDrawer(null)}
                  >
                    Vazgeç
                  </button>
                  <button className="admin-button primary" disabled={busy}>
                    {busy ? "Oluşturuluyor…" : "Hesabı oluştur"}
                  </button>
                </footer>
              </form>
            ) : (
              <form className="partner-create-form" onSubmit={reset}>
                <PasswordField
                  label="Yeni geçici parola"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  required
                />
                <footer>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => setDrawer(null)}
                  >
                    Vazgeç
                  </button>
                  <button className="admin-button primary" disabled={busy}>
                    Parolayı sıfırla
                  </button>
                </footer>
              </form>
            )}
          </aside>
        </div>
      ) : null}
    </AdminShell>
  );
}
