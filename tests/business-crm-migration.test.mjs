import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_CRM_INDEXES,
  classifyLegacyOwnerCandidates,
  duplicateLeadGroups,
} from "../scripts/business-crm-migration-lib.mjs";

test("a single legacy operational account becomes an explicit owner candidate", () => {
  const result = classifyLegacyOwnerCandidates([
    {
      id: "legacy-owner",
      role: "partner",
      partner_id: "studio",
      staff_role: "photographer",
      disabled: false,
    },
  ]);
  assert.deepEqual(result.eligible, [
    {
      user_id: "legacy-owner",
      partner_id: "studio",
      previous_staff_role: "photographer",
    },
  ]);
  assert.deepEqual(result.ambiguous, []);
});

test("multiple tenant accounts never receive automatic owner elevation", () => {
  const result = classifyLegacyOwnerCandidates([
    {
      id: "photographer",
      role: "partner",
      partner_id: "studio",
      staff_role: "photographer",
      disabled: false,
    },
    {
      id: "sales",
      role: "partner",
      partner_id: "studio",
      staff_role: "partner_sales",
      disabled: false,
    },
  ]);
  assert.equal(result.eligible.length, 0);
  assert.equal(result.ambiguous.length, 1);
  assert.equal(result.ambiguous[0].partner_id, "studio");
});

test("existing owners and disabled operational accounts are unchanged", () => {
  const result = classifyLegacyOwnerCandidates([
    {
      id: "owner",
      role: "partner",
      partner_id: "venue",
      staff_role: "partner_owner",
      disabled: false,
    },
    {
      id: "printer",
      role: "partner",
      partner_id: "venue",
      staff_role: "print_vendor",
      disabled: false,
    },
    {
      id: "disabled",
      role: "partner",
      partner_id: "print-shop",
      staff_role: "print_vendor",
      disabled: true,
    },
  ]);
  assert.deepEqual(result, { eligible: [], ambiguous: [] });
});

test("migration indexes use stable names and tenant-scoped idempotency", () => {
  const names = BUSINESS_CRM_INDEXES.map((index) => index.options.name);
  assert.equal(new Set(names).size, names.length);
  const idempotency = BUSINESS_CRM_INDEXES.find(
    (index) => index.options.name === "business_leads_partner_idempotency_uq",
  );
  assert.deepEqual(idempotency.keys, { partner_id: 1, idempotency_key: 1 });
  assert.equal(idempotency.options.unique, true);
  const taskIndex = BUSINESS_CRM_INDEXES.find(
    (index) => index.options.name === "crm_tasks_partner_lead_status_due",
  );
  assert.deepEqual(taskIndex.keys, {
    partner_id: 1,
    lead_id: 1,
    status: 1,
    due_at: 1,
  });
  const activityIndex = BUSINESS_CRM_INDEXES.find(
    (index) => index.options.name === "crm_activities_partner_lead_timeline",
  );
  assert.equal(activityIndex.keys.partner_id, 1);
  assert.equal(activityIndex.keys.lead_id, 1);
  const quoteVersion = BUSINESS_CRM_INDEXES.find(
    (index) => index.options.name === "crm_quotes_partner_lead_version_uq",
  );
  assert.deepEqual(quoteVersion.keys, {
    partner_id: 1,
    lead_id: 1,
    version: -1,
  });
  assert.equal(quoteVersion.options.unique, true);
  const customerIdentity = BUSINESS_CRM_INDEXES.find(
    (index) => index.options.name === "customer_accounts_partner_identity_uq",
  );
  assert.deepEqual(customerIdentity.keys, {
    partner_id: 1,
    identity_key: 1,
  });
  assert.equal(customerIdentity.options.unique, true);
  const conversion = BUSINESS_CRM_INDEXES.find(
    (index) => index.options.name === "crm_quote_conversions_quote_uq",
  );
  assert.deepEqual(conversion.keys, { quote_id: 1 });
  assert.equal(conversion.options.unique, true);
});

test("duplicate aggregation output is converted to a reviewable report", () => {
  assert.deepEqual(
    duplicateLeadGroups([
      {
        _id: { partner_id: "venue", idempotency_key: "request-1" },
        count: 2,
        ids: ["lead-1", "lead-2"],
      },
    ]),
    [
      {
        partner_id: "venue",
        idempotency_key: "request-1",
        count: 2,
        ids: ["lead-1", "lead-2"],
      },
    ],
  );
});
