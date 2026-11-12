import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ORGANIZATION_DEPOSIT_RATE_BPS,
  organizationDepositCents,
  organizationSellerPartnerId,
} from "../src/lib/organization-sales";

test("partner organization sale is always attributed to the signed-in tenant", () => {
  assert.equal(
    organizationSellerPartnerId(
      { role: "partner", partner_id: "partner-a" },
      "partner-b",
    ),
    "partner-a",
  );
});

test("platform can explicitly attribute an organization sale", () => {
  assert.equal(
    organizationSellerPartnerId(
      { role: "platform", partner_id: null },
      "partner-b",
    ),
    "partner-b",
  );
});

test("deferred organization deposit is twenty percent in integer cents", () => {
  assert.equal(ORGANIZATION_DEPOSIT_RATE_BPS, 2_000);
  assert.equal(organizationDepositCents(2_700_001), 540_000);
});
