import "./configure-dns.mjs";
import { MongoClient } from "mongodb";
import { rebuildMediaCounters } from "./media-counters.mjs";
const { MONGODB_URI, ADMIN_EMAIL } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL)
  throw new Error("MONGODB_URI ve ADMIN_EMAIL gerekli.");
const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "wedding_memories");
  const now = new Date().toISOString();
  await db.collection("partners").updateOne(
    { id: "platform" },
    {
      $setOnInsert: {
        id: "platform",
        name: "Platform organizasyonları",
        logo_url: "",
        active: true,
        created_at: now,
      },
    },
    { upsert: true },
  );
  const admin = await db.collection("users").updateOne(
    { email: ADMIN_EMAIL.trim().toLowerCase() },
    {
      $set: {
        role: "platform",
        staff_role: "platform_admin",
        partner_id: null,
        disabled: false,
        must_change_password: false,
      },
      $setOnInsert: { display_name: "Platform yöneticisi" },
    },
  );
  if (!admin.matchedCount)
    throw new Error("Önce npm run setup ile yönetici hesabını oluşturun.");
  await Promise.all([
    db
      .collection("users")
      .updateMany(
        { role: "platform", staff_role: { $exists: false } },
        { $set: { staff_role: "platform_admin" } },
      ),
    db
      .collection("users")
      .updateMany(
        { role: "partner", staff_role: { $exists: false } },
        { $set: { staff_role: "partner_owner" } },
      ),
    db
      .collection("users")
      .updateMany(
        { role: "owner", staff_role: { $exists: false } },
        { $set: { staff_role: "organization_owner" } },
      ),
  ]);
  const specializedRoleMigrations = [
    { businessType: "photography", staffRole: "photographer" },
    { businessType: "print_vendor", staffRole: "print_vendor" },
  ];
  const migratedAccountRoles = {};
  for (const { businessType, staffRole } of specializedRoleMigrations) {
    const partnerIds = await db
      .collection("partners")
      .distinct("id", { business_types: [businessType] });
    const result = partnerIds.length
      ? await db.collection("users").updateMany(
          {
            role: "partner",
            staff_role: "partner_owner",
            partner_id: { $in: partnerIds },
          },
          {
            $set: {
              staff_role: staffRole,
              business_role_migrated_at: now,
              business_role_migrated_from: "partner_owner",
            },
          },
        )
      : { modifiedCount: 0 };
    migratedAccountRoles[staffRole] = result.modifiedCount;
  }
  await db
    .collection("weddings")
    .updateMany(
      { lead_partner_id: { $exists: false }, partner_id: { $type: "string" } },
      [
        {
          $set: {
            lead_partner_id: "$partner_id",
            seller_partner_id: {
              $ifNull: ["$seller_partner_id", "$partner_id"],
            },
            participant_partner_ids: {
              $setUnion: [
                { $ifNull: ["$participant_partner_ids", []] },
                ["$partner_id"],
              ],
            },
          },
        },
      ],
    );
  await db.collection("media").updateMany(
    { source: { $exists: false } },
    {
      $set: {
        source: "guest",
        uploader_account_id: null,
        photographer_partner_id: null,
      },
    },
  );
  await db
    .collection("partners")
    .updateMany(
      { $or: [{ phone: { $exists: false } }, { address: { $exists: false } }] },
      [
        {
          $set: {
            phone: { $ifNull: ["$phone", ""] },
            address: { $ifNull: ["$address", ""] },
          },
        },
      ],
    );
  const participantRows = [];
  for (const account of await db
    .collection("users")
    .find(
      { assigned_event_ids: { $type: "array", $ne: [] } },
      {
        projection: {
          id: 1,
          partner_id: 1,
          staff_role: 1,
          assigned_event_ids: 1,
        },
      },
    )
    .toArray()) {
    for (const weddingId of account.assigned_event_ids || [])
      participantRows.push({
        updateOne: {
          filter: { wedding_id: weddingId, account_id: account.id },
          update: {
            $setOnInsert: {
              id: crypto.randomUUID(),
              wedding_id: weddingId,
              account_id: account.id,
              partner_id: account.partner_id,
              participant_role: account.staff_role || "partner_staff",
              active: true,
              assigned_at: now,
              assigned_by: "migration",
              delivery_due_at: null,
              expected_file_count: null,
              delivery_status: "assigned",
              delivered_file_count: 0,
              completed_at: null,
              completed_by: null,
            },
          },
          upsert: true,
        },
      });
  }
  if (participantRows.length)
    await db.collection("organization_participants").bulkWrite(participantRows);
  for (const w of await db
    .collection("weddings")
    .find({ partner_id: { $exists: false } })
    .toArray()) {
    let times = { uploads_close_at: null, expires_at: null };
    if (w.wedding_date) {
      const [y, m, d] = w.wedding_date.split("-").map(Number);
      const end = new Date(Date.UTC(y, m + 2, 1));
      const last = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
      ).getUTCDate();
      times = {
        uploads_close_at: new Date(
          Date.parse(w.wedding_date + "T00:00:00+03:00") + 7 * 86400000,
        ).toISOString(),
        expires_at: new Date(
          Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), Math.min(d, last)) -
            10800000,
        ).toISOString(),
      };
    }
    await db.collection("weddings").updateOne(
      { id: w.id, partner_id: { $exists: false } },
      {
        $set: {
          partner_id: "platform",
          owner_id: null,
          title: [w.groom_name, w.bride_name].filter(Boolean).join(" & "),
          event_type: "Düğün",
          logo_url: "",
          upload_days: 7,
          trash_days: 7,
          uploads_open_at: w.created_at || now,
          upload_enabled: true,
          purged_at: null,
          ...times,
        },
      },
    );
  }
  await db.collection("media").updateMany(
    { deleted_at: { $exists: false } },
    {
      $set: {
        deleted_at: null,
        purge_at: null,
        guest_name: "",
        guest_message: "",
      },
    },
  );
  await db
    .collection("weddings")
    .updateMany(
      { reserved_upload_bytes: { $exists: false } },
      { $set: { reserved_upload_bytes: 0 } },
    );
  // Tickets must remain until orphaned R2 objects are cleaned. TTL alone would lose their keys.
  for (const index of await db
    .collection("upload_tickets")
    .listIndexes()
    .toArray()) {
    if (index.expireAfterSeconds !== undefined)
      await db.collection("upload_tickets").dropIndex(index.name);
  }
  await Promise.all([
    db.collection("partners").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("weddings").createIndex({ partner_id: 1, owner_id: 1 }),
    db.collection("weddings").createIndex({ expires_at: 1 }),
    db.collection("design_snapshots").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("design_snapshots")
      .createIndex({ wedding_id: 1, revision: -1 }, { unique: true }),
    db
      .collection("organization_approval_requests")
      .createIndex({ wedding_id: 1 }, { unique: true }),
    db
      .collection("organization_approval_requests")
      .createIndex({ partner_id: 1, submitted_at: -1 }),
    db.collection("sales").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("sales")
      .createIndex({ idempotency_key: 1 }, { unique: true }),
    db
      .collection("sales")
      .createIndex({ partner_id: 1, period: 1, occurred_at: -1 }),
    db
      .collection("monthly_sales_counters")
      .createIndex({ partner_id: 1, period: 1 }, { unique: true }),
    db
      .collection("upload_tickets")
      .createIndex({ weddingId: 1, reservation_released: 1, expiresAt: 1 }),
    db.collection("commission_ledger").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("commission_ledger")
      .createIndex({ partner_id: 1, period: 1, created_at: -1 }),
    db.collection("add_on_products").createIndex({ id: 1 }, { unique: true }),
    db.collection("add_on_products").createIndex({ active: 1, name: 1 }),
    db.collection("agent_reports").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("agent_reports")
      .createIndex({ run_id: 1, agent_name: 1 }, { unique: true }),
    db.collection("agent_reports").createIndex({ created_at: -1 }),
    db
      .collection("organization_participants")
      .createIndex({ wedding_id: 1, account_id: 1 }, { unique: true }),
    db
      .collection("organization_participants")
      .createIndex({ account_id: 1, active: 1, wedding_id: 1 }),
    db
      .collection("agent_reports")
      .createIndex({ review_status: 1, status: 1, created_at: -1 }),
    db.collection("media").createIndex({ purge_at: 1 }),
    db.collection("media").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("media")
      .createIndex({ wedding_id: 1, deleted_at: 1, uploaded_at: -1, id: -1 }),
    db.collection("media").createIndex({
      wedding_id: 1,
      deleted_at: 1,
      type: 1,
      uploaded_at: -1,
      id: -1,
    }),
    db
      .collection("media")
      .createIndex({ wedding_id: 1, deleted_at: 1, size_bytes: -1, id: -1 }),
    db.collection("media").createIndex({
      processing_status: 1,
      processing_attempts: 1,
      uploaded_at: 1,
    }),
    db
      .collection("users")
      .createIndex(
        { owner_event_id: 1 },
        { unique: true, partialFilterExpression: { role: "owner" } },
      ),
  ]);
  const counterCount = await rebuildMediaCounters(db);
  console.log(
    `Mevcut hesap rolleri guncellendi: ${migratedAccountRoles.photographer} fotografci, ${migratedAccountRoles.print_vendor} baskici.`,
  );
  console.log(
    "Rol ve işletme geçişi tamamlandı. Mevcut organizasyonlar korundu; tarihsiz organizasyonların tarihi panelden ayarlanmalıdır.",
  );
  console.log(`${counterCount} organizasyonun medya sayaÃ§larÄ± yenilendi.`);
} finally {
  await client.close();
}
