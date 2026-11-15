import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  integrationReadiness,
  verifyHmacSha256,
} from "../src/lib/integrations";

test("integration readiness never exposes secret values", () => {
  const rows = integrationReadiness({
    PAYMENT_PROVIDER: "approved-pos",
    PAYMENT_API_KEY: "secret-key",
    PAYMENT_WEBHOOK_SECRET: "hook-secret",
  });
  const payment = rows.find((row) => row.capability === "payment")!;
  assert.equal(payment.status, "ready");
  assert.equal(JSON.stringify(rows).includes("secret-key"), false);
  assert.equal(
    rows.find((row) => row.capability === "sms")?.status,
    "not_configured",
  );
});

test("webhook signatures use constant-length HMAC comparison", () => {
  const payload = JSON.stringify({ event: "payment.verified", id: "evt-1" });
  const signature = createHmac("sha256", "hook-secret")
    .update(payload)
    .digest("hex");
  assert.equal(
    verifyHmacSha256(payload, `sha256=${signature}`, "hook-secret"),
    true,
  );
  assert.equal(
    verifyHmacSha256(`${payload}x`, signature, "hook-secret"),
    false,
  );
  assert.equal(verifyHmacSha256(payload, "invalid", "hook-secret"), false);
});
