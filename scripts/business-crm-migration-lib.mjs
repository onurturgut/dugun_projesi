export const BUSINESS_CRM_MIGRATION = "business-crm-v1";
export const BUSINESS_CRM_INDEXES = Object.freeze([
  {
    collection: "business_leads",
    keys: { id: 1 },
    options: { name: "business_leads_id_uq", unique: true },
  },
  {
    collection: "business_leads",
    keys: { partner_id: 1, idempotency_key: 1 },
    options: {
      name: "business_leads_partner_idempotency_uq",
      unique: true,
    },
  },
  {
    collection: "business_leads",
    keys: { partner_id: 1, status: 1, updated_at: -1 },
    options: { name: "business_leads_partner_status_updated" },
  },
  {
    collection: "business_leads",
    keys: { partner_id: 1, customer_phone: 1, created_at: -1 },
    options: { name: "business_leads_partner_phone_created" },
  },
  {
    collection: "business_catalog_items",
    keys: { partner_id: 1, active: 1, display_order: 1, updated_at: -1 },
    options: { name: "business_catalog_partner_active_order" },
  },
  {
    collection: "crm_activities",
    keys: { id: 1 },
    options: { name: "crm_activities_id_uq", unique: true },
  },
  {
    collection: "crm_activities",
    keys: { partner_id: 1, lead_id: 1, occurred_at: -1, created_at: -1 },
    options: { name: "crm_activities_partner_lead_timeline" },
  },
  {
    collection: "crm_tasks",
    keys: { id: 1 },
    options: { name: "crm_tasks_id_uq", unique: true },
  },
  {
    collection: "crm_tasks",
    keys: { partner_id: 1, lead_id: 1, status: 1, due_at: 1 },
    options: { name: "crm_tasks_partner_lead_status_due" },
  },
  {
    collection: "crm_tasks",
    keys: { partner_id: 1, assigned_to: 1, status: 1, due_at: 1 },
    options: { name: "crm_tasks_partner_assignee_status_due" },
  },
  {
    collection: "crm_quotes",
    keys: { id: 1 },
    options: { name: "crm_quotes_id_uq", unique: true },
  },
  {
    collection: "crm_quotes",
    keys: { partner_id: 1, lead_id: 1, version: -1 },
    options: { name: "crm_quotes_partner_lead_version_uq", unique: true },
  },
  {
    collection: "crm_quotes",
    keys: { partner_id: 1, status: 1, valid_until: 1 },
    options: { name: "crm_quotes_partner_status_validity" },
  },
  {
    collection: "customer_accounts",
    keys: { id: 1 },
    options: { name: "customer_accounts_id_uq", unique: true },
  },
  {
    collection: "customer_accounts",
    keys: { partner_id: 1, identity_key: 1 },
    options: { name: "customer_accounts_partner_identity_uq", unique: true },
  },
  {
    collection: "crm_quote_conversions",
    keys: { quote_id: 1 },
    options: { name: "crm_quote_conversions_quote_uq", unique: true },
  },
  {
    collection: "crm_quote_conversions",
    keys: { partner_id: 1, lead_id: 1, created_at: -1 },
    options: { name: "crm_quote_conversions_partner_lead_created" },
  },
  {
    collection: "partners",
    keys: { "storefront.slug": 1 },
    options: {
      name: "partners_storefront_slug_uq",
      unique: true,
      partialFilterExpression: { "storefront.slug": { $type: "string" } },
    },
  },
]);

const ownerRole = "partner_owner";
const legacyOperationalRoles = new Set(["photographer", "print_vendor"]);

export function classifyLegacyOwnerCandidates(users) {
  const byPartner = new Map();
  for (const user of users) {
    if (user.role !== "partner" || !user.partner_id || user.disabled === true)
      continue;
    const rows = byPartner.get(user.partner_id) || [];
    rows.push(user);
    byPartner.set(user.partner_id, rows);
  }

  const eligible = [];
  const ambiguous = [];
  for (const [partnerId, rows] of byPartner) {
    if (rows.some((row) => row.staff_role === ownerRole)) continue;
    const legacy = rows.filter((row) =>
      legacyOperationalRoles.has(row.staff_role),
    );
    if (rows.length === 1 && legacy.length === 1) {
      eligible.push({
        user_id: legacy[0].id,
        partner_id: partnerId,
        previous_staff_role: legacy[0].staff_role,
      });
      continue;
    }
    if (legacy.length) {
      ambiguous.push({
        partner_id: partnerId,
        active_partner_accounts: rows.length,
        legacy_operational_accounts: legacy.map((row) => ({
          user_id: row.id,
          staff_role: row.staff_role,
        })),
        reason:
          "Birden fazla aktif hesap bulundu; sahip hesabı insan onayı gerektiriyor.",
      });
    }
  }

  return { eligible, ambiguous };
}

export function duplicateLeadGroups(rows) {
  return rows.map((row) => ({
    partner_id: row._id.partner_id,
    idempotency_key: row._id.idempotency_key,
    count: row.count,
    ids: row.ids,
  }));
}
