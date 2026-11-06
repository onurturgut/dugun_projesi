import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import manifest from "../src/app/manifest";

test("PWA manifest exposes installable identity and maskable icons", () => {
  const value = manifest();
  assert.equal(value.display, "standalone");
  assert.equal(value.scope, "/");
  assert.match(String(value.start_url), /^\//);
  assert.ok(value.icons?.some((icon) => icon.sizes === "192x192"));
  assert.ok(value.icons?.some((icon) => icon.sizes === "512x512"));
  assert.ok(value.icons?.some((icon) => icon.purpose === "maskable"));
});

test("service worker never caches private or financial surfaces", () => {
  const worker = readFileSync("public/sw.js", "utf8");
  for (const route of ["/api/", "/admin", "/account", "/auth", "/wedding/"])
    assert.match(worker, new RegExp(route.replaceAll("/", "\\/")));
  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /PRIVATE_PREFIXES\.some/);
  assert.match(worker, /caches\.match\(OFFLINE_URL\)/);
});
