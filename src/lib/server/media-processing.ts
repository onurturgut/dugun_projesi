import "server-only";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { db } from "./db";
import { storage } from "./r2";
import type { Media } from "@/lib/models";

const MAX_ATTEMPTS = 3;

async function sourceBuffer(path: string) {
  const { client, bucket } = storage();
  const object = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: path }),
  );
  if (!object.Body) throw new Error("Kaynak dosya bulunamadı.");
  return Buffer.from(await object.Body.transformToByteArray());
}

async function photoPreview(row: Media) {
  const source = await sourceBuffer(row.storage_path);
  return sharp(source, { animated: false })
    .rotate()
    .resize(640, 640, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();
}

async function videoPreview(row: Media) {
  const executable = ffmpegPath;
  if (!executable) throw new Error("FFmpeg kullanılamıyor.");
  const directory = await mkdtemp(join(tmpdir(), "shineqr-preview-"));
  const input = join(directory, `source-${row.id}`);
  const output = join(directory, "poster.webp");
  try {
    await writeFile(input, await sourceBuffer(row.storage_path));
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        executable,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          "0.1",
          "-i",
          input,
          "-frames:v",
          "1",
          "-vf",
          "scale=640:640:force_original_aspect_ratio=increase,crop=640:640",
          "-c:v",
          "libwebp",
          "-quality",
          "78",
          "-y",
          output,
        ],
        { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
      );
      let error = "";
      child.stderr.on("data", (chunk: Buffer) => (error += chunk.toString()));
      child.once("error", reject);
      child.once("close", (code: number | null) =>
        code === 0 ? resolve() : reject(new Error(error || `FFmpeg: ${code}`)),
      );
    });
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function processMediaPreviews(limit = 8) {
  const database = await db();
  const collection = database.collection<Media>("media");
  const errors: string[] = [];
  let processed = 0;
  for (let index = 0; index < limit; index++) {
    const row = await collection.findOneAndUpdate(
      {
        deleted_at: null,
        purging: { $ne: true },
        preview_path: { $exists: false },
        $and: [
          {
            $or: [
              { processing_status: { $exists: false } },
              { processing_status: { $in: ["pending", "failed"] } },
            ],
          },
          {
            $or: [
              { processing_attempts: { $exists: false } },
              { processing_attempts: { $lt: MAX_ATTEMPTS } },
            ],
          },
        ],
      },
      {
        $set: {
          processing_status: "processing",
          processing_started_at: new Date().toISOString(),
        },
        $inc: { processing_attempts: 1 },
      },
      { returnDocument: "after", sort: { uploaded_at: 1 } },
    );
    if (!row) break;
    try {
      const body =
        row.type === "photo"
          ? await photoPreview(row)
          : await videoPreview(row);
      const previewPath = `previews/${row.wedding_id}/${row.id}.webp`;
      const { client, bucket } = storage();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: previewPath,
          Body: body,
          ContentType: "image/webp",
          CacheControl: "private, max-age=31536000, immutable",
        }),
      );
      await collection.updateOne(
        { id: row.id, processing_status: "processing" },
        {
          $set: {
            preview_path: previewPath,
            preview_mime_type: "image/webp",
            processing_status: "ready",
          },
          $unset: { processing_error: "", processing_started_at: "" },
        },
      );
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      await collection.updateOne(
        { id: row.id, processing_status: "processing" },
        {
          $set: {
            processing_status: "failed",
            processing_error: message.slice(0, 500),
          },
          $unset: { processing_started_at: "" },
        },
      );
      errors.push(`preview:${row.id}`);
    }
  }
  return { processed, previewErrors: errors };
}
