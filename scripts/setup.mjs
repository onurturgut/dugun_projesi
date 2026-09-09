import { MongoClient } from "mongodb";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
const databaseOnly = process.argv.includes("--database-only");
if (
  !MONGODB_URI ||
  (!databaseOnly &&
    (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12))
)
  throw new Error(
    "MONGODB_URI, ADMIN_EMAIL ve en az 12 karakter ADMIN_PASSWORD gerekli.",
  );
const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "wedding_memories");
  await Promise.all([
    db.collection("partners").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ owner_event_id: 1 }, { unique: true, partialFilterExpression: { role: "owner" } }),
    db.collection("weddings").createIndex({ partner_id: 1, owner_id: 1 }),
    db.collection("weddings").createIndex({ expires_at: 1 }),
    db.collection("media").createIndex({ id: 1 }, { unique: true }),
    db.collection("media").createIndex({ purge_at: 1 }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("weddings").createIndex({ slug: 1 }, { unique: true }),
    db.collection("weddings").createIndex({ id: 1 }, { unique: true }),
    db.collection("media").createIndex({ storage_path: 1 }, { unique: true }),
    db.collection("media").createIndex({ wedding_id: 1, uploaded_at: -1 }),
    db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
    db
      .collection("sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("upload_tickets").createIndex({ token: 1 }, { unique: true }),
    db.collection("upload_tickets").createIndex({ expiresAt: 1 }),
    db.collection("upload_tickets").createIndex({ weddingId: 1, createdAt: 1 }),
    db
      .collection("login_attempts")
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 900 }),
    db.collection("login_attempts").createIndex({ key: 1, createdAt: 1 }),
  ]);
  if (!databaseOnly) {
    const salt = randomBytes(16).toString("hex");
    await db.collection("users").updateOne(
      { email: ADMIN_EMAIL.toLowerCase().trim() },
      {
        $setOnInsert: {
          id: randomUUID(),
          salt,
          passwordHash: scryptSync(ADMIN_PASSWORD, salt, 64).toString("hex"),
          role: "platform",
          partner_id: null,
          display_name: "Platform yöneticisi",
          disabled: false,
          must_change_password: false,
        },
      },
      { upsert: true },
    );
  }
  await db.collection("weddings").updateOne(
    { slug: "oguz-hilal" },
    {
      $setOnInsert: {
        id: randomUUID(),
        slug: "oguz-hilal",
        bride_name: "HİLAL",
        groom_name: "OĞUZ",
        wedding_date: null,
        cover_images: [1, 2, 3, 4].map((i) => `/covers/couple-${i}.jpg`),
        hero_message: "Anılarımızla bu özel günü birlikte ölümsüzleştirelim",
        thank_you_message:
          "Bu mutlu günümüze anılarınızla eşlik ettiğiniz için teşekkür ederiz.",
        auto_approve: false,
        created_at: new Date().toISOString(),
        partner_id: "platform",
        owner_id: null,
        title: "Oğuz & Hilal",
        event_type: "Düğün",
        logo_url: "",
        upload_days: 7,
        trash_days: 7,
        uploads_open_at: new Date().toISOString(),
        uploads_close_at: null,
        expires_at: null,
        upload_enabled: true,
        purged_at: null,
      },
    },
    { upsert: true },
  );
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
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  console.log(
    databaseOnly
      ? "İndeksler ve Oğuz & Hilal düğünü hazır. Yönetici hesabı değiştirilmedi."
      : "İndeksler, yönetici hesabı ve Oğuz & Hilal düğünü hazır. Mevcut kayıtlar değiştirilmedi.",
  );
} finally {
  await client.close();
}
