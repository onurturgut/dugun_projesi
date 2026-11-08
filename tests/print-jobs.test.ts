import { test } from "node:test";
import assert from "node:assert/strict";
import {
  approvedPrintSource,
  allowedPrintJobTransitions,
  canTransitionPrintJob,
} from "../src/lib/print-jobs";
import type { Wedding } from "../src/lib/models";

test("customer-approved design request becomes the print source", () => {
  const event = {
    design_request: {
      surfaces: {
        qr: {
          status: "completed",
          format: "landscape-mini-100x75-duplex",
          delivery: { version: 3 },
        },
      },
    },
  } as unknown as Wedding;
  assert.deepEqual(approvedPrintSource(event), {
    source: "design_request",
    productId: "landscape-mini-100x75-duplex",
    revision: 3,
  });
});

test("unapproved or invalid design request cannot become a print source", () => {
  const event = {
    design_request: {
      surfaces: { qr: { status: "awaiting_approval", format: "invalid" } },
    },
  } as unknown as Wedding;
  assert.equal(approvedPrintSource(event), null);
});

test("printer can only advance its production stages", () => {
  assert.deepEqual(allowedPrintJobTransitions("assigned", "printer"), [
    "downloaded",
  ]);
  assert.equal(
    canTransitionPrintJob("downloaded", "printing", "printer"),
    true,
  );
  assert.equal(
    canTransitionPrintJob("ready", "received_by_shineqr", "printer"),
    false,
  );
  assert.equal(
    canTransitionPrintJob("printing", "delivered_to_partner", "printer"),
    false,
  );
});

test("platform follows the ordered fulfillment workflow", () => {
  assert.equal(
    canTransitionPrintJob("ready", "received_by_shineqr", "platform"),
    true,
  );
  assert.equal(
    canTransitionPrintJob("received_by_shineqr", "quality_checked", "platform"),
    true,
  );
  assert.equal(
    canTransitionPrintJob("assigned", "quality_checked", "platform"),
    false,
  );
  assert.deepEqual(
    allowedPrintJobTransitions("delivered_to_partner", "platform"),
    [],
  );
});
