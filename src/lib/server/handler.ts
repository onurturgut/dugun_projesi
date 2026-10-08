import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, mongoClient } from "./db";
import { hash, invalidateSessionCache } from "./auth";
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
import { storage, deleteObject, signedObjectUrl } from "./r2";
import { mediaResponse, zipResponse } from "./media-response";
import { cleanup } from "./maintenance";
import { uploadCover, validateCovers, coverResponse } from "./covers";
import {
  deadlines,
  expired,
  uploadsOpen,
  trashDeadline,
  weddingScope,
} from "@/lib/policy";
import type { Wedding, Media, Account } from "@/lib/models";
import { designSchema } from "@/lib/design";
import { audit } from "./audit";
import {
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotp,
} from "./totp";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
type MediaCursor = { value: string | number; id: string };
const encodeCursor = (cursor: MediaCursor) =>
  Buffer.from(JSON.stringify(cursor)).toString("base64url");
const decodeCursor = (value: string | null): MediaCursor | null => {
  if (!value) return null;
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<MediaCursor>;
    if (
      (typeof cursor.value !== "string" && typeof cursor.value !== "number") ||
      typeof cursor.id !== "string"
    )
      throw new Error();
    return cursor as MediaCursor;
  } catch {
    throw new HttpError(400, "Geçersiz sayfalama bilgisi.");
  }
};
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
  design: w.design,
  can_upload: uploadsOpen(w),
  uploads_close_at: w.uploads_close_at,
});
export async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const requestId = req.headers.get("x-vercel-id") || randomUUID();
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
    if (route === "maintenance" && (method === "GET" || method === "POST")) {
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
      invalidateSessionCache(token);
      jar.delete("wm_session");
      await audit(req, "auth.logout", null);
      return json({ ok: true });
    }
    const user =
      route.startsWith("admin/") ||
      route === "auth/me" ||
      route === "auth/password" ||
      route === "auth/preferences" ||
      route.startsWith("auth/2fa/") ||
      route.startsWith("auth/sessions")
        ? await requireAccount(route === "auth/me" || route === "auth/password")
        : null;
    const database = await db(),
      weddings = database.collection<Wedding>("weddings"),
      media = database.collection<Media>("media");
    if (route === "admin/covers" && method === "POST" && user)
      return json(await uploadCover(req, user), 201);
    if (path.length === 2 && path[0] === "covers" && method === "GET")
      return await coverResponse(path[1]);
    if (route === "auth/login" && method === "POST") {
      const { email, password, totp } = z
        .object({
          email: loginName,
          password: z.string().min(1).max(256),
          totp: z.string().optional(),
        })
        .parse(await req.json());
      const key = hash(email),
        ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          "unknown",
        ipKey = hash(ip),
        attempts = database.collection("login_attempts");
      const since = new Date(Date.now() - 900000);
      const [accountAttempts, ipAttempts] = await Promise.all([
        attempts.countDocuments({ key, createdAt: { $gt: since } }),
        attempts.countDocuments({ ipKey, createdAt: { $gt: since } }),
      ]);
      if (accountAttempts >= 10 || ipAttempts >= 50) {
        await audit(
          req,
          "auth.login_rate_limited",
          null,
          { account_key: key },
          "failure",
        );
        throw new HttpError(
          429,
          "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.",
        );
      }
      await attempts.insertOne({ key, ipKey, createdAt: new Date() });
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
      ) {
        await audit(
          req,
          "auth.login_failed",
          null,
          { account_key: key },
          "failure",
        );
        throw new HttpError(401, "Kullanıcı adı veya şifre hatalı.");
      }
      if (
        account.role !== "platform" &&
        !(await database
          .collection("partners")
          .findOne({ id: account.partner_id, active: true }))
      )
        throw new HttpError(401, "Hesap kullanıma kapalı.");
      if (account.mfa_enabled) {
        if (!totp) return json({ mfa_required: true }, 428);
        if (
          !account.mfa_secret ||
          !verifyTotp(decryptTotpSecret(account.mfa_secret), totp)
        ) {
          await audit(
            req,
            "auth.mfa_failed",
            {
              id: account.id,
              role: account.role,
              partner_id: account.partner_id || null,
            },
            {},
            "failure",
          );
          throw new HttpError(401, "Doğrulama kodu hatalı.");
        }
      }
      await attempts.deleteMany({ key });
      const token = randomBytes(32).toString("hex"),
        expiresAt = new Date(Date.now() + 7 * 86400000);
      await database.collection("sessions").insertOne({
        id: randomUUID(),
        token: hash(token),
        userId: account.id,
        expiresAt,
        createdAt: new Date(),
        lastSeenAt: new Date(),
        userAgent:
          req.headers.get("user-agent")?.slice(0, 500) || "Bilinmeyen cihaz",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      });
      (await cookies()).set("wm_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
      });
      await audit(req, "auth.login", {
        id: account.id,
        role: account.role,
        partner_id: account.partner_id || null,
      });
      return json({
        ok: true,
        must_change_password: !!account.must_change_password,
      });
    }
    if (route === "auth/me" && method === "GET") return json(user);
    if (route === "auth/preferences" && method === "PATCH" && user) {
      const data = z
        .object({ theme: z.enum(["light", "dark", "system"]) })
        .parse(await req.json());
      await database
        .collection("users")
        .updateOne({ id: user.id }, { $set: data });
      invalidateSessionCache();
      return json({ ok: true });
    }
    if (route === "auth/sessions" && method === "GET" && user) {
      const current = hash((await cookies()).get("wm_session")?.value || "");
      const rows = await database
        .collection("sessions")
        .find(
          { userId: user.id, expiresAt: { $gt: new Date() } },
          {
            projection: {
              _id: 0,
              token: 1,
              id: 1,
              createdAt: 1,
              lastSeenAt: 1,
              userAgent: 1,
              ip: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .toArray();
      return json(
        rows
          .filter((row) => row.id || row.token === current)
          .map((row) => ({
            ...row,
            id: row.id || "current",
            current: row.token === current,
            token: undefined,
          })),
      );
    }
    if (
      path.length === 3 &&
      path[0] === "auth" &&
      path[1] === "sessions" &&
      method === "DELETE" &&
      user
    ) {
      const current = hash((await cookies()).get("wm_session")?.value || "");
      const target = await database
        .collection("sessions")
        .findOne({ id: path[2], userId: user.id });
      if (!target) throw new HttpError(404, "Oturum bulunamadı.");
      if (target.token === current)
        throw new HttpError(400, "Geçerli oturumu buradan kapatamazsınız.");
      await database
        .collection("sessions")
        .deleteOne({ id: path[2], userId: user.id });
      invalidateSessionCache();
      await audit(req, "auth.session_revoked", user, { session_id: path[2] });
      return json({ ok: true });
    }
    if (route === "auth/2fa/setup" && method === "POST" && user) {
      requirePlatform(user);
      const secret = createTotpSecret();
      await database
        .collection("users")
        .updateOne(
          { id: user.id },
          { $set: { mfa_pending_secret: encryptTotpSecret(secret) } },
        );
      const issuer = encodeURIComponent("ShineQR");
      const label = encodeURIComponent(`ShineQR:${user.email}`);
      return json({
        secret,
        uri: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`,
      });
    }
    if (route === "auth/2fa/enable" && method === "POST" && user) {
      requirePlatform(user);
      const { code } = z
        .object({ code: z.string().regex(/^\d{6}$/) })
        .parse(await req.json());
      const account = await database
        .collection("users")
        .findOne({ id: user.id });
      if (!account?.mfa_pending_secret)
        throw new HttpError(400, "Önce 2FA kurulumu başlatın.");
      const secret = decryptTotpSecret(account.mfa_pending_secret);
      if (!verifyTotp(secret, code))
        throw new HttpError(400, "Doğrulama kodu hatalı.");
      await database.collection("users").updateOne(
        { id: user.id },
        {
          $set: { mfa_enabled: true, mfa_secret: account.mfa_pending_secret },
          $unset: { mfa_pending_secret: "" },
        },
      );
      invalidateSessionCache();
      await audit(req, "auth.2fa_enabled", user);
      return json({ ok: true });
    }
    if (route === "auth/2fa/disable" && method === "POST" && user) {
      requirePlatform(user);
      const { code } = z
        .object({ code: z.string().regex(/^\d{6}$/) })
        .parse(await req.json());
      const account = await database
        .collection("users")
        .findOne({ id: user.id });
      if (
        !account?.mfa_secret ||
        !verifyTotp(decryptTotpSecret(account.mfa_secret), code)
      )
        throw new HttpError(400, "Doğrulama kodu hatalı.");
      await database.collection("users").updateOne(
        { id: user.id },
        {
          $set: { mfa_enabled: false },
          $unset: { mfa_secret: "", mfa_pending_secret: "" },
        },
      );
      invalidateSessionCache();
      await audit(req, "auth.2fa_disabled", user);
      return json({ ok: true });
    }
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
      await database.collection("users").updateOne(
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
      invalidateSessionCache();
      await audit(req, "auth.password_changed", user, { user_id: user.id });
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
            id: z.string().uuid().optional(),
            logo_url: z.string().max(2048).default(""),
          })
          .parse(await req.json());
        const id = data.id || randomUUID();
        if (data.logo_url) await validateCovers([data.logo_url], id);
        const fields = await passwordFields(data.password);
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            await database.collection("users").insertOne(
              {
                id: randomUUID(),
                email: data.username,
                ...fields,
                role: "partner",
                partner_id: id,
                display_name: data.display_name,
                must_change_password: true,
                disabled: false,
              },
              { session: transaction },
            );
            await database.collection("partners").insertOne(
              {
                id,
                name: data.name,
                logo_url: data.logo_url,
                active: true,
                created_at: new Date().toISOString(),
              },
              { session: transaction },
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "partner.created", user, { partner_id: id });
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
      const data = z
        .object({
          active: z.boolean().optional(),
          logo_url: z.string().max(2048).optional(),
        })
        .refine(
          (value) => value.active !== undefined || value.logo_url !== undefined,
        )
        .parse(await req.json());
      if (path[2] === "platform" && data.active !== undefined)
        throw new HttpError(400, "Platform işletmesi kapatılamaz.");
      const currentPartner = await database
        .collection("partners")
        .findOne({ id: path[2] });
      if (!currentPartner) throw new HttpError(404, "İşletme bulunamadı.");
      if (data.logo_url !== undefined)
        await validateCovers([data.logo_url], path[2]);
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          if (data.logo_url !== undefined)
            await weddings.updateMany(
              {
                partner_id: path[2],
                logo_url: { $in: ["", currentPartner.logo_url || ""] },
              },
              { $set: { logo_url: data.logo_url } },
              { session: transaction },
            );
          await database
            .collection("partners")
            .updateOne(
              { id: path[2] },
              { $set: data },
              { session: transaction },
            );
        });
      } finally {
        await transaction.endSession();
      }
      invalidateSessionCache();
      await audit(req, "partner.updated", user, {
        partner_id: path[2],
        fields: Object.keys(data),
      });
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
    if (route === "admin/audit" && method === "GET" && user) {
      requirePlatform(user);
      const page = Math.max(
        1,
        Number(req.nextUrl.searchParams.get("page")) || 1,
      );
      const limit = 30;
      const collection = database.collection("audit_logs");
      const [items, total] = await Promise.all([
        collection
          .find({}, { projection: { _id: 0 } })
          .sort({ at: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        collection.countDocuments(),
      ]);
      return json({
        items,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      });
    }
    if (route === "admin/weddings" && user) {
      if (method === "GET") {
        const page = Math.max(
          1,
          Number(req.nextUrl.searchParams.get("page")) || 1,
        );
        const limit = Math.min(
          50,
          Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 24),
        );
        const search = (req.nextUrl.searchParams.get("search") || "")
          .trim()
          .slice(0, 100);
        const date = req.nextUrl.searchParams.get("date") || "";
        const status = req.nextUrl.searchParams.get("status") || "all";
        if (!["all", "open", "closed", "expired"].includes(status))
          throw new HttpError(400, "Geçersiz durum filtresi.");
        const now = new Date().toISOString();
        const filter: Record<string, unknown> = {
          ...weddingScope(user),
          ...(date ? { wedding_date: date } : {}),
          ...(search
            ? {
                $or: ["title", "event_type"].map((field) => ({
                  [field]: { $regex: escapeRegex(search), $options: "i" },
                })),
              }
            : {}),
          ...(status === "expired"
            ? { expires_at: { $ne: null, $lte: now } }
            : {}),
          ...(status === "open"
            ? {
                upload_enabled: true,
                uploads_open_at: { $lte: now },
                $and: [
                  {
                    $or: [
                      { uploads_close_at: null },
                      { uploads_close_at: { $gt: now } },
                    ],
                  },
                  { $or: [{ expires_at: null }, { expires_at: { $gt: now } }] },
                ],
              }
            : {}),
          ...(status === "closed"
            ? {
                $and: [
                  {
                    $or: [
                      { upload_enabled: false },
                      { uploads_open_at: { $gt: now } },
                      { uploads_close_at: { $ne: null, $lte: now } },
                    ],
                  },
                  { $or: [{ expires_at: null }, { expires_at: { $gt: now } }] },
                ],
              }
            : {}),
        };
        const [events, total] = await Promise.all([
          weddings
            .find(filter, { projection: { _id: 0 } })
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          weddings.countDocuments(filter),
        ]);
        return json({
          items: events.map((w) => ({
            ...w,
            total: (w.photo_count || 0) + (w.video_count || 0),
            trashed: w.trashed_count || 0,
            size_bytes: w.media_bytes || 0,
            _id: undefined,
          })),
          total,
          page,
          pages: Math.max(1, Math.ceil(total / limit)),
        });
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
          photo_count: 0,
          video_count: 0,
          media_bytes: 0,
          trashed_photo_count: 0,
          trashed_video_count: 0,
          trashed_count: 0,
          trashed_bytes: 0,
          created_at: now,
          ...times,
          logo_url: data.logo_url || partner.logo_url || "",
        };
        await validateCovers(w.cover_images, partner_id);
        await weddings.insertOne(w);
        await audit(req, "wedding.created", user, { wedding_id: w.id });
        return json(w, 201);
      }
    }
    if (path[0] === "admin" && path[1] === "weddings" && path[2] && user) {
      const event = await eventFor(user, path[2]);
      const id = event.id;
      if (path.length === 4 && path[3] === "design" && method === "PUT") {
        const design = designSchema.parse(await req.json());
        const result = await weddings.updateOne(
          { id, ...weddingScope(user) },
          { $set: { design } },
        );
        if (!result.matchedCount)
          throw new HttpError(404, "Organizasyon bulunamadı.");
        return json({ design });
      }
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
          if (data.cover_images)
            await validateCovers(data.cover_images, event.partner_id);
          await weddings.updateOne({ id }, { $set: { ...data, ...times } });
          await audit(req, "wedding.updated", user, {
            wedding_id: id,
            fields: Object.keys(data),
          });
          return json({ ok: true });
        }
      }
      if (path.length === 4 && path[3] === "owner") {
        requireManager(user);
        if (method === "GET")
          return json(
            event.owner_id
              ? await database.collection("users").findOne(
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
          const transaction = (await mongoClient()).startSession();
          try {
            await transaction.withTransaction(async () => {
              const claimed = await weddings.updateOne(
                { id, owner_id: null },
                { $set: { owner_id: ownerId } },
                { session: transaction },
              );
              if (!claimed.modifiedCount)
                throw new HttpError(409, "Bu organizasyonun sahibi zaten var.");
              await database.collection("users").insertOne(
                {
                  id: ownerId,
                  email: data.username,
                  display_name: data.display_name,
                  ...(await passwordFields(data.password)),
                  role: "owner",
                  partner_id: event.partner_id,
                  owner_event_id: id,
                  must_change_password: true,
                  disabled: false,
                },
                { session: transaction },
              );
            });
          } finally {
            await transaction.endSession();
          }
          await audit(req, "owner.created", user, {
            wedding_id: id,
            owner_id: ownerId,
          });
          return json({ id: ownerId }, 201);
        }
      }
      if (path[3] === "media") {
        if (expired(event))
          throw new HttpError(410, "Bu organizasyonun saklama süresi doldu.");
        if (path.length === 4 && method === "GET") {
          const trash = req.nextUrl.searchParams.get("trash") === "1";
          const limit = Math.min(
            60,
            Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 24),
          );
          const kind = req.nextUrl.searchParams.get("type");
          const sort = req.nextUrl.searchParams.get("sort") || "new";
          const search = (req.nextUrl.searchParams.get("search") || "")
            .trim()
            .slice(0, 100);
          if (kind && !["photo", "video"].includes(kind))
            throw new HttpError(400, "Geçersiz medya türü.");
          if (!["new", "old", "size"].includes(sort))
            throw new HttpError(400, "Geçersiz sıralama.");
          const baseFilter: Record<string, unknown> = {
            wedding_id: id,
            deleted_at: trash ? { $ne: null } : null,
            purging: { $ne: true },
            ...(trash ? { purge_at: { $gt: new Date().toISOString() } } : {}),
            ...(kind ? { type: kind } : {}),
            ...(search
              ? {
                  $or: ["guest_name", "guest_message", "file_name"].map(
                    (field) => ({
                      [field]: { $regex: escapeRegex(search), $options: "i" },
                    }),
                  ),
                }
              : {}),
          };
          const cursor = decodeCursor(req.nextUrl.searchParams.get("cursor"));
          const sortField = sort === "size" ? "size_bytes" : "uploaded_at";
          const direction = sort === "old" ? 1 : -1;
          const operator = direction === 1 ? "$gt" : "$lt";
          const cursorFilter = cursor
            ? {
                $or: [
                  { [sortField]: { [operator]: cursor.value } },
                  { [sortField]: cursor.value, id: { [operator]: cursor.id } },
                ],
              }
            : {};
          const summary = trash
            ? {
                photos: event.trashed_photo_count || 0,
                videos: event.trashed_video_count || 0,
                totalBytes: event.trashed_bytes || 0,
              }
            : {
                photos: event.photo_count || 0,
                videos: event.video_count || 0,
                totalBytes: event.media_bytes || 0,
              };
          const unfilteredTotal = summary.photos + summary.videos;
          const [rows, total] = await Promise.all([
            media
              .find(
                { $and: [baseFilter, cursorFilter] },
                { projection: { _id: 0 } },
              )
              .sort({ [sortField]: direction, id: direction })
              .limit(limit + 1)
              .toArray(),
            cursor
              ? Promise.resolve(0)
              : kind || search
                ? media.countDocuments(baseFilter)
                : Promise.resolve(unfilteredTotal),
          ]);
          const hasMore = rows.length > limit;
          const pageRows = rows.slice(0, limit);
          const last = pageRows.at(-1);
          return json({
            items: await Promise.all(
              pageRows.map(async (r) => ({
                ...r,
                storage_path: undefined,
                preview_path: undefined,
                uploader_session_id: undefined,
                url: await signedObjectUrl(r.storage_path),
                preview_url: r.preview_path
                  ? await signedObjectUrl(r.preview_path)
                  : undefined,
                download_url: `/api/admin/weddings/${id}/media/${r.id}?download=1`,
              })),
            ),
            nextCursor:
              hasMore && last
                ? encodeCursor({
                    value: last[sortField as "uploaded_at" | "size_bytes"],
                    id: last.id,
                  })
                : null,
            total,
            summary,
          });
        }
        if (path.length === 4 && (method === "DELETE" || method === "PATCH")) {
          const data = z
            .object({
              ids: mediaIds,
              action: z.enum(["restore", "purge"]).optional(),
            })
            .parse(await req.json());
          if (method === "DELETE") {
            const now = new Date().toISOString();
            const affected = await media
              .find(
                {
                  wedding_id: id,
                  id: { $in: data.ids },
                  deleted_at: null,
                  purging: { $ne: true },
                },
                { projection: { type: 1, size_bytes: 1 } },
              )
              .toArray();
            const result = await media.updateMany(
              {
                wedding_id: id,
                id: { $in: data.ids },
                deleted_at: null,
                purging: { $ne: true },
              },
              { $set: { deleted_at: now, purge_at: trashDeadline(event) } },
            );
            if (result.modifiedCount) {
              const photos = affected.filter(
                (row) => row.type === "photo",
              ).length;
              const videos = affected.length - photos;
              const bytes = affected.reduce(
                (sum, row) => sum + row.size_bytes,
                0,
              );
              await weddings.updateOne(
                { id },
                {
                  $inc: {
                    photo_count: -photos,
                    video_count: -videos,
                    media_bytes: -bytes,
                    trashed_photo_count: photos,
                    trashed_video_count: videos,
                    trashed_count: affected.length,
                    trashed_bytes: bytes,
                  },
                },
              );
            }
          } else if (data.action === "restore") {
            const affected = await media
              .find(
                {
                  wedding_id: id,
                  id: { $in: data.ids },
                  deleted_at: { $ne: null },
                  purge_at: { $gt: new Date().toISOString() },
                  purging: { $ne: true },
                },
                { projection: { type: 1, size_bytes: 1 } },
              )
              .toArray();
            const result = await media.updateMany(
              {
                wedding_id: id,
                id: { $in: data.ids },
                deleted_at: { $ne: null },
                purge_at: { $gt: new Date().toISOString() },
                purging: { $ne: true },
              },
              { $set: { deleted_at: null, purge_at: null } },
            );
            if (result.modifiedCount) {
              const photos = affected.filter(
                (row) => row.type === "photo",
              ).length;
              const videos = affected.length - photos;
              const bytes = affected.reduce(
                (sum, row) => sum + row.size_bytes,
                0,
              );
              await weddings.updateOne(
                { id },
                {
                  $inc: {
                    photo_count: photos,
                    video_count: videos,
                    media_bytes: bytes,
                    trashed_photo_count: -photos,
                    trashed_video_count: -videos,
                    trashed_count: -affected.length,
                    trashed_bytes: -bytes,
                  },
                },
              );
            }
          } else if (data.action === "purge") {
            const affected = await media
              .find({
                wedding_id: id,
                id: { $in: data.ids },
                deleted_at: { $ne: null },
                purging: { $ne: true },
              })
              .toArray();
            let photos = 0,
              videos = 0,
              bytes = 0;
            const failures: string[] = [];
            for (const row of affected) {
              const claimed = await media.findOneAndUpdate(
                {
                  id: row.id,
                  wedding_id: id,
                  deleted_at: { $ne: null },
                  purging: { $ne: true },
                },
                { $set: { purging: true } },
                { returnDocument: "after" },
              );
              if (!claimed) continue;
              try {
                await deleteObject(row.storage_path);
                if (row.preview_path) await deleteObject(row.preview_path);
                await media.deleteOne({
                  id: row.id,
                  wedding_id: id,
                  purging: true,
                });
                if (row.type === "photo") photos++;
                else videos++;
                bytes += row.size_bytes;
              } catch {
                failures.push(row.id);
              }
            }
            const deleted = photos + videos;
            if (deleted)
              await weddings.updateOne(
                { id },
                {
                  $inc: {
                    trashed_photo_count: -photos,
                    trashed_video_count: -videos,
                    trashed_count: -deleted,
                    trashed_bytes: -bytes,
                  },
                },
              );
            if (failures.length)
              throw new HttpError(
                503,
                `${failures.length} içerik depolamadan silinemedi; worker yeniden deneyecek.`,
              );
          } else {
            throw new HttpError(400, "Geçersiz işlem.");
          }
          await audit(
            req,
            method === "DELETE"
              ? "media.trashed"
              : data.action === "restore"
                ? "media.restored"
                : "media.purged",
            user,
            { wedding_id: id, media_ids: data.ids },
          );
          return json({ ok: true });
        }
        if (path.length === 5 && method === "GET") {
          const trashPreview =
            req.nextUrl.searchParams.get("trash_preview") === "1";
          if (trashPreview && req.nextUrl.searchParams.get("download") === "1")
            throw new HttpError(
              400,
              "İndirmek için içeriği önce albüme geri alın.",
            );
          const row = await media.findOne({
            id: path[4],
            wedding_id: id,
            deleted_at: trashPreview ? { $ne: null } : null,
            purging: { $ne: true },
            ...(trashPreview
              ? { purge_at: { $gt: new Date().toISOString() } }
              : {}),
          });
          if (!row) throw new HttpError(404, "Dosya bulunamadı.");
          return await mediaResponse(
            row,
            req.nextUrl.searchParams.get("download") === "1",
            req.headers.get("range"),
          );
        }
        if (path.length === 6 && path[5] === "preview" && method === "GET") {
          const trashPreview =
            req.nextUrl.searchParams.get("trash_preview") === "1";
          const row = await media.findOne({
            id: path[4],
            wedding_id: id,
            deleted_at: trashPreview ? { $ne: null } : null,
            purging: { $ne: true },
            preview_path: { $type: "string" },
            ...(trashPreview
              ? { purge_at: { $gt: new Date().toISOString() } }
              : {}),
          });
          if (!row?.preview_path)
            throw new HttpError(404, "Önizleme bulunamadı.");
          return mediaResponse(
            {
              ...row,
              storage_path: row.preview_path,
              mime_type: row.preview_mime_type || "image/webp",
              file_name: `${row.id}.webp`,
            },
            false,
            req.headers.get("range"),
            "private, max-age=86400, immutable",
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
      if (
        path.length === 4 &&
        path[3] === "archive-jobs" &&
        method === "POST"
      ) {
        const existing = await database.collection("archive_jobs").findOne({
          wedding_id: id,
          requested_by: user.id,
          status: { $in: ["pending", "processing"] },
        });
        if (existing) return json({ id: existing.id, status: existing.status });
        const jobId = randomUUID();
        await database.collection("archive_jobs").insertOne({
          id: jobId,
          wedding_id: id,
          requested_by: user.id,
          status: "pending",
          storage_path: `archives/${id}/${jobId}.zip`,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60_000),
        });
        await audit(req, "archive.requested", user, {
          wedding_id: id,
          job_id: jobId,
        });
        return json({ id: jobId, status: "pending" }, 202);
      }
      if (path.length === 5 && path[3] === "archive-jobs" && method === "GET") {
        const job = await database
          .collection("archive_jobs")
          .findOne({ id: path[4], wedding_id: id, requested_by: user.id });
        if (!job) throw new HttpError(404, "Arşiv işi bulunamadı.");
        return json({
          id: job.id,
          status: job.status,
          error: job.error || null,
          file_count: job.file_count || 0,
          url:
            job.status === "ready"
              ? await signedObjectUrl(job.storage_path, 900)
              : null,
        });
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
      const mediaType = t.mime_type.startsWith("image/") ? "photo" : "video";
      const inserted = await media.updateOne(
        { storage_path: t.storage_path },
        {
          $setOnInsert: {
            id: randomUUID(),
            wedding_id: event.id,
            type: mediaType,
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
            processing_status: "pending",
            processing_attempts: 0,
          },
        },
        { upsert: true },
      );
      if (inserted.upsertedCount)
        await weddings.updateOne(
          { id: event.id },
          {
            $inc: {
              photo_count: mediaType === "photo" ? 1 : 0,
              video_count: mediaType === "video" ? 1 : 0,
              media_bytes: t.size_bytes,
            },
          },
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
      JSON.stringify({
        level: "error",
        request_id: requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        at: new Date().toISOString(),
      }),
    );
    return json(
      {
        error: "İşlem tamamlanamadı. Bağlantı ayarlarını kontrol edin.",
        request_id: requestId,
      },
      503,
    );
  }
}
