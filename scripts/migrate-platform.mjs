import { MongoClient } from "mongodb";
const { MONGODB_URI, ADMIN_EMAIL } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL)
  throw new Error("MONGODB_URI ve ADMIN_EMAIL gerekli.");
const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "wedding_memories");
  const now = new Date().toISOString();
  await db
    .collection("partners")
    .updateOne(
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
  const admin = await db
    .collection("users")
    .updateOne(
      { email: ADMIN_EMAIL.trim().toLowerCase() },
      {
        $set: {
          role: "platform",
          partner_id: null,
          disabled: false,
          must_change_password: false,
        },
        $setOnInsert: { display_name: "Platform yöneticisi" },
      },
    );
  if (!admin.matchedCount)
    throw new Error("Önce npm run setup ile yönetici hesabını oluşturun.");
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
    await db
      .collection("weddings")
      .updateOne(
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
  await db
    .collection("media")
    .updateMany(
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
    db.collection("media").createIndex({ purge_at: 1 }),
    db.collection("media").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("users")
      .createIndex(
        { owner_event_id: 1 },
        { unique: true, partialFilterExpression: { role: "owner" } },
      ),
  ]);
  console.log(
    "Rol ve işletme geçişi tamamlandı. Mevcut organizasyonlar korundu; tarihsiz organizasyonların tarihi panelden ayarlanmalıdır.",
  );
} finally {
  await client.close();
}
