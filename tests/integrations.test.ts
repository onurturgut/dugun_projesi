import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  integrationReadiness,
  registeredProviderRegistry,
  verifyHmacSha256,
} from "../src/lib/integrations";
import {
  readUtf8BodyLimited,
  RequestBodyTooLargeError,
} from "../src/lib/request-body";

test("integration readiness never exposes secret values", () => {
  const env = {
    PAYMENT_PROVIDER: "approved-pos",
    PAYMENT_API_KEY: "secret-key",
    PAYMENT_WEBHOOK_SECRET: "hook-secret",
  };
  const rows = integrationReadiness(env, { payment: ["approved-pos"] });
  const payment = rows.find((row) => row.capability === "payment")!;
  assert.equal(payment.status, "ready");
  assert.equal(JSON.stringify(rows).includes("secret-key"), false);
  assert.equal(
    rows.find((row) => row.capability === "sms")?.status,
    "not_configured",
  );
  assert.equal(
    integrationReadiness(env).find((row) => row.capability === "payment")?.status,
    "adapter_unavailable",
  );
});

test("payment and banking readiness require matching outbound and webhook adapters", () => {
  assert.deepEqual(
    registeredProviderRegistry(
      [
        { capability: "payment", provider: "approved-pos" },
        { capability: "email", provider: "approved-mail" },
      ],
      [{ capability: "payment", provider: "different-pos" }],
    ),
    { email: ["approved-mail"] },
  );
  assert.deepEqual(
    registeredProviderRegistry(
      [{ capability: "payment", provider: "approved-pos" }],
      [{ capability: "payment", provider: "approved-pos" }],
    ),
    { payment: ["approved-pos"] },
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

test("webhook request reader enforces actual streamed bytes without content-length", async () => {
  const small = new Request("https://example.test/webhook", {
    method: "POST",
    body: "şirket=ShineQR",
  });
  assert.equal(await readUtf8BodyLimited(small, 64), "şirket=ShineQR");
  const oversized = new Request("https://example.test/webhook", {
    method: "POST",
    body: "12345678901",
  });
  await assert.rejects(
    () => readUtf8BodyLimited(oversized, 10),
    RequestBodyTooLargeError,
  );
});
