import "../scripts/configure-dns.mjs";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import { MongoClient } from "mongodb";
import { PDFDocument } from "pdf-lib";
import { once } from "node:events";
import dns from "node:dns";
async function directMongoUri(uri) {
  if (!uri.startsWith("mongodb+srv://")) return uri;
  const parsed = new URL(uri);
  const records = await dns.promises.resolveSrv(
    `_mongodb._tcp.${parsed.hostname}`,
  );
  const txt = (await dns.promises.resolveTxt(parsed.hostname)).flat().join("");
  const options = new URLSearchParams(txt);
  for (const [key, value] of parsed.searchParams) options.set(key, value);
  options.set("tls", "true");
  const auth = `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`;
  return `mongodb://${auth}${records.map((record) => `${record.name}:${record.port}`).join(",")}${parsed.pathname}?${options}`;
}
const dbName = `test_platform_${Date.now()}`;
const mongoUri = await directMongoUri(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
);
const mongo = new MongoClient(mongoUri);
const port = Number(process.env.TEST_PORT || 3100),
  base = `http://localhost:${port}`;
const objects = new Map();
let next;
let output = "";
const s3 = createServer(async (req, res) => {
  try {
    const key = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (req.method === "PUT") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      objects.set(key, {
        body: Buffer.concat(chunks),
        type: req.headers["content-type"],
      });
      res.writeHead(200, { ETag: '"test"' });
      res.end();
      return;
    }
    if (req.method === "DELETE") {
      objects.delete(key);
      res.writeHead(204);
      res.end();
      return;
    }
    const object = objects.get(key);
    if (!object) {
      res.writeHead(404, { "content-type": "application/xml" });
      res.end("<Error><Code>NoSuchKey</Code></Error>");
      return;
    }
    let body = object.body,
      status = 200;
    const headers = {
      "content-type": object.type,
      ETag: '"test"',
      "accept-ranges": "bytes",
    };
    if (req.headers.range) {
      const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range);
      const start = Number(match[1]),
        end = match[2] ? Number(match[2]) : body.length - 1;
      headers["content-range"] = `bytes ${start}-${end}/${body.length}`;
      body = body.subarray(start, end + 1);
      status = 206;
    }
    res.writeHead(status, { ...headers, "content-length": body.length });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(500);
    res.end();
  }
});
const initial = "Temporary-test-password-123!",
  changed = "Changed-test-password-456!";
async function call(path, method = "GET", body, cookie, status = 200) {
  const r = await fetch(base + "/api" + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  return { data, cookie: r.headers.get("set-cookie")?.split(";")[0] };
}
async function login(email, password = initial) {
  return (await call("/auth/login", "POST", { email, password })).cookie;
}
async function activate(email) {
  const cookie = await login(email);
  await call("/admin/weddings", "GET", undefined, cookie, 403);
  await call(
    "/auth/password",
    "POST",
    { current_password: initial, password: changed },
    cookie,
  );
  return cookie;
}
try {
  await mongo.connect();
  const db = mongo.db(dbName);
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db
      .collection("users")
      .createIndex(
        { owner_event_id: 1 },
        { unique: true, partialFilterExpression: { role: "owner" } },
      ),
    db.collection("weddings").createIndex({ slug: 1 }, { unique: true }),
    db.collection("media").createIndex({ storage_path: 1 }, { unique: true }),
    db.collection("print_jobs").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("photographer_sales")
      .createIndex({ idempotency_key: 1 }, { unique: true }),
    db
      .collection("photographer_sales")
      .createIndex(
        { wedding_id: 1 },
        { unique: true, partialFilterExpression: { status: "paid" } },
      ),
    db.collection("photographer_sales").createIndex(
      { wedding_id: 1, status: 1 },
      {
        unique: true,
        partialFilterExpression: { status: "pending_customer_consent" },
      },
    ),
    db
      .collection("service_payout_ledger")
      .createIndex(
        { sale_id: 1, beneficiary_type: 1, type: 1 },
        { unique: true },
      ),
    db.collection("service_payout_ledger").createIndex(
      { payment_reference: 1 },
      {
        unique: true,
        partialFilterExpression: { payment_reference: { $type: "string" } },
      },
    ),
    db.collection("organization_participants").createIndex(
      { wedding_id: 1, participant_role: 1 },
      {
        unique: true,
        partialFilterExpression: {
          participant_role: "photographer",
          active: true,
        },
      },
    ),
  ]);
  const salt = randomBytes(16).toString("hex");
  await db.collection("users").insertOne({
    id: randomUUID(),
    email: "platform-test",
    salt,
    passwordHash: scryptSync(initial, salt, 64).toString("hex"),
    role: "platform",
    partner_id: null,
    display_name: "Test Platform",
    disabled: false,
    must_change_password: false,
  });
  await db.collection("users").insertOne({
    id: randomUUID(),
    email: "finance-test",
    salt,
    passwordHash: scryptSync(initial, salt, 64).toString("hex"),
    role: "platform",
    staff_role: "finance_manager",
    partner_id: null,
    display_name: "Test Finans",
    disabled: false,
    must_change_password: false,
  });
  await db.collection("partners").insertOne({
    id: "platform",
    name: "Platform",
    active: true,
    logo_url: "",
    created_at: new Date().toISOString(),
  });
  s3.listen(0, "127.0.0.1");
  await once(s3, "listening");
  const secret = randomBytes(32).toString("hex");
  next = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--port",
      String(port),
    ],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
        MONGODB_URI: mongoUri,
        MONGODB_DB: dbName,
        NEXT_DIST_DIR: ".next-test",
        R2_ACCOUNT_ID: "test",
        R2_ACCESS_KEY_ID: "test",
        R2_SECRET_ACCESS_KEY: "test",
        R2_BUCKET_NAME: "test-media",
        R2_TEST_ENDPOINT: `http://127.0.0.1:${s3.address().port}`,
        CRON_SECRET: secret,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const pipe of [next.stdout, next.stderr])
    pipe.on("data", (chunk) => {
      output = (output + chunk.toString()).slice(-12000);
    });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base + "/auth")).ok) {
        ready = true;
        break;
      }
    } catch {}
    if (next.exitCode !== null) throw new Error(output);
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, "Test server did not start");
  console.log(`Test server ready: ${base}`);
  // Allow the browser verification to inspect the running server as well.
  await new Promise((r) => setTimeout(r, 15000));
  const platform = await login("platform-test");
  const finance = await login("finance-test");
  const partnerA = (
    await call(
      "/admin/partners",
      "POST",
      {
        name: "A İşletmesi",
        display_name: "A Yetkili",
        username: "partner-a@example.com",
        phone: "05320000001",
        address: "Fethiye, Muğla",
        password: initial,
      },
      platform,
      201,
    )
  ).data.id;
  const partnerB = (
    await call(
      "/admin/partners",
      "POST",
      {
        name: "B İşletmesi",
        display_name: "B Yetkili",
        username: "partner-b@example.com",
        phone: "05320000002",
        address: "Fethiye, Muğla",
        password: initial,
      },
      platform,
      201,
    )
  ).data.id;
  const printerId = randomUUID();
  const otherPrinterId = randomUUID();
  const printerSalt = randomBytes(16).toString("hex");
  await db.collection("users").insertMany([
    {
      id: printerId,
      email: "printer@example.com",
      salt: printerSalt,
      passwordHash: scryptSync(changed, printerSalt, 64).toString("hex"),
      role: "partner",
      staff_role: "print_vendor",
      partner_id: partnerB,
      display_name: "Test Baskıcı",
      disabled: false,
      must_change_password: false,
    },
    {
      id: otherPrinterId,
      email: "other-printer@example.com",
      salt: printerSalt,
      passwordHash: scryptSync(changed, printerSalt, 64).toString("hex"),
      role: "partner",
      staff_role: "print_vendor",
      partner_id: partnerA,
      display_name: "Diğer Baskıcı",
      disabled: false,
      must_change_password: false,
    },
  ]);
  const printerCookie = await login("printer@example.com", changed);
  const otherPrinterCookie = await login("other-printer@example.com", changed);
  await call(
    `/admin/partners/${partnerA}`,
    "PATCH",
    {
      phone: "05320000003",
      address: "Fethiye, Muğla",
      business_types: ["venue", "planner"],
    },
    platform,
  );
  const updatedPartner = (
    await call(`/admin/partners/${partnerA}`, "GET", undefined, platform)
  ).data.partner;
  assert.equal(updatedPartner.phone, "05320000003");
  assert.equal(updatedPartner.address, "Fethiye, Muğla");
  assert.deepEqual(updatedPartner.business_types, ["venue", "planner"]);
  const logoForm = new FormData();
  const logoBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  logoForm.append(
    "file",
    new Blob([logoBytes], { type: "image/png" }),
    "logo.png",
  );
  logoForm.append("partner_id", partnerA);
  const logoUpload = await fetch(base + "/api/admin/covers", {
    method: "POST",
    headers: { cookie: platform },
    body: logoForm,
  });
  assert.equal(logoUpload.status, 201);
  const logoUrl = (await logoUpload.json()).url;
  await call(
    "/admin/partners/" + partnerA,
    "PATCH",
    { logo_url: logoUrl },
    platform,
  );
  assert.equal(
    (await call("/admin/partners", "GET", undefined, platform)).data.find(
      (partner) => partner.id === partnerA,
    ).logo_url,
    logoUrl,
  );
  assert.equal((await fetch(base + logoUrl)).status, 200);
  const publicPartners = (await call("/partners")).data;
  assert.deepEqual(publicPartners, [
    { id: partnerA, name: "A İşletmesi", logo_url: logoUrl },
  ]);
  assert.equal("phone" in publicPartners[0], false);
  assert.equal("address" in publicPartners[0], false);
  const temporaryPartner = await db
    .collection("users")
    .findOne({ email: "partner-a@example.com" });
  const temporaryCookie = await login("partner-a@example.com");
  await call("/auth/preferences", "PATCH", { theme: "dark" }, temporaryCookie);
  await call("/admin/weddings", "GET", undefined, temporaryCookie, 403);
  const previewCookie = (
    await call(
      `/admin/accounts/${temporaryPartner.id}/preview`,
      "POST",
      undefined,
      platform,
    )
  ).cookie;
  const previewSession = `${platform}; ${previewCookie}`;
  assert.equal(
    (await call("/auth/me", "GET", undefined, previewSession)).data
      .must_change_password,
    true,
  );
  await call("/admin/weddings", "GET", undefined, previewSession);
  await call(
    "/auth/preferences",
    "PATCH",
    { theme: "dark" },
    previewSession,
    403,
  );
  await call("/auth/preview-stop", "POST", undefined, previewSession);
  const previewStopAudit = await db
    .collection("audit_logs")
    .findOne({ action: "account.preview_stopped" });
  assert.equal(previewStopAudit.actor_role, "platform");
  assert.equal(previewStopAudit.target.target_user_id, temporaryPartner.id);
  const a = await activate("partner-a@example.com"),
    b = await activate("partner-b@example.com");
  await call("/admin/partners", "GET", undefined, a, 403);
  const agentRunId = randomUUID();
  const agentReportInput = {
    run_id: agentRunId,
    agent_name: "code-reviewer",
    task_title: "Entegrasyon raporu",
    status: "needs-review",
    scope: ["tests/integration.mjs"],
    findings: [
      {
        severity: "info",
        title: "Kontrol tamamlandı",
        evidence: "API sözleşmesi doğrulandı.",
      },
    ],
    verification: [
      { check: "integration", result: "passed", evidence: "Test ortamı" },
    ],
    risks: ["İnsan incelemesi gerekli."],
    recommendation: "approve",
    handoff: { role: "human-owner", action: "Raporu inceleyin." },
    change_ref: "stage-12",
  };
  await call("/admin/agent-reports", "POST", agentReportInput, a, 403);
  const agentReport = (
    await call("/admin/agent-reports", "POST", agentReportInput, platform, 201)
  ).data;
  assert.equal(agentReport.review_status, "pending");
  assert.equal(
    (
      await call(
        "/admin/agent-reports",
        "POST",
        { ...agentReportInput, task_title: "Tekrarlanan istek" },
        platform,
      )
    ).data.id,
    agentReport.id,
  );
  assert.equal(
    await db
      .collection("agent_reports")
      .countDocuments({ run_id: agentRunId, agent_name: "code-reviewer" }),
    1,
  );
  const reportListing = (
    await call(
      `/admin/agent-reports?agent_name=code-reviewer&search=stage-12`,
      "GET",
      undefined,
      platform,
    )
  ).data;
  assert.equal(reportListing.total, 1);
  assert.equal(reportListing.summary.pending, 1);
  await call(
    `/admin/agent-reports/${agentReport.id}`,
    "GET",
    undefined,
    a,
    403,
  );
  const reviewedReport = (
    await call(
      `/admin/agent-reports/${agentReport.id}/review`,
      "POST",
      { decision: "approved", note: "İnsan incelemesi tamamlandı." },
      platform,
    )
  ).data;
  assert.equal(reviewedReport.review_status, "approved");
  assert.equal(reviewedReport.reviews.length, 1);
  assert.equal(
    (await db.collection("agent_reports").findOne({ id: agentReport.id }))
      .task_title,
    "Entegrasyon raporu",
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const input = (slug) => ({
    slug,
    title: slug,
    event_type: "Düğün",
    bride_name: "Gelin",
    groom_name: "Damat",
    wedding_date: today,
    cover_images: ["/covers/couple-1.jpg"],
    hero_message: "Hoş geldiniz",
    thank_you_message: "Teşekkürler",
  });
  async function approvedEvent(
    slug,
    partnerCookie,
    ownerEmail,
    packageCode = "plan-2",
  ) {
    const draft = (
      await call(
        "/admin/weddings/draft",
        "POST",
        {
          ...input(slug),
          wizard_step: 7,
          customer_name: `${slug} müşterisi`,
          customer_email: ownerEmail,
          package_code: packageCode,
        },
        partnerCookie,
        201,
      )
    ).data;
    await call(
      `/admin/weddings/${draft.id}/publish`,
      "POST",
      { password: initial },
      partnerCookie,
      202,
    );
    assert.equal(
      (await db.collection("weddings").findOne({ id: draft.id }))
        .approval_status,
      "submitted",
    );
    await call(
      "/admin/weddings/draft",
      "POST",
      { id: draft.id, title: "Onay beklerken değişmez" },
      partnerCookie,
      409,
    );
    await call(
      `/admin/weddings/${draft.id}/approve`,
      "POST",
      undefined,
      platform,
    );
    return (
      await call(`/admin/weddings/${draft.id}`, "GET", undefined, platform)
    ).data;
  }
  await call(
    "/admin/weddings",
    "POST",
    { ...input("legacy-bypass"), partner_id: partnerB },
    a,
    403,
  );
  const eventA = await approvedEvent("event-a", a, "owner-a");
  assert.equal(
    eventA.partner_id,
    partnerA,
    "Partner must not choose another tenant",
  );
  const eventB = await approvedEvent("event-b", b, "owner-b");
  const eventA2 = await approvedEvent("event-a-2", a, "owner-a2", "plan-1");
  const premiumInvitationEvent = await approvedEvent(
    "premium-invitation",
    a,
    "owner-premium",
    "plan-3",
  );
  await call(
    `/admin/weddings/${eventA.id}/digital-invitation`,
    "PUT",
    {
      event_date: today,
      event_time: "19:30",
      venue: "Test Davet Alanı",
      map_url: "https://maps.example.com/test",
      message: "Davetlisiniz.",
    },
    platform,
    403,
  );
  const invitationDraft = (
    await call(
      `/admin/weddings/${premiumInvitationEvent.id}/digital-invitation`,
      "PUT",
      {
        event_date: today,
        event_time: "19:30",
        venue: "Test Davet Alanı",
        map_url: "https://maps.example.com/test",
        message: "Davetlisiniz.",
      },
      platform,
    )
  ).data;
  assert.equal(invitationDraft.status, "draft");
  assert.equal(invitationDraft.template_version, 1);
  const publishedInvitation = (
    await call(
      `/admin/weddings/${premiumInvitationEvent.id}/digital-invitation/publish`,
      "POST",
      {},
      platform,
    )
  ).data;
  assert.equal(publishedInvitation.status, "published");
  assert.equal(
    (
      await call(
        `/weddings/slug/${premiumInvitationEvent.slug}`,
        "GET",
      )
    ).data.digital_invitation.status,
    "published",
  );
  await db
    .collection("weddings")
    .updateOne(
      { id: premiumInvitationEvent.id },
      { $unset: { package_snapshot: "" } },
    );
  await call(
    `/admin/weddings/${premiumInvitationEvent.id}/digital-invitation`,
    "GET",
    undefined,
    platform,
    403,
  );
  assert.equal(
    "digital_invitation" in
      (
        await call(
          `/weddings/slug/${premiumInvitationEvent.slug}`,
          "GET",
        )
      ).data,
    false,
  );
  const recordedSale = (
    await call(
      "/admin/sales",
      "POST",
      {
        wedding_id: eventA.id,
        idempotency_key: `integration-${eventA.id}`,
        vat_rate_bps: 2000,
      },
      platform,
      201,
    )
  ).data;
  assert.equal(recordedSale.net_cents, 416_667);
  assert.equal(recordedSale.gross_cents, 500_000);
  assert.equal(recordedSale.commission_cents, 125_000);
  assert.equal(recordedSale.qualifying_ordinal, 1);
  assert.equal(
    (
      await call(
        "/admin/sales",
        "POST",
        {
          wedding_id: eventA.id,
          idempotency_key: `integration-${eventA.id}`,
          vat_rate_bps: 2000,
        },
        platform,
      )
    ).data.id,
    recordedSale.id,
    "idempotent sale must return the original record",
  );
  assert.equal(
    (await call("/admin/sales", "GET", undefined, a)).data.items.length,
    1,
  );
  await call(
    `/admin/weddings/${eventA.id}/storage-limit`,
    "PATCH",
    { additional_gib: 5 },
    a,
    403,
  );
  const capacity = (
    await call(
      `/admin/weddings/${eventA.id}/storage-limit`,
      "PATCH",
      { additional_gib: 5 },
      platform,
    )
  ).data;
  assert.equal(capacity.effective_limit_bytes, 55 * 1024 ** 3);
  assert.equal(
    (await db.collection("weddings").findOne({ id: eventA.id }))
      .storage_limit_override_bytes,
    55 * 1024 ** 3,
  );
  await call(
    `/admin/weddings/${eventA.id}/storage-limit`,
    "PATCH",
    { additional_gib: 0 },
    platform,
  );
  assert.equal(
    (await db.collection("weddings").findOne({ id: eventA.id }))
      .storage_limit_override_bytes,
    undefined,
  );
  await call(
    "/admin/sales",
    "POST",
    {
      wedding_id: eventA.id,
      idempotency_key: `partner-cannot-${eventA.id}`,
      vat_rate_bps: 2000,
    },
    a,
    403,
  );
  const draft = (
    await call(
      "/admin/weddings/draft",
      "POST",
      {
        title: "Güvenli taslak",
        wizard_step: 6,
        customer_name: "Taslak Müşteri",
        customer_email: "draft-owner@example.com",
        password: "taslakta-asla-kalmamali",
      },
      a,
      201,
    )
  ).data;
  const storedDraft = await db.collection("weddings").findOne({ id: draft.id });
  assert.equal(storedDraft.lifecycle_status, "draft");
  assert.equal("password" in storedDraft, false);
  await call(
    "/admin/weddings/draft",
    "POST",
    { id: draft.id, wizard_step: 7 },
    b,
    404,
  );
  await call("/admin/operations", "GET", undefined, a, 403);
  await call(`/admin/weddings/${eventB.id}`, "GET", undefined, a, 404);
  await call(
    `/admin/weddings/${eventB.id}`,
    "PATCH",
    { title: "Hijack" },
    a,
    404,
  );
  await call(
    `/admin/weddings/${eventA.id}`,
    "PATCH",
    { upload_days: 20 },
    a,
    403,
  );
  await call(
    `/admin/weddings/${eventA.id}/owner`,
    "POST",
    { username: "owner-a2", display_name: "Duplicate", password: initial },
    platform,
    409,
  );
  let owner = await activate("owner-a");
  await call("/admin/partner-overview", "GET", undefined, owner, 403);
  await call("/admin/accounts", "GET", undefined, owner, 403);
  const design = {
    version: 2,
    theme: "ivory",
    intro: "curtain",
    speed: 1.5,
    cardTemplate: "floral",
    linked: true,
    cardTheme: "burgundy",
    customColors: false,
    primary: "#42090F",
    accent: "#E6C38B",
    names: "İpek & Özgür",
    monogram: "İ · Ö",
    message: "Birlikte nice anılara.",
  };
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    design,
    undefined,
    401,
  );
  await call(`/admin/weddings/${eventB.id}/design`, "PUT", design, owner, 404);
  await call(`/admin/weddings/${eventA2.id}/design`, "PUT", design, owner, 404);
  await call(`/admin/weddings/${eventB.id}/design`, "PUT", design, a, 404);
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, partner_id: partnerB },
    owner,
    400,
  );
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, speed: 0 },
    owner,
    400,
  );
  await call(`/admin/weddings/${eventA.id}/design`, "PUT", design, owner);
  assert.equal(
    await db
      .collection("design_snapshots")
      .countDocuments({ wedding_id: eventA.id }),
    1,
  );
  const savedDesign = (
    await call(`/admin/weddings/${eventA.id}`, "GET", undefined, owner)
  ).data.design;
  const publicDesign = (await call("/weddings/slug/event-a")).data.design;
  for (const [key, value] of Object.entries(design)) {
    assert.deepEqual(savedDesign[key], value);
    assert.deepEqual(publicDesign[key], value);
  }
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, theme: "emerald" },
    a,
  );
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, theme: "navy" },
    platform,
  );
  assert.equal(
    (await call("/weddings/slug/event-a")).data.design.theme,
    "navy",
  );
  await call(
    `/admin/weddings/${eventA.id}/design/approve`,
    "POST",
    undefined,
    owner,
  );
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, theme: "emerald" },
    owner,
    409,
  );
  let revision = (
    await call(
      `/admin/weddings/${eventA.id}/design/request-revision`,
      "POST",
      { reason: "Renk paleti değiştirilsin." },
      owner,
    )
  ).data;
  assert.equal(revision.design_revisions_used, 1);
  assert.equal(revision.design_revision_limit, null);
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, theme: "emerald" },
    owner,
  );
  await call(
    `/admin/weddings/${eventA.id}/design/approve`,
    "POST",
    undefined,
    owner,
  );
  revision = (
    await call(
      `/admin/weddings/${eventA.id}/design/request-revision`,
      "POST",
      { reason: "Son tipografi düzenlemesi yapılsın." },
      owner,
    )
  ).data;
  assert.equal(revision.design_revisions_used, 2);
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, theme: "burgundy" },
    owner,
  );
  await call(
    `/admin/weddings/${eventA.id}/design/approve`,
    "POST",
    undefined,
    owner,
  );
  revision = (
    await call(
      `/admin/weddings/${eventA.id}/design/request-revision`,
      "POST",
      { reason: "Üçüncü tasarım güncellemesi yapılsın." },
      owner,
    )
  ).data;
  assert.equal(revision.design_revisions_used, 3);
  assert.equal(revision.design_revision_limit, null);
  await call(
    `/admin/weddings/${eventA.id}/design`,
    "PUT",
    { ...design, theme: "ivory" },
    owner,
  );
  await call(
    `/admin/weddings/${eventA.id}/design/approve`,
    "POST",
    undefined,
    owner,
  );
  const revisionEvent = (
    await call(`/admin/weddings/${eventA.id}`, "GET", undefined, owner)
  ).data;
  assert.equal(revisionEvent.design_status, "approved_for_print");
  assert.equal(revisionEvent.design_revisions_used, 3);
  const invitation = (
    await call(
      `/admin/weddings/${eventA.id}/photographer-invitations`,
      "POST",
      {
        email: "invited-photographer@example.com",
        business_name: "Davetli Fotoğraf",
        phone: "05320000004",
        address: "Fethiye, Muğla",
        expires_at: new Date(Date.now() + 86400_000).toISOString(),
        delivery_due_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
        expected_file_count: 250,
      },
      platform,
      201,
    )
  ).data;
  const invitationToken = invitation.invite_url.split("/").at(-1);
  await call(
    `/photographer-invitations/${invitationToken}/accept`,
    "POST",
    { display_name: "Davetli Fotoğrafçı", password: changed },
    undefined,
    201,
  );
  const invitedPhotographer = await login(
    "invited-photographer@example.com",
    changed,
  );
  const secondPhotographerId = randomUUID();
  await db.collection("users").insertOne({
    id: secondPhotographerId,
    email: "second-photographer@example.com",
    salt: printerSalt,
    passwordHash: scryptSync(changed, printerSalt, 64).toString("hex"),
    role: "partner",
    staff_role: "photographer",
    partner_id: partnerB,
    display_name: "İkinci Fotoğrafçı",
    disabled: false,
    must_change_password: false,
  });
  const photographerDirectory = (
    await call("/admin/photographers", "GET", undefined, platform)
  ).data;
  const secondPhotographerDirectoryEntry = photographerDirectory.find(
    (item) => item.id === secondPhotographerId,
  );
  assert.equal(secondPhotographerDirectoryEntry.partner_name, "B İşletmesi");
  assert.equal(secondPhotographerDirectoryEntry.logo_url, "");
  await call(
    `/admin/weddings/${eventA.id}/photographers`,
    "POST",
    { account_id: secondPhotographerId },
    platform,
    409,
  );
  const photographerEvent = (
    await call(
      `/admin/weddings/${eventA.id}`,
      "GET",
      undefined,
      invitedPhotographer,
    )
  ).data;
  assert.equal(
    photographerEvent.assigned_photographers[0].expected_file_count,
    250,
  );
  const photographerAccountId =
    photographerEvent.assigned_photographers[0].id;
  const photographerSale = (
    await call(
      "/admin/photographer-sales",
      "POST",
      {
        wedding_id: eventA.id,
        photographer_account_id: photographerAccountId,
        idempotency_key: `photographer-${eventA.id}`,
      },
      platform,
      201,
    )
  ).data;
  assert.equal(photographerSale.settlement_snapshot.grossCents, 400_000);
  assert.equal(
    photographerSale.settlement_snapshot.photographerGrossCents,
    300_000,
  );
  assert.equal(
    photographerSale.settlement_snapshot.originatingPartnerGrossCents,
    50_000,
  );
  assert.equal(photographerSale.settlement_snapshot.platformGrossCents, 50_000);
  assert.equal(photographerSale.originating_partner_id, partnerA);
  assert.equal(photographerSale.status, "pending_customer_consent");
  await call(
    "/uploads/sign",
    "POST",
    {
      weddingId: eventA.id,
      file_name: "odeme-oncesi.png",
      mime_type: "image/png",
      size_bytes: 10,
      uploader_session_id: randomUUID(),
      guest_name: "",
      guest_message: "",
    },
    invitedPhotographer,
    402,
  );
  assert.equal(
    (
      await call(
        "/admin/photographer-sales",
        "POST",
        {
          wedding_id: eventA.id,
          photographer_account_id: photographerAccountId,
          idempotency_key: `photographer-${eventA.id}`,
        },
        platform,
      )
    ).data.id,
    photographerSale.id,
  );
  await call(
    "/admin/photographer-sales",
    "POST",
    {
      wedding_id: eventA.id,
      photographer_account_id: photographerAccountId,
      idempotency_key: `photographer-duplicate-${eventA.id}`,
    },
    platform,
    409,
  );
  assert.equal(
    await db
      .collection("service_payout_ledger")
      .countDocuments({ sale_id: photographerSale.id }),
    0,
  );
  await call(
    `/admin/weddings/${eventA.id}/photographer-sale/accept`,
    "POST",
    {},
    a,
    403,
  );
  const consentedPhotographerSale = (
    await call(
      `/admin/weddings/${eventA.id}/photographer-sale/accept`,
      "POST",
      {},
      owner,
    )
  ).data;
  assert.equal(consentedPhotographerSale.status, "paid");
  assert.equal(consentedPhotographerSale.commercial_consent_version, 1);
  const initialPayouts = await db
    .collection("service_payout_ledger")
    .find({ sale_id: photographerSale.id, type: "accrual" })
    .toArray();
  assert.equal(initialPayouts.length, 3);
  assert.equal(
    initialPayouts.filter((entry) => entry.status === "pending_delivery").length,
    2,
  );
  assert.equal(
    initialPayouts.filter((entry) => entry.status === "recognized").length,
    1,
  );
  assert.equal(
    (await call("/admin/photographer-sales", "GET", undefined, a)).data.length,
    1,
  );
  await call(
    `/admin/weddings/${eventA.id}/media`,
    "GET",
    undefined,
    invitedPhotographer,
    403,
  );
  await call(
    `/admin/weddings/${eventA.id}/photographer-delivery`,
    "POST",
    undefined,
    invitedPhotographer,
    409,
  );
  const professionalBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const professionalTicket = (
    await call(
      "/uploads/sign",
      "POST",
      {
        weddingId: eventA.id,
        file_name: "profesyonel.png",
        mime_type: "image/png",
        size_bytes: professionalBytes.length,
        uploader_session_id: randomUUID(),
        guest_name: "",
        guest_message: "",
      },
      invitedPhotographer,
    )
  ).data;
  assert.equal(
    (
      await fetch(professionalTicket.url, {
        method: "PUT",
        headers: { "content-type": "image/png" },
        body: professionalBytes,
      })
    ).status,
    200,
  );
  await call(
    "/uploads/complete",
    "POST",
    { ticket: professionalTicket.ticket },
    invitedPhotographer,
  );
  const completedPhotography = (
    await call(
      `/admin/weddings/${eventA.id}/photographer-delivery`,
      "POST",
      undefined,
      invitedPhotographer,
    )
  ).data;
  assert.equal(completedPhotography.delivered_file_count, 1);
  const pendingApprovalPayouts = await db
    .collection("service_payout_ledger")
    .find({ sale_id: photographerSale.id, type: "accrual" })
    .toArray();
  assert.equal(
    pendingApprovalPayouts.filter(
      (entry) => entry.status === "pending_customer_approval",
    ).length,
    2,
  );
  assert.equal(
    pendingApprovalPayouts.filter((entry) => entry.status === "recognized")
      .length,
    1,
  );
  assert.equal(
    (
      await call(
        `/admin/weddings/${eventA.id}/photographer-sale`,
        "GET",
        undefined,
        owner,
      )
    ).data.customer_approval_status,
    "pending",
  );
  await call(
    `/admin/weddings/${eventA.id}/photographer-sale/approve-delivery`,
    "POST",
    {},
    a,
    403,
  );
  const customerApprovedSale = (
    await call(
      `/admin/weddings/${eventA.id}/photographer-sale/approve-delivery`,
      "POST",
      {},
      owner,
    )
  ).data;
  assert.equal(customerApprovedSale.customer_approval_status, "approved");
  const payablePayouts = await db
    .collection("service_payout_ledger")
    .find({
      sale_id: photographerSale.id,
      type: "accrual",
      status: "payable",
    })
    .toArray();
  assert.equal(payablePayouts.length, 2);
  await call(
    `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[0].id}/approve`,
    "POST",
    {},
    a,
    403,
  );
  const approvedPayout = (
    await call(
      `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[0].id}/approve`,
      "POST",
      {},
      platform,
    )
  ).data;
  assert.equal(approvedPayout.status, "approved");
  const paymentProof = new FormData();
  paymentProof.append(
    "file",
    new Blob([Buffer.from("%PDF-1.4\nShineQR test proof")], {
      type: "application/pdf",
    }),
    "odeme-belgesi.pdf",
  );
  const paymentProofUpload = await fetch(
    `${base}/api/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[0].id}/proof`,
    { method: "POST", headers: { cookie: platform }, body: paymentProof },
  );
  assert.equal(paymentProofUpload.status, 201);
  await call(
    `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[0].id}/mark-paid`,
    "POST",
    { payment_reference: "AYNI-KISI-ENGELI" },
    platform,
    409,
  );
  const paidPayout = (
    await call(
      `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[0].id}/mark-paid`,
      "POST",
      { payment_reference: "BANKA-TEST-0001" },
      finance,
    )
  ).data;
  assert.equal(paidPayout.status, "paid");
  assert.equal(paidPayout.payment_reference, "BANKA-TEST-0001");
  await call(
    `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[1].id}/approve`,
    "POST",
    {},
    platform,
  );
  const secondPaymentProof = new FormData();
  secondPaymentProof.append(
    "file",
    new Blob([Buffer.from("%PDF-1.4\nShineQR second proof")], {
      type: "application/pdf",
    }),
    "ikinci-odeme-belgesi.pdf",
  );
  assert.equal(
    (
      await fetch(
        `${base}/api/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[1].id}/proof`,
        { method: "POST", headers: { cookie: platform }, body: secondPaymentProof },
      )
    ).status,
    201,
  );
  await call(
    `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[1].id}/mark-paid`,
    "POST",
    { payment_reference: "BANKA-TEST-0001" },
    finance,
    409,
  );
  const reconciliation = (
    await call(
      "/admin/photographer-payout-reconciliation",
      "GET",
      undefined,
      finance,
    )
  ).data;
  assert.equal(reconciliation.paid.count, 1);
  assert.equal(reconciliation.paid.gross_cents, paidPayout.gross_cents);
  assert.equal(reconciliation.anomalies.length, 0);
  const proofView = await call(
    `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[0].id}/proof`,
    "GET",
    undefined,
    finance,
  );
  assert.match(proofView.data.url, /^http:/);
  await call(
    `/admin/photographer-sales/${photographerSale.id}/payouts/${payablePayouts[0].id}/proof`,
    "GET",
    undefined,
    a,
    403,
  );
  const csvExport = await fetch(
    `${base}/api/admin/photographer-payout-export.csv`,
    { headers: { cookie: finance } },
  );
  assert.equal(csvExport.status, 200);
  assert.match(csvExport.headers.get("content-type"), /^text\/csv/);
  const csvText = await csvExport.text();
  assert.match(csvText, /Hakediş ID/);
  assert.match(csvText, /BANKA-TEST-0001/);
  const paidCsv = await fetch(
    `${base}/api/admin/photographer-payout-export.csv?status=paid&beneficiary_type=${paidPayout.beneficiary_type}`,
    { headers: { cookie: finance } },
  );
  assert.equal(paidCsv.status, 200);
  const paidCsvText = await paidCsv.text();
  assert.match(paidCsvText, /BANKA-TEST-0001/);
  assert.match(paidCsvText, new RegExp(paidPayout.beneficiary_type));
  assert.equal(
    (
      await fetch(
        `${base}/api/admin/photographer-payout-export.csv?from=2026-12-31&to=2026-01-01`,
        { headers: { cookie: finance } },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/admin/photographer-sales?sale_status=paid&payout_status=paid",
        "GET",
        undefined,
        finance,
      )
    ).data.length,
    1,
  );
  assert.equal(
    (
      await fetch(`${base}/api/admin/photographer-payout-export.csv`, {
        headers: { cookie: a },
      })
    ).status,
    403,
  );
  assert.ok(
    (
      await call("/admin/notifications", "GET", undefined, owner)
    ).data.items.some((item) => item.id === "photography-delivered"),
  );
  const refundedPhotographerSale = (
    await call(
      `/admin/photographer-sales/${photographerSale.id}/refund`,
      "POST",
      { reason: "Entegrasyon iade kontrolü" },
      platform,
      409,
    )
  ).data;
  assert.equal(refundedPhotographerSale.error !== undefined, true);
  const printJob = (
    await call(
      "/admin/print-jobs",
      "POST",
      {
        wedding_id: eventA.id,
        printer_account_id: printerId,
        product_description: "Masa üstü QR kartı",
        quantity: 120,
        due_date: null,
        production_notes: "Onaylı tasarım kullanılacak.",
      },
      platform,
      201,
    )
  ).data;
  assert.equal(
    (await call("/admin/print-jobs", "GET", undefined, printerCookie)).data
      .length,
    1,
  );
  await call(
    `/admin/print-jobs/${printJob.id}`,
    "GET",
    undefined,
    otherPrinterCookie,
    404,
  );
  const productionPackage = (
    await call(
      `/admin/print-jobs/${printJob.id}/production-package`,
      "GET",
      undefined,
      printerCookie,
    )
  ).data;
  assert.equal(productionPackage.id, revisionEvent.design_snapshot_id);
  assert.equal(productionPackage.configuration.commercial, undefined);
  const wrongPdf = await PDFDocument.create();
  wrongPdf.addPage([100, 100]);
  const wrongPdfForm = new FormData();
  wrongPdfForm.set(
    "file",
    new Blob([await wrongPdf.save()], { type: "application/pdf" }),
    "yanlis-olcu.pdf",
  );
  const rejectedPdf = await fetch(
    `${base}/api/admin/print-jobs/${printJob.id}/production-pdf`,
    { method: "POST", headers: { cookie: platform }, body: wrongPdfForm },
  );
  assert.equal(rejectedPdf.status, 422);
  const printPdf = await PDFDocument.create();
  const mmToPoints = (value) => (value * 72) / 25.4;
  printPdf.addPage([mmToPoints(81), mmToPoints(106)]);
  printPdf.addPage([mmToPoints(81), mmToPoints(106)]);
  const pdfBytes = Buffer.from(await printPdf.save());
  const pdfForm = new FormData();
  pdfForm.set(
    "file",
    new Blob([pdfBytes], { type: "application/pdf" }),
    "event-a-baski.pdf",
  );
  const pdfUploadResponse = await fetch(
    `${base}/api/admin/print-jobs/${printJob.id}/production-pdf`,
    { method: "POST", headers: { cookie: platform }, body: pdfForm },
  );
  assert.equal(pdfUploadResponse.status, 200);
  const printJobWithPdf = await pdfUploadResponse.json();
  const forbiddenPdf = await fetch(
    `${base}/api/admin/print-jobs/${printJob.id}/production-pdf`,
    { headers: { cookie: otherPrinterCookie } },
  );
  assert.equal(forbiddenPdf.status, 404);
  const downloadedPdf = await fetch(
    `${base}/api/admin/print-jobs/${printJob.id}/production-pdf`,
    { headers: { cookie: printerCookie } },
  );
  assert.equal(downloadedPdf.status, 200);
  assert.equal(downloadedPdf.headers.get("content-type"), "application/pdf");
  assert.deepEqual(Buffer.from(await downloadedPdf.arrayBuffer()), pdfBytes);
  const downloaded = (
    await call(
      `/admin/print-jobs/${printJob.id}/status`,
      "PATCH",
      { status: "downloaded", version: printJobWithPdf.status_version },
      printerCookie,
    )
  ).data;
  await call(
    `/admin/print-jobs/${printJob.id}/status`,
    "PATCH",
    { status: "printing", version: downloaded.status_version },
    printerCookie,
    409,
  );
  assert.ok(
    (
      await call("/admin/notifications", "GET", undefined, printerCookie)
    ).data.items.some((item) => item.id === "print-action-required"),
  );
  const printerPreflight = (
    await call(
      `/admin/print-jobs/${printJob.id}/printer-preflight`,
      "POST",
      {
        color_profile_confirmed: true,
        fonts_confirmed: true,
        resolution_confirmed: true,
        bleed_and_trim_confirmed: true,
        note: "Matbaa teknik kontrolü tamamlandı.",
        version: downloaded.status_version,
      },
      printerCookie,
    )
  ).data;
  await call(
    `/admin/print-jobs/${printJob.id}/status`,
    "PATCH",
    { status: "printing", version: 1 },
    printerCookie,
    409,
  );
  const printing = (
    await call(
      `/admin/print-jobs/${printJob.id}/status`,
      "PATCH",
      { status: "printing", version: printerPreflight.status_version },
      printerCookie,
    )
  ).data;
  await call(
    `/admin/print-jobs/${printJob.id}/status`,
    "PATCH",
    { status: "delivered_to_partner", version: printing.status_version },
    printerCookie,
    409,
  );
  const readyJob = (
    await call(
      `/admin/print-jobs/${printJob.id}/status`,
      "PATCH",
      {
        status: "ready",
        version: printing.status_version,
        note: "Baskı tamamlandı.",
      },
      printerCookie,
    )
  ).data;
  assert.ok(
    (
      await call("/admin/notifications", "GET", undefined, platform)
    ).data.items.some((item) => item.id === "print-action-required"),
  );
  await call(
    `/admin/print-jobs/${printJob.id}/status`,
    "PATCH",
    { status: "received_by_shineqr", version: readyJob.status_version },
    platform,
    400,
  );
  const receivedJob = (
    await call(
      `/admin/print-jobs/${printJob.id}/status`,
      "PATCH",
      {
        status: "received_by_shineqr",
        version: readyJob.status_version,
        note: "ShineQR fiziksel teslim aldı.",
      },
      platform,
    )
  ).data;
  const qualityCheckedJob = (
    await call(
      `/admin/print-jobs/${printJob.id}/status`,
      "PATCH",
      {
        status: "quality_checked",
        version: receivedJob.status_version,
        note: "Kesim, renk ve QR okuma kontrolü tamamlandı.",
      },
      platform,
    )
  ).data;
  const deliveredJob = (
    await call(
      `/admin/print-jobs/${printJob.id}/status`,
      "PATCH",
      {
        status: "delivered_to_partner",
        version: qualityCheckedJob.status_version,
        note: "Partner yetkilisine teslim edildi.",
        carrier: "Elden teslim",
        tracking_code: "TESLIM-001",
      },
      platform,
    )
  ).data;
  assert.equal(deliveredJob.fulfillment_records.length, 4);
  assert.equal(
    deliveredJob.fulfillment_records.at(-1).tracking_code,
    "TESLIM-001",
  );
  const proofBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  const proofForm = new FormData();
  proofForm.set(
    "file",
    new Blob([proofBytes], { type: "image/png" }),
    "teslim.png",
  );
  proofForm.set("recipient_name", "Partner Yetkilisi");
  const proofUpload = await fetch(
    `${base}/api/admin/print-jobs/${printJob.id}/delivery-proof`,
    { method: "POST", headers: { cookie: platform }, body: proofForm },
  );
  assert.equal(proofUpload.status, 200);
  const proofDownload = await fetch(
    `${base}/api/admin/print-jobs/${printJob.id}/delivery-proof`,
    { headers: { cookie: platform } },
  );
  assert.equal(proofDownload.status, 200);
  assert.deepEqual(Buffer.from(await proofDownload.arrayBuffer()), proofBytes);
  await call(
    `/admin/print-jobs/${printJob.id}/delivery-proof`,
    "GET",
    undefined,
    printerCookie,
    403,
  );
  console.log(
    "PASS: print job approval gate, assigned-printer isolation, safe production projection and optimistic status locking",
  );
  const stableQr = await fetch(`${base}/q/${eventA.id}`, {
    redirect: "manual",
  });
  assert.equal(stableQr.status, 307);
  assert.equal(
    new URL(stableQr.headers.get("location")).pathname,
    "/wedding/event-a",
  );
  await call(
    `/admin/weddings/${eventA.id}`,
    "PATCH",
    { slug: "event-a-yeni" },
    a,
  );
  const stableQrAfterSlug = await fetch(`${base}/q/${eventA.id}`, {
    redirect: "manual",
  });
  assert.equal(
    new URL(stableQrAfterSlug.headers.get("location")).pathname,
    "/wedding/event-a-yeni",
  );
  await call(`/admin/weddings/${eventA.id}`, "PATCH", { slug: "event-a" }, a);
  assert.equal(
    (await db.collection("weddings").findOne({ id: eventA.id })).partner_id,
    partnerA,
  );
  console.log(
    "PASS: design persistence, public projection, platform/partner/owner access, tenant isolation and strict validation",
  );
  assert.equal(
    (await call("/admin/weddings", "GET", undefined, owner)).data.items.length,
    1,
  );
  await call(`/admin/weddings/${eventA2.id}`, "GET", undefined, owner, 404);
  await call("/admin/weddings", "POST", input("forbidden"), owner, 403);
  await call(
    `/admin/weddings/${eventA.id}`,
    "PATCH",
    { title: "Müşteri tarafından güncellendi" },
    owner,
    200,
  );
  const publicData = (await call("/weddings/slug/event-a")).data;
  assert.equal(publicData.can_upload, true);
  assert.equal(publicData.owner_id, undefined);
  assert.equal(publicData.partner_id, undefined);
  console.log(
    "PASS: partner creation, password change, tenant/owner isolation, public data projection",
  );
  const payload = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = {
    weddingId: eventA.id,
    file_name: "test.png",
    mime_type: "image/png",
    size_bytes: payload.length,
    uploader_session_id: randomUUID(),
    guest_name: "Misafir",
    guest_message: "Mutluluklar!",
  };
  await call(
    "/uploads/sign",
    "POST",
    { ...upload, size_bytes: 25 * 1024 ** 2 + 1 },
    undefined,
    413,
  );
  await call(
    "/uploads/sign",
    "POST",
    {
      ...upload,
      file_name: "test.mp4",
      mime_type: "video/mp4",
    },
    undefined,
    400,
  );
  await db.collection("weddings").updateOne(
    { id: eventA2.id },
    {
      $set: {
        media_bytes: 30 * 1024 ** 3 - 10,
        trashed_bytes: 0,
        reserved_upload_bytes: 0,
      },
    },
  );
  await call(
    "/uploads/sign",
    "POST",
    { ...upload, weddingId: eventA2.id },
    undefined,
    413,
  );
  await db
    .collection("weddings")
    .updateOne({ id: eventA2.id }, { $set: { media_bytes: 0 } });
  const ticket = (await call("/uploads/sign", "POST", upload)).data;
  assert.equal(
    (await db.collection("weddings").findOne({ id: eventA.id }))
      .reserved_upload_bytes,
    payload.length,
  );
  assert.equal(
    (
      await fetch(ticket.url, {
        method: "PUT",
        headers: { "content-type": "image/png" },
        body: payload,
      })
    ).status,
    200,
  );
  await call("/uploads/complete", "POST", { ticket: ticket.ticket });
  await call("/uploads/complete", "POST", { ticket: ticket.ticket });
  assert.equal(
    (
      await call(
        `/admin/weddings/${eventA.id}/media?source=guest`,
        "GET",
        undefined,
        owner,
      )
    ).data.total,
    1,
  );
  assert.equal(
    (
      await call(
        `/admin/weddings/${eventA.id}/media?source=photographer`,
        "GET",
        undefined,
        owner,
      )
    ).data.total,
    1,
  );
  assert.equal(
    (await db.collection("weddings").findOne({ id: eventA.id }))
      .reserved_upload_bytes,
    0,
  );
  const previewRun = await fetch(base + "/api/maintenance", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  assert.equal(previewRun.status, 200);
  assert.equal((await previewRun.json()).processed, 2);
  const mediaPage = (
    await call(`/admin/weddings/${eventA.id}/media`, "GET", undefined, owner)
  ).data;
  await call(`/admin/weddings/${eventA.id}/media`, "GET", undefined, a, 403);
  const ownerRecord = await db
    .collection("users")
    .findOne({ email: "owner-a" });
  await call(
    `/admin/accounts/${ownerRecord.id}`,
    "PATCH",
    {
      media_permissions: {
        view: false,
        download: false,
        manage: false,
        archive: false,
      },
    },
    a,
  );
  await call(
    `/admin/weddings/${eventA.id}/media`,
    "GET",
    undefined,
    owner,
    403,
  );
  await call(
    `/admin/accounts/${ownerRecord.id}`,
    "PATCH",
    {
      media_permissions: {
        view: true,
        download: true,
        manage: true,
        archive: true,
      },
    },
    a,
  );
  owner = await login("owner-a", changed);
  await call(
    `/admin/weddings/${eventB.id}/media`,
    "GET",
    undefined,
    owner,
    404,
  );
  const rows = mediaPage.items;
  assert.equal(mediaPage.total, 2);
  assert.equal(mediaPage.summary.photos, 2);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].guest_message, "Mutluluklar!");
  assert.equal(rows[0].storage_path, undefined);
  assert.ok(rows[0].preview_url.startsWith("http"));
  assert.ok(rows[0].url.startsWith("http"));
  const row = rows[0];
  const thumbnail = await fetch(rows[0].preview_url);
  assert.equal(thumbnail.status, 200);
  assert.equal(thumbnail.headers.get("content-type"), "image/webp");
  await call(
    `/admin/weddings/${eventA.id}/media/${row.id}`,
    "GET",
    undefined,
    undefined,
    401,
  );
  await call(
    `/admin/weddings/${eventA.id}/media/${row.id}`,
    "GET",
    undefined,
    b,
    404,
  );
  const image = await fetch(row.url);
  assert.equal(image.status, 200);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), payload);
  const range = await fetch(row.url, {
    headers: { range: "bytes=0-6" },
  });
  assert.equal(range.status, 206);
  assert.deepEqual(
    Buffer.from(await range.arrayBuffer()),
    payload.subarray(0, 7),
  );
  const zip = await fetch(base + `/api/admin/weddings/${eventA.id}/archive`, {
    headers: { cookie: owner },
  });
  assert.equal(zip.status, 200);
  const bytes = Buffer.from(await zip.arrayBuffer());
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  assert.ok(bytes.includes(payload));
  assert.ok(bytes.includes(Buffer.from("misafir-mesajlari.json")));
  await call(`/admin/weddings/${eventA.id}/archive`, "GET", undefined, b, 404);
  await call(
    `/admin/weddings/${eventA.id}/media`,
    "DELETE",
    { ids: [row.id] },
    owner,
  );
  assert.equal(
    (await call(`/admin/weddings/${eventA.id}/media`, "GET", undefined, owner))
      .data.items.length,
    1,
  );
  assert.equal(
    (
      await call(
        `/admin/weddings/${eventA.id}/media?trash=1`,
        "GET",
        undefined,
        owner,
      )
    ).data.items.length,
    1,
  );
  await call(
    `/admin/weddings/${eventA.id}/media/${row.id}`,
    "GET",
    undefined,
    owner,
    404,
  );
  const trashPreview = `/admin/weddings/${eventA.id}/media/${row.id}?trash_preview=1`;
  const preview = await fetch(base + "/api" + trashPreview, {
    headers: { cookie: owner },
  });
  assert.equal(preview.status, 200);
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), payload);
  await call(trashPreview, "GET", undefined, b, 404);
  await call(trashPreview, "GET", undefined, undefined, 401);
  await call(trashPreview + "&download=1", "GET", undefined, owner, 400);
  await call(
    `/admin/weddings/${eventA.id}/media`,
    "PATCH",
    { ids: [row.id], action: "restore" },
    owner,
  );
  console.log(
    "PASS: direct upload, idempotent completion, private download/video ranges, ZIP, trash and restore",
  );
  const permanentId = randomUUID();
  const permanentPath = "integration/permanent-delete.png";
  objects.set("/test-media/" + permanentPath, {
    body: payload,
    type: "image/png",
  });
  await db.collection("media").insertOne({
    id: permanentId,
    wedding_id: eventA.id,
    type: "photo",
    storage_path: permanentPath,
    file_name: "permanent-delete.png",
    mime_type: "image/png",
    size_bytes: payload.length,
    guest_name: "Kalıcı",
    guest_message: "",
    uploaded_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
    purge_at: new Date(Date.now() + 86400000).toISOString(),
  });
  await db.collection("weddings").updateOne(
    { id: eventA.id },
    {
      $inc: {
        trashed_photo_count: 1,
        trashed_count: 1,
        trashed_bytes: payload.length,
      },
    },
  );
  await call(
    "/admin/weddings/" + eventA.id + "/media",
    "PATCH",
    { ids: [permanentId], action: "purge" },
    owner,
  );
  assert.equal(
    await db.collection("media").countDocuments({ id: permanentId }),
    0,
  );
  assert.equal(objects.has("/test-media/" + permanentPath), false);
  console.log(
    "PASS: immediate permanent deletion removes MongoDB and R2 objects",
  );
  await db
    .collection("weddings")
    .updateOne(
      { id: eventA.id },
      { $set: { uploads_close_at: new Date(Date.now() - 1000).toISOString() } },
    );
  await call("/uploads/sign", "POST", upload, undefined, 410);
  await db
    .collection("weddings")
    .updateOne(
      { id: eventA.id },
      { $set: { uploads_close_at: eventA.uploads_close_at } },
    );
  const wrong = (await call("/uploads/sign", "POST", upload)).data;
  await fetch(wrong.url, {
    method: "PUT",
    headers: { "content-type": "image/png" },
    body: Buffer.from("bad"),
  });
  await call(
    "/uploads/complete",
    "POST",
    { ticket: wrong.ticket },
    undefined,
    400,
  );
  assert.equal(
    (await db.collection("weddings").findOne({ id: eventA.id }))
      .reserved_upload_bytes,
    0,
  );
  await call(
    `/admin/weddings/${eventA.id}/media`,
    "DELETE",
    { ids: [row.id] },
    owner,
  );
  await db
    .collection("media")
    .updateOne(
      { id: row.id },
      { $set: { purge_at: new Date(Date.now() - 1000).toISOString() } },
    );
  await call(trashPreview, "GET", undefined, owner, 404);
  await call(
    `/admin/weddings/${eventA.id}/media`,
    "PATCH",
    { ids: [row.id], action: "restore" },
    owner,
  );
  assert.notEqual(
    (await db.collection("media").findOne({ id: row.id })).deleted_at,
    null,
  );
  await call("/maintenance", "POST", {}, undefined, 401);
  const cleanup = async () => {
    const r = await fetch(base + "/api/maintenance", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    assert.equal(r.status, 200);
    return r.json();
  };
  await cleanup();
  assert.equal(await db.collection("media").countDocuments({ id: row.id }), 0);
  await db
    .collection("upload_tickets")
    .updateMany(
      { weddingId: eventA.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
  await db
    .collection("weddings")
    .updateOne(
      { id: eventA.id },
      { $set: { expires_at: new Date(Date.now() - 1000).toISOString() } },
    );
  await cleanup();
  await cleanup();
  assert.ok(
    (await db.collection("weddings").findOne({ id: eventA.id })).purged_at,
  );
  assert.equal(
    await db
      .collection("upload_tickets")
      .countDocuments({ weddingId: eventA.id }),
    0,
  );
  assert.equal(
    objects.size,
    5,
    "The partner logo, assigned print PDF, delivery proof and two payment proofs must remain in R2",
  );
  await call(
    `/admin/weddings/${eventA.id}/media`,
    "GET",
    undefined,
    owner,
    410,
  );
  await call(
    `/admin/partners/${partnerA}`,
    "PATCH",
    { active: false },
    platform,
  );
  await call("/admin/weddings", "GET", undefined, a, 401);
  await call("/admin/weddings", "GET", undefined, owner, 401);
  console.log(
    "PASS: upload cutoff, mismatch rejection, expired trash, permanent purge, retry safety and disabled partners",
  );
  console.log(
    "ALL INTEGRATION CHECKS PASSED (MongoDB + local S3 emulator, not live R2).",
  );
} catch (error) {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
} finally {
  if (next) {
    next.kill();
  }
  s3.closeAllConnections();
  s3.close();
  if (dbName.startsWith("test_platform_"))
    await mongo.db(dbName).dropDatabase();
  await mongo.close();
}
