import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { MongoClient } from "mongodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  LOAD_EVENT_ID,
  LOAD_EVENT_SLUG,
  LOAD_PARTNER_ID,
  LOAD_USER_ID,
  LOAD_USERNAME,
  loadTestPassword,
  requireLoadTestConfirmation,
} from "./load-test-config.mjs";

requireLoadTestConfirmation();
const password = loadTestPassword();
const count = Math.min(5000, Math.max(24, Number(process.env.LOAD_TEST_MEDIA_COUNT) || 500));
const uri = process.env.MONGODB_URI;
const bucket = process.env.R2_BUCKET_NAME;
if (!uri || !bucket) throw new Error("MONGODB_URI ve R2_BUCKET_NAME gerekli.");
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const mongo = new MongoClient(uri);
const now = new Date();
const iso = now.toISOString();
const expires = new Date(now.getTime() + 30 * 86400000).toISOString();
const original = await sharp({
  create: { width: 32, height: 32, channels: 3, background: "#8b6f47" },
})
  .png()
  .toBuffer();
const preview = await sharp({
  create: { width: 400, height: 400, channels: 3, background: "#8b6f47" },
})
  .webp({ quality: 70 })
  .toBuffer();
const videoCount = Math.floor(count / 10);
const photoCount = count - videoCount;

try {
  await mongo.connect();
  const database = mongo.db(process.env.MONGODB_DB || "wedding_memories");
  if (await database.collection("weddings").findOne({ id: LOAD_EVENT_ID }))
    throw new Error("Yük testi zaten hazır. Önce yarn load:cleanup çalıştırın.");
  const salt = randomBytes(16).toString("hex");
  await database.collection("partners").updateOne(
    { id: LOAD_PARTNER_ID },
    {
      $set: {
        id: LOAD_PARTNER_ID,
        name: "Temsilî Yük Testi",
        logo_url: "",
        active: true,
        created_at: iso,
      },
    },
    { upsert: true },
  );
  await database.collection("users").updateOne(
    { id: LOAD_USER_ID },
    {
      $set: {
        id: LOAD_USER_ID,
        email: LOAD_USERNAME,
        salt,
        passwordHash: scryptSync(password, salt, 64).toString("hex"),
        role: "owner",
        partner_id: LOAD_PARTNER_ID,
        owner_event_id: LOAD_EVENT_ID,
        display_name: "Yük Testi Sahibi",
        disabled: false,
        must_change_password: false,
      },
    },
    { upsert: true },
  );
  await database.collection("weddings").insertOne({
    id: LOAD_EVENT_ID,
    slug: LOAD_EVENT_SLUG,
    partner_id: LOAD_PARTNER_ID,
    owner_id: LOAD_USER_ID,
    title: "Temsilî Yük Testi",
    event_type: "Yük Testi",
    bride_name: "Test",
    groom_name: "Albümü",
    wedding_date: iso.slice(0, 10),
    cover_images: ["/covers/couple-1.jpg"],
    logo_url: "",
    hero_message: "Yalnızca performans testi içindir.",
    thank_you_message: "Test tamamlandı.",
    created_at: iso,
    upload_days: 30,
    trash_days: 7,
    uploads_open_at: iso,
    uploads_close_at: expires,
    expires_at: expires,
    upload_enabled: true,
    purged_at: null,
    photo_count: photoCount,
    video_count: videoCount,
    media_bytes: original.length * count,
    trashed_photo_count: 0,
    trashed_video_count: 0,
    trashed_count: 0,
    trashed_bytes: 0,
  });

  const batchSize = 20;
  for (let offset = 0; offset < count; offset += batchSize) {
    const rows = Array.from({ length: Math.min(batchSize, count - offset) }, (_, position) => {
      const index = offset + position + 1;
      const id = randomUUID();
      const type = index % 10 === 0 ? "video" : "photo";
      return {
        id,
        wedding_id: LOAD_EVENT_ID,
        type,
        storage_path: `load-tests/${LOAD_EVENT_ID}/originals/${id}.png`,
        preview_path: `load-tests/${LOAD_EVENT_ID}/previews/${id}.webp`,
        preview_mime_type: "image/webp",
        file_name: `test-${String(index).padStart(4, "0")}.${type === "video" ? "mp4" : "png"}`,
        mime_type: type === "video" ? "video/mp4" : "image/png",
        size_bytes: original.length,
        uploader_session_id: randomUUID(),
        guest_name: `Test Misafir ${index}`,
        guest_message: `Temsilî performans kaydı ${index}`,
        uploaded_at: new Date(now.getTime() - index * 1000).toISOString(),
        deleted_at: null,
        purge_at: null,
        processing_status: "ready",
        processing_attempts: 0,
      };
    });
    await Promise.all(
      rows.flatMap((row) => [
        r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: row.storage_path,
            Body: original,
            ContentType: row.mime_type,
          }),
        ),
        r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: row.preview_path,
            Body: preview,
            ContentType: "image/webp",
            CacheControl: "private, max-age=31536000, immutable",
          }),
        ),
      ]),
    );
    await database.collection("media").insertMany(rows);
    process.stdout.write(`\rHazırlanan medya: ${Math.min(offset + batchSize, count)}/${count}`);
  }
  console.log(`\nHazır: ${count} medya, kullanıcı: ${LOAD_USERNAME}`);
} finally {
  await mongo.close();
}
