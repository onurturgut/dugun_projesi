import type { SaleRecord, Wedding } from "./models";

export type CustomerCurrentEntry = {
  id: string;
  sale_id: string;
  wedding_id: string;
  occurred_at: string;
  type: "sale" | "payment" | "refund";
  description: string;
  debit_cents: number;
  credit_cents: number;
};

export type CustomerCurrentAccount = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  partner_id: string;
  total_sales_cents: number;
  total_paid_cents: number;
  total_refunded_cents: number;
  balance_cents: number;
  overdue_cents: number;
  due_at: string | null;
  last_activity_at: string;
  entries: CustomerCurrentEntry[];
};

export function buildCustomerCurrentAccounts(
  sales: SaleRecord[],
  weddings: Array<Pick<Wedding, "id" | "owner_id" | "customer_account_id" | "customer_name" | "customer_email" | "customer_phone" | "title">>,
) {
  const weddingById = new Map(weddings.map((item) => [item.id, item]));
  const accounts = new Map<string, CustomerCurrentAccount>();
  for (const sale of sales) {
    if (sale.status === "cancelled") continue;
    const wedding = weddingById.get(sale.wedding_id);
    if (!wedding) continue;
    const identity = wedding.customer_account_id || wedding.customer_email?.trim().toLowerCase() || wedding.owner_id || wedding.id;
    const id = `${sale.partner_id}:${identity}`;
    const account = accounts.get(id) || {
      id,
      customer_name: wedding.customer_name || wedding.title,
      customer_email: wedding.customer_email || "",
      customer_phone: wedding.customer_phone || "",
      partner_id: sale.partner_id,
      total_sales_cents: 0,
      total_paid_cents: 0,
      total_refunded_cents: 0,
      balance_cents: 0,
      overdue_cents: 0,
      due_at: sale.due_at || null,
      last_activity_at: sale.occurred_at,
      entries: [],
    };
    account.total_sales_cents += sale.gross_cents;
    account.entries.push({ id: `${sale.id}:sale`, sale_id: sale.id, wedding_id: sale.wedding_id, occurred_at: sale.occurred_at, type: "sale", description: `${wedding.title} satış kaydı`, debit_cents: sale.gross_cents, credit_cents: 0 });
    const paidCents = sale.paid_cents ?? ((sale.status === "paid" || sale.status === "refunded") ? sale.gross_cents : 0);
    if (paidCents) {
      account.total_paid_cents += paidCents;
      account.entries.push({ id: `${sale.id}:payment`, sale_id: sale.id, wedding_id: sale.wedding_id, occurred_at: sale.paid_at || sale.occurred_at, type: "payment", description: sale.payment_status === "partial" ? "Kısmi tahsilat / kapora" : "Doğrulanmış tahsilat", debit_cents: 0, credit_cents: paidCents });
    }
    if (sale.status === "refunded") {
      account.total_refunded_cents += sale.gross_cents;
      account.entries.push({ id: `${sale.id}:refund`, sale_id: sale.id, wedding_id: sale.wedding_id, occurred_at: sale.refunded_at || sale.occurred_at, type: "refund", description: "Satış iadesi", debit_cents: sale.gross_cents, credit_cents: sale.gross_cents });
    }
    account.balance_cents = account.total_sales_cents - account.total_paid_cents;
    if (sale.due_at && Date.parse(sale.due_at) < Date.now() && account.balance_cents > 0) account.overdue_cents = account.balance_cents;
    account.last_activity_at = [account.last_activity_at, sale.refunded_at, sale.paid_at, sale.occurred_at].filter(Boolean).sort().at(-1)!;
    accounts.set(id, account);
  }
  return [...accounts.values()].map((account) => ({ ...account, entries: account.entries.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)) })).sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
}
