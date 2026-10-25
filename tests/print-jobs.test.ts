import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedPrintJobTransitions,
  canTransitionPrintJob,
} from "../src/lib/print-jobs";

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
