import "server-only";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Account } from "@/lib/models";
import { db } from "./db";
import { storage, deleteObject } from "./r2";
import { eventFor, HttpError, requireAccount, requireManager } from "./access";

const prefix = "/api/covers/";
export async function uploadCover(req: Request, user: Account) {
  requireManager(user);
  if (Number(req.headers.get("content-length")) > 3 * 1024 * 1024)
    throw new HttpError(413, "Kapak dosyası en fazla 2 MB olabilir.");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024)
    throw new HttpError(
      400,
      "Geçerli bir kapak görseli seçin (en fazla 2 MB).",
    );
  const database = await db();
  const eventId = String(form.get("event_id") || "");
  const event = eventId ? await eventFor(user, eventId) : null;
  const partnerId =
    event?.partner_id ??
    (user.role === "platform"
      ? String(form.get("partner_id") || "platform")
      : user.partner_id!);
  if (
    !(await database
      .collection("partners")
      .findOne({ id: partnerId, active: true }))
  )
    throw new HttpError(400, "İşletme bulunamadı.");
  const assets = database.collection("cover_assets");
  if (
    (await assets.countDocuments({
      created_by: user.id,
      created_at: { $gt: new Date(Date.now() - 3600000) },
    })) >= 100
  )
    throw new HttpError(429, "Saatlik kapak yükleme sınırına ulaşıldı.");
  const body = Buffer.from(await file.arrayBuffer());
  const type = body.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    ? "image/jpeg"
    : body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : body.toString("ascii", 0, 4) === "RIFF" &&
          body.toString("ascii", 8, 12) === "WEBP"
        ? "image/webp"
        : null;
  if (!type || type !== file.type)
    throw new HttpError(
      400,
      "Yalnızca JPG, PNG veya WebP görseller yüklenebilir.",
    );
  const id = randomUUID(),
    key = `covers/${partnerId}/${id}`,
    url = `${prefix}${id}`;
  const { client, bucket } = storage();
  // Register before storage writes so interrupted uploads can be cleaned up.
  await assets.insertOne({
    id,
    url,
    storage_path: key,
    partner_id: partnerId,
    created_by: user.id,
    mime_type: type,
    created_at: new Date(),
    touched_at: new Date(),
    ready: false,
  });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: type,
    }),
  );
  await assets.updateOne({ id }, { $set: { ready: true } });
  return { url };
}

export async function validateCovers(urls: string[], partnerId: string) {
  const assets = (await db()).collection("cover_assets");
  for (const url of urls.filter((url) => url.startsWith(prefix))) {
    const asset = await assets.findOneAndUpdate(
      { url, partner_id: partnerId, ready: true, deleting: { $ne: true } },
      { $set: { touched_at: new Date() } },
    );
    if (!asset)
      throw new HttpError(
        400,
        "Kapak görseli bulunamadı veya bu işletmeye ait değil. Görseli yeniden yükleyin.",
      );
  }
}

export async function coverResponse(id: string) {
  const database = await db(),
    url = `${prefix}${id}`;
  const asset = await database
    .collection("cover_assets")
    .findOne({ id, ready: true, deleting: { $ne: true } });
  if (!asset) throw new HttpError(404, "Kapak bulunamadı.");
  const published = await database
    .collection("weddings")
    .findOne({
      cover_images: url,
      purged_at: null,
      expires_at: { $gt: new Date().toISOString() },
    });
  const active =
    published &&
    (await database
      .collection("partners")
      .findOne({ id: published.partner_id, active: true }));
  if (!active) {
    const user = await requireAccount();
    requireManager(user);
    if (user.role !== "platform" && user.partner_id !== asset.partner_id)
      throw new HttpError(404, "Kapak bulunamadı.");
  }
  const { client, bucket } = storage();
  const object = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: asset.storage_path }),
  );
  if (!object.Body) throw new HttpError(404, "Kapak bulunamadı.");
  return new Response(object.Body.transformToWebStream() as ReadableStream, {
    headers: {
      "Content-Type": asset.mime_type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function cleanupCovers(now: Date, errors: string[]) {
  const database = await db(),
    assets = database.collection("cover_assets");
  const cutoff = new Date(now.getTime() - 86400000);
  const rows = await assets
    .find({ $or: [{ touched_at: { $lt: cutoff } }, { deleting: true }] })
    .limit(500)
    .toArray();
  for (const row of rows) {
    if (
      !row.deleting &&
      (await database
        .collection("weddings")
        .findOne({
          cover_images: row.url,
          purged_at: null,
          expires_at: { $gt: now.toISOString() },
        }))
    )
      continue;
    const claimed = await assets.findOneAndUpdate(
      { id: row.id, touched_at: row.touched_at },
      { $set: { deleting: true } },
    );
    if (!claimed) continue;
    try {
      await deleteObject(row.storage_path);
      await assets.deleteOne({ id: row.id, deleting: true });
    } catch {
      errors.push(`cover:${row.id}`);
    }
  }
}
