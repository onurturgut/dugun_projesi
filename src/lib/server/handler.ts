import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "./db";
import { hash } from "./auth";
import { passwordFields, matches } from "./passwords";
import {
  HttpError,
  requireAccount,
  requireManager,
  requirePlatform,
  eventFor,
} from "./access";
import {
  eventInput,
  accountInput,
  loginName,
  passwordSchema,
  mediaIds,
  uploadInput,
} from "./validation";
import { storage, deleteObject } from "./r2";
import { mediaResponse, zipResponse } from "./media-response";
import { cleanup } from "./maintenance";
import {
  deadlines,
  expired,
  uploadsOpen,
  trashDeadline,
  weddingScope,
} from "@/lib/policy";
import type { Wedding, Media, Account } from "@/lib/models";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
const publicEvent = (w: Wedding) => ({
  id: w.id,
  slug: w.slug,
  title: w.title,
  event_type: w.event_type,
  bride_name: w.bride_name,
  groom_name: w.groom_name,
  wedding_date: w.wedding_date,
  cover_images: w.cover_images,
  logo_url: w.logo_url,
  hero_message: w.hero_message,
  thank_you_message: w.thank_you_message,
  can_upload: uploadsOpen(w),
  uploads_close_at: w.uploads_close_at,
});
export async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const route = path.join("/"),
      method = req.method;
    if (
      !["GET", "HEAD"].includes(method) &&
      req.headers.get("origin") &&
      req.headers.get("origin") !== req.nextUrl.origin
    )
      throw new HttpError(403, "Geçersiz kaynak.");
    if (route === "maintenance" && method === "POST") {
      const secret = process.env.CRON_SECRET,
        provided = req.headers.get("authorization") || "";
      if (
        !secret ||
        secret.length < 32 ||
        provided.length !== `Bearer ${secret}`.length ||
        !timingSafeEqual(Buffer.from(provided), Buffer.from(`Bearer ${secret}`))
      )
        throw new HttpError(401, "Yetkisiz işlem.");
      const result = await cleanup();
      return json(result, result.errors.length ? 503 : 200);
    }
    if (route === "auth/logout" && method === "POST") {
      const jar = await cookies(),
        token = jar.get("wm_session")?.value;
      if (token)
        await (
          await db()
        )
          .collection("sessions")
          .deleteOne({ token: hash(token) });
      jar.delete("wm_session");
      return json({ ok: true });
    }
    const user =
      route.startsWith("admin/") ||
      route === "auth/me" ||
      route === "auth/password"
        ? await requireAccount(route === "auth/me" || route === "auth/password")
        : null;
    const database = await db(),
      weddings = database.collection<Wedding>("weddings"),
      media = database.collection<Media>("media");
    if (route === "auth/login" && method === "POST") {
      const { email, password } = z
        .object({ email: loginName, password: z.string().min(1).max(256) })
        .parse(await req.json());
      const key = hash(email),
        attempts = database.collection("login_attempts");
      if (
        (await attempts.countDocuments({
          key,
          createdAt: { $gt: new Date(Date.now() - 900000) },
        })) >= 10
      )
        throw new HttpError(
          429,
          "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.",
        );
      await attempts.insertOne({ key, createdAt: new Date() });
      const account = await database.collection("users").findOne({ email });
      const valid = await matches(
        password,
        account as { salt: string; passwordHash: string } | null,
      );
      if (
        !valid ||
        !account ||
        account.disabled ||
        !["platform", "partner", "owner"].includes(account.role)
      )
        throw new HttpError(401, "Kullanıcı adı veya şifre hatalı.");
      if (
        account.role !== "platform" &&
        !(await database
          .collection("partners")
          .findOne({ id: account.partner_id, active: true }))
      )
        throw new HttpError(401, "Hesap kullanıma kapalı.");
      await attempts.deleteMany({ key });
      const token = randomBytes(32).toString("hex"),
        expiresAt = new Date(Date.now() + 7 * 86400000);
      await database
        .collection("sessions")
        .insertOne({ token: hash(token), userId: account.id, expiresAt });
      (await cookies()).set("wm_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
      });
      return json({
        ok: true,
        must_change_password: !!account.must_change_password,
      });
    }
    if (route === "auth/me" && method === "GET") return json(user);
    if (route === "auth/password" && method === "POST" && user) {
      const data = z
        .object({
          current_password: z.string().max(256),
          password: passwordSchema,
        })
        .parse(await req.json());
      if (data.current_password === data.password)
        throw new HttpError(
          400,
          "Yeni şifre geçici/eski şifreden farklı olmalı.",
        );
      const account = await database
        .collection("users")
        .findOne({ id: user.id });
      if (
        !(await matches(
          data.current_password,
          account as { salt: string; passwordHash: string } | null,
        ))
      )
        throw new HttpError(400, "Mevcut şifre hatalı.");
      await database
        .collection("users")
        .updateOne(
          { id: user.id },
          {
            $set: {
              ...(await passwordFields(data.password)),
              must_change_password: false,
            },
          },
        );
      const current = (await cookies()).get("wm_session")?.value;
      await database
        .collection("sessions")
        .deleteMany({ userId: user.id, token: { $ne: hash(current || "") } });
      return json({ ok: true });
    }
    if (route === "weddings" && method === "GET")
      return json(
        (
          await weddings
            .find({ purged_at: null })
            .sort({ created_at: -1 })
            .limit(6)
            .toArray()
        ).map(publicEvent),
      );
    if (
      path.length === 3 &&
      path[0] === "weddings" &&
      path[1] === "slug" &&
      method === "GET"
    ) {
      const w = await weddings.findOne({ slug: path[2] });
      if (!w) throw new HttpError(404, "Organizasyon bulunamadı.");
      return json(publicEvent(w));
    }
    if (route === "admin/partners" && user) {
      requirePlatform(user);
      if (method === "GET")
        return json(
          await database
            .collection("partners")
            .find({}, { projection: { _id: 0 } })
            .sort({ created_at: -1 })
            .toArray(),
        );
      if (method === "POST") {
        const data = accountInput
          .extend({
            name: z.string().trim().min(1).max(120),
            logo_url: z.string().max(2048).default(""),
          })
          .parse(await req.json());
        if (data.logo_url && !data.logo_url.startsWith("https://"))
          throw new HttpError(400, "Logo HTTPS adresi olmalı.");
        const id = randomUUID();
        const fields = await passwordFields(data.password);
        await database
          .collection("users")
          .insertOne({
            id: randomUUID(),
            email: data.username,
            ...fields,
            role: "partner",
            partner_id: id,
            display_name: data.display_name,
            must_change_password: true,
            disabled: false,
          });
        try {
          await database
            .collection("partners")
            .insertOne({
              id,
              name: data.name,
              logo_url: data.logo_url,
              active: true,
              created_at: new Date().toISOString(),
            });
        } catch (e) {
          await database
            .collection("users")
            .deleteOne({ partner_id: id, role: "partner" });
          throw e;
        }
        return json({ id }, 201);
      }
    }
    if (
      path.length === 3 &&
      path[0] === "admin" &&
      path[1] === "partners" &&
      method === "PATCH" &&
      user
    ) {
      requirePlatform(user);
      if (path[2] === "platform")
        throw new HttpError(400, "Platform işletmesi kapatılamaz.");
      const data = z.object({ active: z.boolean() }).parse(await req.json());
      await database
        .collection("partners")
        .updateOne({ id: path[2] }, { $set: data });
      return json({ ok: true });
    }
    if (route === "admin/status" && method === "GET" && user) {
      requirePlatform(user);
      return json({
        r2_ready: !!(
          process.env.R2_ACCOUNT_ID &&
          process.env.R2_ACCESS_KEY_ID &&
          process.env.R2_SECRET_ACCESS_KEY &&
          process.env.R2_BUCKET_NAME
        ),
        last_cleanup: await database
          .collection("maintenance_runs")
          .findOne({}, { sort: { at: -1 }, projection: { _id: 0 } }),
      });
    }
    if (route === "admin/weddings" && user) {
      if (method === "GET") {
        const events = await weddings
          .find(weddingScope(user), { projection: { _id: 0 } })
          .sort({ created_at: -1 })
          .toArray();
        return json(
          await Promise.all(
            events.map(async (w) => {
              const stats = await media
                .aggregate([
                  { $match: { wedding_id: w.id } },
                  {
                    $group: {
                      _id: null,
                      total: {
                        $sum: {
                          $cond: [
                            { $eq: [{ $ifNull: ["$deleted_at", null] }, null] },
                            1,
                            0,
                          ],
                        },
                      },
                      trashed: {
                        $sum: {
                          $cond: [
                            { $ne: [{ $ifNull: ["$deleted_at", null] }, null] },
                            1,
                            0,
                          ],
                        },
                      },
                      size_bytes: { $sum: "$size_bytes" },
                    },
                  },
                ])
                .toArray();
              return { ...w, ...stats[0], _id: undefined };
            }),
          ),
        );
      }
      if (method === "POST") {
        requireManager(user);
        const data = eventInput.parse(await req.json());
        const partner_id =
          user.role === "platform"
            ? data.partner_id || "platform"
            : user.partner_id!;
        const partner = await database
          .collection("partners")
          .findOne({ id: partner_id, active: true });
        if (!partner) throw new HttpError(400, "İşletme bulunamadı.");
        if (
          user.role !== "platform" &&
          (data.upload_days !== undefined || data.trash_days !== undefined)
        )
          throw new HttpError(
            403,
            "Süreleri yalnızca platform yöneticisi değiştirebilir.",
          );
        const now = new Date().toISOString();
        let times;
        try {
          times = deadlines(data.wedding_date, data.upload_days || 7);
        } catch {
          throw new HttpError(400, "Geçersiz organizasyon tarihi.");
        }
        const w: Wedding = {
          ...data,
          id: randomUUID(),
          partner_id,
          owner_id: null,
          upload_days: data.upload_days || 7,
          trash_days: data.trash_days || 7,
          uploads_open_at: now,
          upload_enabled: true,
          purged_at: null,
          created_at: now,
          ...times,
          logo_url: data.logo_url || partner.logo_url || "",
        };
        await weddings.insertOne(w);
        return json(w, 201);
      }
    }
    if (path[0] === "admin" && path[1] === "weddings" && path[2] && user) {
      const event = await eventFor(user, path[2]);
      const id = event.id;
      if (path.length === 3) {
        if (method === "GET") return json(event);
        if (method === "PATCH") {
          requireManager(user);
          const data = eventInput.partial().parse(await req.json());
          if (data.partner_id && data.partner_id !== event.partner_id)
            throw new HttpError(
              400,
              "Organizasyonun işletmesi değiştirilemez.",
            );
          if (
            user.role !== "platform" &&
            (data.upload_days !== undefined || data.trash_days !== undefined)
          )
            throw new HttpError(
              403,
              "Süreleri yalnızca platform yöneticisi değiştirebilir.",
            );
          if (event.purged_at && (data.wedding_date || data.upload_days))
            throw new HttpError(
              400,
              "Süresi dolup temizlenen organizasyon yeniden açılamaz.",
            );
          let times = {};
          const date = data.wedding_date || event.wedding_date;
          if (date) {
            try {
              times = deadlines(date, data.upload_days ?? event.upload_days);
            } catch {
              throw new HttpError(400, "Geçersiz tarih.");
            }
          }
          await weddings.updateOne({ id }, { $set: { ...data, ...times } });
          return json({ ok: true });
        }
      }
      if (path.length === 4 && path[3] === "owner") {
        requireManager(user);
        if (method === "GET")
          return json(
            event.owner_id
              ? await database
                  .collection("users")
                  .findOne(
                    { id: event.owner_id },
                    {
                      projection: {
                        _id: 0,
                        id: 1,
                        email: 1,
                        display_name: 1,
                        must_change_password: 1,
                      },
                    },
                  )
              : null,
          );
        if (method === "POST") {
          if (event.owner_id)
            throw new HttpError(409, "Bu organizasyonun sahibi zaten var.");
          const data = accountInput.parse(await req.json()),
            ownerId = randomUUID();
          const claimed = await weddings.updateOne(
            { id, owner_id: null },
            { $set: { owner_id: ownerId } },
          );
          if (!claimed.modifiedCount)
            throw new HttpError(409, "Sahip hesabı oluşturuluyor.");
          try {
            await database
              .collection("users")
              .insertOne({
                id: ownerId,
                email: data.username,
                display_name: data.display_name,
                ...(await passwordFields(data.password)),
                role: "owner",
                partner_id: event.partner_id,
                owner_event_id: id,
                must_change_password: true,
                disabled: false,
              });
          } catch (e) {
            await weddings.updateOne(
              { id, owner_id: ownerId },
              { $set: { owner_id: null } },
            );
            throw e;
          }
          return json({ id: ownerId }, 201);
        }
      }
      if (path[3] === "media") {
        if (expired(event))
          throw new HttpError(410, "Bu organizasyonun saklama süresi doldu.");
        if (path.length === 4 && method === "GET") {
          const trash = req.nextUrl.searchParams.get("trash") === "1";
          const rows = await media
            .find(
              {
                wedding_id: id,
                deleted_at: trash ? { $ne: null } : null,
                purging: { $ne: true },
                ...(trash
                  ? { purge_at: { $gt: new Date().toISOString() } }
                  : {}),
              },
              { projection: { _id: 0 } },
            )
            .sort({ uploaded_at: -1 })
            .toArray();
          return json(
            rows.map((r) => ({
              ...r,
              storage_path: undefined,
              uploader_session_id: undefined,
              url: `/api/admin/weddings/${id}/media/${r.id}`,
              download_url: `/api/admin/weddings/${id}/media/${r.id}?download=1`,
            })),
          );
        }
        if (path.length === 4 && (method === "DELETE" || method === "PATCH")) {
          const data = z
            .object({ ids: mediaIds, action: z.literal("restore").optional() })
            .parse(await req.json());
          if (method === "DELETE") {
            const now = new Date().toISOString();
            await media.updateMany(
              {
                wedding_id: id,
                id: { $in: data.ids },
                deleted_at: null,
                purging: { $ne: true },
              },
              { $set: { deleted_at: now, purge_at: trashDeadline(event) } },
            );
          } else {
            if (data.action !== "restore")
              throw new HttpError(400, "Geçersiz işlem.");
            await media.updateMany(
              {
                wedding_id: id,
                id: { $in: data.ids },
                deleted_at: { $ne: null },
                purge_at: { $gt: new Date().toISOString() },
                purging: { $ne: true },
              },
              { $set: { deleted_at: null, purge_at: null } },
            );
          }
          return json({ ok: true });
        }
        if (path.length === 5 && method === "GET") {
          const row = await media.findOne({
            id: path[4],
            wedding_id: id,
            deleted_at: null,
            purging: { $ne: true },
          });
          if (!row) throw new HttpError(404, "Dosya bulunamadı.");
          return await mediaResponse(
            row,
            req.nextUrl.searchParams.get("download") === "1",
            req.headers.get("range"),
          );
        }
      }
      if (path.length === 4 && path[3] === "archive" && method === "GET") {
        if (expired(event)) throw new HttpError(410, "Saklama süresi doldu.");
        const selected = req.nextUrl.searchParams.get("ids");
        const ids = selected ? mediaIds.parse(selected.split(",")) : null;
        const rows = await media
          .find({
            wedding_id: id,
            deleted_at: null,
            purging: { $ne: true },
            ...(ids ? { id: { $in: ids } } : {}),
          })
          .toArray();
        if (!rows.length) throw new HttpError(400, "İndirilecek içerik yok.");
        return zipResponse(rows, event);
      }
    }
    if (route === "uploads/sign" && method === "POST") {
      const data = uploadInput.parse(await req.json()),
        event = await weddings.findOne({ id: data.weddingId });
      if (
        !event ||
        !(await database
          .collection("partners")
          .findOne({ id: event.partner_id, active: true }))
      )
        throw new HttpError(404, "Organizasyon bulunamadı.");
      if (!uploadsOpen(event))
        throw new HttpError(410, "Bu organizasyon için yükleme kapalı.");
      if (
        data.size_bytes >
        (data.mime_type.startsWith("image/") ? 15 : 200) * 1024 * 1024
      )
        throw new HttpError(400, "Dosya çok büyük.");
      const tickets = database.collection("upload_tickets");
      if (
        (await tickets.countDocuments({
          weddingId: event.id,
          createdAt: { $gt: new Date(Date.now() - 3600000) },
        })) >= 1000
      )
        throw new HttpError(429, "Yükleme sınırına ulaşıldı.");
      const { client, bucket } = storage(),
        ticket = randomBytes(32).toString("hex"),
        key = `weddings/${event.id}/${randomUUID()}`;
      const seconds = Math.max(
        1,
        Math.min(
          900,
          Math.floor((Date.parse(event.uploads_close_at!) - Date.now()) / 1000),
        ),
      );
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: data.mime_type,
          ContentLength: data.size_bytes,
        }),
        { expiresIn: seconds },
      );
      await tickets.insertOne({
        ...data,
        token: hash(ticket),
        storage_path: key,
        createdAt: new Date(),
        expiresAt: new Date(
          Math.min(Date.now() + 3600000, Date.parse(event.uploads_close_at!)),
        ),
        completed: false,
      });
      return json({ url, ticket });
    }
    if (route === "uploads/complete" && method === "POST") {
      const { ticket } = z
        .object({ ticket: z.string().length(64) })
        .parse(await req.json());
      const t = await database
        .collection("upload_tickets")
        .findOne({ token: hash(ticket), expiresAt: { $gt: new Date() } });
      if (!t) throw new HttpError(400, "Yükleme süresi dolmuş.");
      const event = await weddings.findOne({ id: t.weddingId });
      if (!event || !uploadsOpen(event))
        throw new HttpError(410, "Yükleme kapalı.");
      if (
        !(await database
          .collection("partners")
          .findOne({ id: event.partner_id, active: true }))
      )
        throw new HttpError(410, "Yükleme kapalı.");
      if (await media.findOne({ storage_path: t.storage_path }))
        return json({ ok: true });
      const { client, bucket } = storage(),
        head = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: t.storage_path }),
        );
      if (
        head.ContentLength !== t.size_bytes ||
        head.ContentType !== t.mime_type
      ) {
        await deleteObject(t.storage_path);
        throw new HttpError(400, "Dosya doğrulanamadı.");
      }
      await media.updateOne(
        { storage_path: t.storage_path },
        {
          $setOnInsert: {
            id: randomUUID(),
            wedding_id: event.id,
            type: t.mime_type.startsWith("image/") ? "photo" : "video",
            storage_path: t.storage_path,
            file_name: t.file_name,
            mime_type: t.mime_type,
            size_bytes: t.size_bytes,
            uploader_session_id: t.uploader_session_id,
            guest_name: t.guest_name || "",
            guest_message: t.guest_message || "",
            uploaded_at: new Date().toISOString(),
            deleted_at: null,
            purge_at: null,
          },
        },
        { upsert: true },
      );
      await database
        .collection("upload_tickets")
        .updateOne({ _id: t._id }, { $set: { completed: true } });
      return json({ ok: true });
    }
    throw new HttpError(404, "İşlem bulunamadı.");
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues[0]?.message || "Bilgileri kontrol edin." },
        400,
      );
    if ((error as { code?: number }).code === 11000)
      return json(
        { error: "Kullanıcı adı veya sayfa adresi zaten kullanılıyor." },
        409,
      );
    console.error(
      "API error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json(
      { error: "İşlem tamamlanamadı. Bağlantı ayarlarını kontrol edin." },
      503,
    );
  }
}
