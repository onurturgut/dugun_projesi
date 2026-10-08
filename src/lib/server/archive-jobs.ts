import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough, Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { db } from "./db";
import { storage } from "./r2";

const safeName = (value: string) =>
  Array.from(value, (char) =>
    char.charCodeAt(0) < 32 || '"\\/'.includes(char) ? "_" : char,
  )
    .join("")
    .slice(0, 180) || "dosya";

export async function processArchiveJobs(limit = 1) {
  const database = await db();
  let completed = 0;
  for (let index = 0; index < limit; index++) {
    const job = await database
      .collection("archive_jobs")
      .findOneAndUpdate(
        { status: "pending" },
        { $set: { status: "processing", started_at: new Date() } },
        { sort: { created_at: 1 }, returnDocument: "after" },
      );
    if (!job) break;
    try {
      const rows = await database
        .collection("media")
        .find({
          wedding_id: job.wedding_id,
          deleted_at: null,
          purging: { $ne: true },
        })
        .sort({ uploaded_at: 1 })
        .toArray();
      const { client, bucket } = storage();
      const output = new PassThrough();
      const zip = new ZipArchive({ store: true });
      zip.pipe(output);
      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: job.storage_path,
          Body: output,
          ContentType: "application/zip",
        },
      });
      const uploading = upload.done();
      for (const row of rows) {
        const object = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: row.storage_path }),
        );
        if (!object.Body) throw new Error(`Eksik dosya: ${row.id}`);
        zip.append(object.Body as Readable, {
          name: `${row.id}-${safeName(row.file_name)}`,
        });
      }
      zip.append(
        JSON.stringify(
          rows.map((row) => ({
            file: `${row.id}-${safeName(row.file_name)}`,
            name: row.guest_name,
            message: row.guest_message,
            uploaded_at: row.uploaded_at,
          })),
          null,
          2,
        ),
        { name: "misafir-mesajlari.json" },
      );
      await zip.finalize();
      await uploading;
      await database
        .collection("archive_jobs")
        .updateOne(
          { id: job.id },
          {
            $set: {
              status: "ready",
              completed_at: new Date(),
              file_count: rows.length,
            },
          },
        );
      completed++;
    } catch (error) {
      await database
        .collection("archive_jobs")
        .updateOne(
          { id: job.id },
          {
            $set: {
              status: "failed",
              error:
                error instanceof Error
                  ? error.message.slice(0, 500)
                  : "Arşiv oluşturulamadı.",
            },
          },
        );
    }
  }
  return completed;
}
