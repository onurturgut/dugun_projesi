import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { MongoClient } from "mongodb";
import {
  LOAD_EVENT_ID,
  LOAD_PARTNER_ID,
  LOAD_USER_ID,
  requireLoadTestConfirmation,
} from "./load-test-config.mjs";

requireLoadTestConfirmation();
const uri = process.env.MONGODB_URI;
const bucket = process.env.R2_BUCKET_NAME;
if (!uri || !bucket) throw new Error("MONGODB_URI ve R2_BUCKET_NAME gerekli.");
const mongo = new MongoClient(uri);
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
try {
  await mongo.connect();
  const database = mongo.db(process.env.MONGODB_DB || "wedding_memories");
  const rows = await database
    .collection("media")
    .find({ wedding_id: LOAD_EVENT_ID })
    .project({ storage_path: 1, preview_path: 1 })
    .toArray();
  const keys = rows.flatMap((row) => [row.storage_path, row.preview_path]).filter(Boolean);
  for (let offset = 0; offset < keys.length; offset += 1000)
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.slice(offset, offset + 1000).map((Key) => ({ Key })) },
      }),
    );
  await database.collection("media").deleteMany({ wedding_id: LOAD_EVENT_ID });
  await database.collection("upload_tickets").deleteMany({ weddingId: LOAD_EVENT_ID });
  await database.collection("weddings").deleteOne({ id: LOAD_EVENT_ID });
  await database.collection("users").deleteOne({ id: LOAD_USER_ID });
  await database.collection("partners").deleteOne({ id: LOAD_PARTNER_ID });
  console.log(`Temizlendi: ${rows.length} medya ve ${keys.length} R2 nesnesi.`);
} finally {
  await mongo.close();
}
