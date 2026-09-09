import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_COVERS_BUCKET_NAME,
  R2_PUBLIC_URL,
  MONGODB_URI,
} = process.env;
if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_COVERS_BUCKET_NAME ||
  !R2_PUBLIC_URL ||
  !MONGODB_URI
)
  throw new Error("R2 kapak bucketı, public URL ve MongoDB ayarları gerekli.");
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
const covers = [];
for (let i = 1; i <= 4; i++) {
  const key = `covers/couple-${i}.jpg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_COVERS_BUCKET_NAME,
      Key: key,
      Body: await readFile(new URL(`../public/${key}`, import.meta.url)),
      ContentType: "image/jpeg",
    }),
  );
  covers.push(`${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`);
}
const client = new MongoClient(MONGODB_URI);
try {
  await client.connect();
  const result = await client
    .db(process.env.MONGODB_DB || "wedding_memories")
    .collection("weddings")
    .updateOne({ slug: "oguz-hilal" }, { $set: { cover_images: covers } });
  if (!result.matchedCount) throw new Error("Önce npm run setup çalıştırın.");
  console.log("Dört kapak fotoğrafı R2’ye aktarıldı ve düğün güncellendi.");
} finally {
  await client.close();
}
