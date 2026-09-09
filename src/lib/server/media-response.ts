import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { storage } from "./r2";
import { HttpError } from "./access";
import type { Media, Wedding } from "@/lib/models";
const filename = (s: string) =>
  Array.from(s, char => char.charCodeAt(0) < 32 || '"\\/'.includes(char) ? '_' : char).join('').slice(0, 180) || "dosya";
export async function mediaResponse(
  row: Media,
  download: boolean,
  range: string | null,
) {
  const { client, bucket } = storage();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: row.storage_path,
      ...(range ? { Range: range } : {}),
    }),
  );
  if (!result.Body) throw new HttpError(404, "Dosya bulunamadı.");
  return new Response(result.Body.transformToWebStream() as ReadableStream, {
    status: result.ContentRange ? 206 : 200,
    headers: {
      "Content-Type": row.mime_type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename(row.file_name))}`,
      ...(result.ContentLength !== undefined
        ? { "Content-Length": String(result.ContentLength) }
        : {}),
      ...(result.ContentRange ? { "Content-Range": result.ContentRange } : {}),
    },
  });
}
export function zipResponse(rows: Media[], event: Wedding) {
  const { client, bucket } = storage();
  const zip = new ZipArchive({ store: true });
  const stream = Readable.toWeb(zip) as ReadableStream;
  void (async () => {
    try {
      for (const row of rows) {
        // Do not start another file after the retention deadline.
        if (event.expires_at && Date.parse(event.expires_at) <= Date.now())
          throw new Error("Saklama süresi doldu.");
        const object = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: row.storage_path }),
        );
        if (!object.Body) throw new Error("Dosya bulunamadı.");
        const body = object.Body as Readable;
        await new Promise<void>((resolve, reject) => {
          body.once("error", reject);
          body.once("end", resolve);
          zip.append(body, { name: `${row.id}-${filename(row.file_name)}` });
        });
      }
      zip.append(
        JSON.stringify(
          rows.map((r) => ({
            file: `${r.id}-${filename(r.file_name)}`,
            name: r.guest_name,
            message: r.guest_message,
            uploaded_at: r.uploaded_at,
          })),
          null,
          2,
        ),
        { name: "misafir-mesajlari.json" },
      );
      await zip.finalize();
    } catch (error) {
      zip.destroy(
        error instanceof Error ? error : new Error("Arşiv oluşturulamadı."),
      );
    }
  })();
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${event.slug}-anilar.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
