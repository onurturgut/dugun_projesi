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
  requirePermission,
  requireMediaPermission,
  eventFor,
} from "./access";
import {
  eventInput,
  eventDraftInput,
  eventPublishInput,
  approvalDecisionInput,
  accountInput,
  loginName,
  passwordSchema,
  mediaIds,
  uploadInput,
  agentNames,
  agentReportInput,
  agentReportReviewInput,
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
import type { Wedding, Media, Account, SaleRecord, AddOnProduct, AgentReport } from "@/lib/models";
import { designSchema } from "@/lib/design";
import { weddingImageBelongsToEvent } from "@/lib/wedding-templates";
import { audit } from "./audit";
import {
  commissionSnapshot,
  FAIR_USE_POLICY,
  GIB,
  istanbulCalendarMonth,
  packageSnapshot,
  packageStorageLimit,
  packageUploadDays,
  priceSnapshot,
  storageBytesInUse,
  type PackageCode,
  type PackagePolicy,
} from "@/lib/commercial-policy";
import { effectiveStaffRole } from "@/lib/access-control";
import { sendPasswordResetEmail } from "./email";
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
        token = jar.get("wm_session")?.value,
        previewToken = jar.get("wm_preview")?.value;
      if (token)
        await (
          await db()
        )
          .collection("sessions")
          .deleteOne({ token: hash(token) });
      invalidateSessionCache(token);
      if (previewToken)
        await (await db()).collection("sessions").deleteOne({ token: hash(previewToken), preview: true });
      jar.delete("wm_session");
      jar.delete("wm_preview");
      await audit(req, "auth.logout", null);
      return json({ ok: true });
    }
    const user =
      route.startsWith("admin/") ||
      route === "auth/me" ||
      route === "auth/password" ||
      route === "auth/preferences" ||
      route === "auth/preview-stop" ||
      route.startsWith("auth/2fa/") ||
      route.startsWith("auth/sessions")
        ? await requireAccount(route === "auth/me" || route === "auth/password" || route === "auth/preferences" || route === "auth/preview-stop")
        : null;
    if (user?.preview_read_only && !["GET", "HEAD"].includes(method) && route !== "auth/preview-stop")
      throw new HttpError(403, "Hesap önizlemesi salt okunurdur.");
    const database = await db(),
      weddings = database.collection<Wedding>("weddings"),
      media = database.collection<Media>("media");
    if (route === "auth/preview-stop" && method === "POST" && user) {
      const jar = await cookies();
      const previewToken = jar.get("wm_preview")?.value;
      const previewSession = previewToken ? await database.collection("sessions").findOne({ token: hash(previewToken), preview: true }) : null;
      if (previewToken) await database.collection("sessions").deleteOne({ token: hash(previewToken), preview: true });
      jar.delete("wm_preview");
      invalidateSessionCache();
      if (previewSession)
        await audit(req, "account.preview_stopped", { id: String(previewSession.actorUserId), role: "platform", partner_id: null }, { target_user_id: previewSession.targetUserId });
      return json({ ok: true });
    }
    if (route === "admin/covers" && method === "POST" && user)
      return json(await uploadCover(req, user), 201);
    if (path.length === 2 && path[0] === "covers" && method === "GET")
      return await coverResponse(path[1]);
    if (route === "auth/login" && method === "POST") {
      const { email, password, totp, remember } = z
        .object({
          email: loginName,
          password: z.string().min(1).max(256),
          totp: z.string().optional(),
          remember: z.boolean().default(false),
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
        expiresAt = new Date(Date.now() + (remember ? 30 : 1) * 86400000),
        idleExpiresAt = new Date(Date.now() + 30 * 60_000);
      await database.collection("sessions").insertOne({
        id: randomUUID(),
        token: hash(token),
        userId: account.id,
        expiresAt,
        idleExpiresAt,
        remember,
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
        ...(remember ? { expires: expiresAt } : {}),
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
    if (route === "auth/forgot-password" && method === "POST") {
      const { email } = z.object({ email: loginName }).parse(await req.json());
      const account = await database.collection("users").findOne({ email, disabled: { $ne: true } });
      if (account) {
        const rawToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 60_000);
        await database.collection("password_reset_tokens").deleteMany({ userId: account.id });
        const reset = { id: randomUUID(), userId: account.id, token: hash(rawToken), createdAt: new Date(), expiresAt, usedAt: null, delivery: "pending" };
        await database.collection("password_reset_tokens").insertOne(reset);
        const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        try {
          const delivery = await sendPasswordResetEmail(account.email, `${base}/auth/reset-password?token=${rawToken}`);
          await database.collection("password_reset_tokens").updateOne({ id: reset.id }, { $set: { delivery: delivery.delivered ? "sent" : delivery.reason } });
        } catch {
          await database.collection("password_reset_tokens").updateOne({ id: reset.id }, { $set: { delivery: "failed" } });
        }
        await audit(req, "auth.password_reset_requested", { id: account.id, role: account.role, partner_id: account.partner_id || null });
      }
      return json({ ok: true, message: "Hesap uygunsa parola yenileme bağlantısı gönderildi." });
    }
    if (route === "auth/reset-password" && method === "POST") {
      const data = z.object({ token: z.string().min(32).max(256), password: passwordSchema }).parse(await req.json());
      const tokenHash = hash(data.token);
      const reset = await database.collection("password_reset_tokens").findOne({ token: tokenHash, usedAt: null, expiresAt: { $gt: new Date() } });
      if (!reset) throw new HttpError(400, "Parola yenileme bağlantısı geçersiz veya süresi dolmuş.");
      const account = await database.collection("users").findOne({ id: reset.userId, disabled: { $ne: true } });
      if (!account) throw new HttpError(400, "Parola yenileme bağlantısı geçersiz veya süresi dolmuş.");
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          const claimed = await database.collection("password_reset_tokens").updateOne({ _id: reset._id, usedAt: null }, { $set: { usedAt: new Date() } }, { session: transaction });
          if (!claimed.modifiedCount) throw new HttpError(409, "Bu bağlantı daha önce kullanılmış.");
          await database.collection("users").updateOne({ id: account.id }, { $set: { ...(await passwordFields(data.password)), must_change_password: false } }, { session: transaction });
          await database.collection("sessions").deleteMany({ userId: account.id }, { session: transaction });
        });
      } finally {
        await transaction.endSession();
      }
      invalidateSessionCache();
      await audit(req, "auth.password_reset_completed", { id: account.id, role: account.role, partner_id: account.partner_id || null });
      return json({ ok: true });
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
            .find({
              purged_at: null,
              lifecycle_status: { $nin: ["draft", "archived"] },
            })
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
      const w = await weddings.findOne({
        slug: path[2],
        lifecycle_status: { $nin: ["draft", "archived"] },
      });
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
                staff_role: "partner_owner",
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
      user
    ) {
      requirePlatform(user);
      if (method === "GET") {
        const partner = await database.collection("partners").findOne(
          { id: path[2] },
          { projection: { _id: 0 } },
        );
        if (!partner) throw new HttpError(404, "İşletme bulunamadı.");
        const [events, accounts, activity] = await Promise.all([
          weddings.find(
            { partner_id: path[2] },
            { projection: { _id: 0, id: 1, title: 1, lifecycle_status: 1, wedding_date: 1, photo_count: 1, video_count: 1, media_bytes: 1 } },
          ).sort({ created_at: -1 }).limit(50).toArray(),
          database.collection("users").find(
            { partner_id: path[2], role: { $in: ["partner", "owner"] } },
            { projection: { _id: 0, password_hash: 0, password_salt: 0, mfa_secret: 0 } },
          ).sort({ display_name: 1 }).toArray(),
          database.collection("audit_logs").find(
            { $or: [{ "target.partner_id": path[2] }, { actor_partner_id: path[2] }] },
            { projection: { _id: 0 } },
          ).sort({ at: -1 }).limit(20).toArray(),
        ]);
        return json({ partner, events, accounts, activity });
      }
      if (method !== "PATCH") throw new HttpError(405, "Yöntem desteklenmiyor.");
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
    if (route === "admin/agent-reports" && user) {
      const reports = database.collection<AgentReport>("agent_reports");
      if (method === "GET") {
        requirePermission(user, "agent.report.view");
        const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 25));
        const status = req.nextUrl.searchParams.get("status");
        const reviewStatus = req.nextUrl.searchParams.get("review_status");
        const agentName = req.nextUrl.searchParams.get("agent_name");
        const search = req.nextUrl.searchParams.get("search")?.trim();
        const filter: Record<string, unknown> = {};
        if (status && ["complete", "needs-review", "blocked"].includes(status)) filter.status = status;
        if (reviewStatus && ["pending", "approved", "changes_requested", "rejected"].includes(reviewStatus)) filter.review_status = reviewStatus;
        if (agentName && agentNames.includes(agentName as (typeof agentNames)[number])) filter.agent_name = agentName;
        if (search) filter.$or = [
          { task_title: { $regex: escapeRegex(search), $options: "i" } },
          { run_id: search },
          { change_ref: { $regex: escapeRegex(search), $options: "i" } },
        ];
        const [items, total, summaryRows] = await Promise.all([
          reports.find(filter, { projection: { _id: 0 } }).sort({ created_at: -1, id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
          reports.countDocuments(filter),
          reports.aggregate<{ total: number; pending: number; blocked: number; critical: number; failed_checks: number }>([
            { $group: {
              _id: null,
              total: { $sum: 1 },
              pending: { $sum: { $cond: [{ $eq: ["$review_status", "pending"] }, 1, 0] } },
              blocked: { $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] } },
              critical: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: "$findings", as: "finding", cond: { $eq: ["$$finding.severity", "critical"] } } } }, 0] }, 1, 0] } },
              failed_checks: { $sum: { $size: { $filter: { input: "$verification", as: "check", cond: { $eq: ["$$check.result", "failed"] } } } } },
            } },
            { $project: { _id: 0 } },
          ]).toArray(),
        ]);
        return json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), summary: summaryRows[0] || { total: 0, pending: 0, blocked: 0, critical: 0, failed_checks: 0 } });
      }
      if (method === "POST") {
        requirePermission(user, "agent.report.manage");
        const input = agentReportInput.parse(await req.json());
        const now = new Date().toISOString();
        const report: AgentReport = {
          id: randomUUID(), ...input, review_status: "pending", reviews: [],
          created_at: now, created_by: user.id, updated_at: now,
        };
        const inserted = await reports.updateOne(
          { run_id: report.run_id, agent_name: report.agent_name },
          { $setOnInsert: report },
          { upsert: true },
        );
        const stored = await reports.findOne({ run_id: report.run_id, agent_name: report.agent_name }, { projection: { _id: 0 } });
        if (inserted.upsertedCount)
          await audit(req, "agent_report.created", user, { report_id: report.id, run_id: report.run_id, agent_name: report.agent_name, recommendation: report.recommendation });
        return json(stored, inserted.upsertedCount ? 201 : 200);
      }
    }
    if (path.length === 3 && path[0] === "admin" && path[1] === "agent-reports" && method === "GET" && user) {
      requirePermission(user, "agent.report.view");
      const report = await database.collection<AgentReport>("agent_reports").findOne({ id: path[2] }, { projection: { _id: 0 } });
      if (!report) throw new HttpError(404, "Agent raporu bulunamadı.");
      return json(report);
    }
    if (path.length === 4 && path[0] === "admin" && path[1] === "agent-reports" && path[3] === "review" && method === "POST" && user) {
      requirePermission(user, "agent.report.manage");
      const input = agentReportReviewInput.parse(await req.json());
      const now = new Date().toISOString();
      const review = { id: randomUUID(), decision: input.decision, note: input.note, reviewed_at: now, reviewed_by: user.id };
      const result = await database.collection<AgentReport>("agent_reports").findOneAndUpdate(
        { id: path[2] },
        { $set: { review_status: input.decision, updated_at: now }, $push: { reviews: review } },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!result) throw new HttpError(404, "Agent raporu bulunamadı.");
      await audit(req, "agent_report.reviewed", user, { report_id: path[2], decision: input.decision, review_id: review.id });
      return json(result);
    }
    if (route === "admin/accounts" && user) {
      requireManager(user);
      const scope = user.role === "platform" ? {} : { partner_id: user.partner_id };
      if (method === "GET") {
        return json(await database.collection("users").find(
          { ...scope, role: { $in: ["partner", "owner"] } },
          { projection: { _id: 0, id: 1, email: 1, display_name: 1, role: 1, partner_id: 1, owner_event_id: 1, disabled: 1, media_permissions: 1 } },
        ).sort({ display_name: 1 }).toArray());
      }
      if (method === "POST") {
        const data = accountInput.extend({
          partner_id: z.string().min(1).max(100).optional(),
          media_permissions: z.object({ view: z.boolean(), download: z.boolean(), manage: z.boolean(), archive: z.boolean() }),
        }).parse(await req.json());
        const partner_id = user.role === "platform" ? data.partner_id || "platform" : user.partner_id!;
        const id = randomUUID();
        await database.collection("users").insertOne({
          id, email: data.username, display_name: data.display_name,
          ...(await passwordFields(data.password)), role: "partner", staff_role: "partner_sales", partner_id,
          media_permissions: data.media_permissions, must_change_password: true, disabled: false,
        });
        await audit(req, "account.created", user, { user_id: id, partner_id });
        return json({ id }, 201);
      }
    }
    if (path.length === 3 && path[0] === "admin" && path[1] === "accounts" && method === "PATCH" && user) {
      requireManager(user);
      if (path[2] === user.id) throw new HttpError(400, "Kendi hesabınızı buradan değiştiremezsiniz.");
      const target = await database.collection("users").findOne({ id: path[2], ...(user.role === "platform" ? {} : { partner_id: user.partner_id }), role: { $in: ["partner", "owner"] } });
      if (!target) throw new HttpError(404, "Hesap bulunamadı.");
      const changes = z.object({
        disabled: z.boolean().optional(),
        media_permissions: z.object({ view: z.boolean(), download: z.boolean(), manage: z.boolean(), archive: z.boolean() }).optional(),
      }).refine((value) => Object.keys(value).length > 0).parse(await req.json());
      await database.collection("users").updateOne({ id: target.id }, { $set: changes });
      invalidateSessionCache();
      if (changes.disabled !== undefined)
        await database.collection("sessions").deleteMany({ userId: target.id });
      await audit(req, "account.updated", user, { user_id: target.id, fields: Object.keys(changes) });
      return json({ ok: true });
    }
    if (path.length === 4 && path[0] === "admin" && path[1] === "accounts" && path[3] === "reset-password" && method === "POST" && user) {
      requireManager(user);
      if (path[2] === user.id) throw new HttpError(400, "Kendi parolanızı hesap ayarlarından değiştirin.");
      const target = await database.collection("users").findOne({ id: path[2], ...(user.role === "platform" ? {} : { partner_id: user.partner_id }), role: { $in: ["partner", "owner"] } });
      if (!target) throw new HttpError(404, "Hesap bulunamadı.");
      const data = z.object({ password: passwordSchema }).parse(await req.json());
      await database.collection("users").updateOne({ id: target.id }, { $set: { ...(await passwordFields(data.password)), must_change_password: true } });
      await database.collection("sessions").deleteMany({ userId: target.id });
      invalidateSessionCache();
      await audit(req, "account.password_reset", user, { user_id: target.id, partner_id: target.partner_id });
      return json({ ok: true });
    }
    if (path.length === 4 && path[0] === "admin" && path[1] === "accounts" && path[3] === "preview" && method === "POST" && user) {
      requirePermission(user, "account.impersonate_readonly");
      const target = await database.collection("users").findOne({
        id: path[2],
        role: { $in: ["partner", "owner"] },
        disabled: { $ne: true },
      });
      if (!target) throw new HttpError(404, "Önizlenecek hesap bulunamadı.");
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 60_000);
      await database.collection("sessions").insertOne({
        id: randomUUID(), token: hash(token), preview: true,
        actorUserId: user.id, actorDisplayName: user.display_name,
        targetUserId: target.id, expiresAt, createdAt: new Date(),
      });
      (await cookies()).set("wm_preview", token, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
        path: "/", expires: expiresAt,
      });
      invalidateSessionCache();
      await audit(req, "account.preview_started", user, { target_user_id: target.id });
      return json({ ok: true });
    }
    if (route === "admin/partner-overview" && method === "GET" && user) {
      requireManager(user);
      const weddingFilter = user.role === "platform" ? {} : { partner_id: user.partner_id! };
      const accountFilter = user.role === "platform" ? { role: { $in: ["partner", "owner"] } } : { partner_id: user.partner_id!, role: { $in: ["partner", "owner"] } };
      const [eventRows, accounts] = await Promise.all([
        weddings.find(weddingFilter, { projection: { _id: 0, id: 1, partner_id: 1, lifecycle_status: 1, photo_count: 1, video_count: 1, media_bytes: 1 } }).toArray(),
        database.collection("users").find(accountFilter, { projection: { _id: 0, id: 1, role: 1, partner_id: 1, disabled: 1 } }).toArray(),
      ]);
      const grouped = new Map<string, { partner_id: string; events: number; customers: number; accounts: number; media: number; bytes: number }>();
      for (const row of eventRows) {
        const value = grouped.get(row.partner_id) || { partner_id: row.partner_id, events: 0, customers: 0, accounts: 0, media: 0, bytes: 0 };
        value.events++; value.media += (row.photo_count || 0) + (row.video_count || 0); value.bytes += row.media_bytes || 0; grouped.set(row.partner_id, value);
      }
      for (const account of accounts) {
        const key = account.partner_id || "platform";
        const value = grouped.get(key) || { partner_id: key, events: 0, customers: 0, accounts: 0, media: 0, bytes: 0 };
        value.accounts++; if (account.role === "owner") value.customers++; grouped.set(key, value);
      }
      return json({ items: [...grouped.values()], relationship_model: "one-owner-per-event", usage_rights: { enforcement: "not-configured", reason: "Paket ve kota iş kuralları doğrulanmadı." } });
    }
    if (route === "admin/add-ons" && user) {
      const products = database.collection<AddOnProduct>("add_on_products");
      if (method === "GET") {
        if (user.role !== "platform") requirePermission(user, "design.select");
        return json(await products.find(user.role === "platform" ? {} : { active: true }, { projection: { _id: 0 } }).sort({ active: -1, name: 1 }).toArray());
      }
      requireManager(user);
      if (method === "POST") {
        requirePlatform(user);
        const input = z.object({
          name: z.string().trim().min(2).max(120),
          description: z.string().trim().max(500).default(""),
          gross_price_cents: z.number().int().min(1).max(100_000_000),
          commissionable: z.boolean().default(true),
          active: z.boolean().default(true),
        }).parse(await req.json());
        const now = new Date().toISOString();
        const product: AddOnProduct = { id: randomUUID(), ...input, created_at: now, updated_at: now };
        await products.insertOne(product);
        await audit(req, "add_on.created", user, { product_id: product.id, gross_price_cents: product.gross_price_cents });
        return json(product, 201);
      }
    }
    if (path.length === 3 && path[0] === "admin" && path[1] === "add-ons" && method === "PATCH" && user) {
      requirePlatform(user);
      const changes = z.object({
        name: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().max(500).optional(),
        gross_price_cents: z.number().int().min(1).max(100_000_000).optional(),
        commissionable: z.boolean().optional(),
        active: z.boolean().optional(),
      }).refine((value) => Object.keys(value).length > 0, "En az bir alan değiştirilmeli.").parse(await req.json());
      const result = await database.collection<AddOnProduct>("add_on_products").findOneAndUpdate(
        { id: path[2] },
        { $set: { ...changes, updated_at: new Date().toISOString() } },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!result) throw new HttpError(404, "Ek ürün bulunamadı.");
      await audit(req, "add_on.updated", user, { product_id: path[2], fields: Object.keys(changes) });
      return json(result);
    }
    if (route === "admin/sales" && user) {
      const sales = database.collection<SaleRecord>("sales");
      if (method === "GET") {
        requirePermission(user, user.role === "platform" ? "finance.view_all" : "finance.view_own");
        const scope = user.role === "platform" ? {} : { partner_id: user.partner_id! };
        const [items, totals] = await Promise.all([
          sales.find(scope, { projection: { _id: 0 } }).sort({ occurred_at: -1 }).limit(250).toArray(),
          sales.aggregate([{ $match: scope }, { $group: {
            _id: null,
            paid_sales: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
            gross_cents: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$gross_cents", 0] } },
            net_cents: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$net_cents", 0] } },
            commission_cents: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$commission_cents", 0] } },
            platform_cents: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$platform_cents", 0] } },
          } }]).next(),
        ]);
        return json({ items, totals: totals || { paid_sales: 0, gross_cents: 0, net_cents: 0, commission_cents: 0, platform_cents: 0 } });
      }
      if (method === "POST") {
        requirePermission(user, "commission.manage");
        const input = z.object({
          wedding_id: z.string().uuid(),
          idempotency_key: z.string().trim().min(8).max(120),
          vat_rate_bps: z.number().int().min(0).max(10_000).default(2000),
          occurred_at: z.string().datetime().optional(),
        }).parse(await req.json());
        const existing = await sales.findOne({ idempotency_key: input.idempotency_key }, { projection: { _id: 0 } });
        if (existing) return json(existing);
        const event = await weddings.findOne({ id: input.wedding_id, approval_status: "approved" });
        if (!event?.package_code) throw new HttpError(409, "Onaylı paket bilgisi bulunan bir organizasyon gerekli.");
        const occurredAt = input.occurred_at || new Date().toISOString();
        const period = istanbulCalendarMonth(occurredAt);
        const selectedPackage = packageSnapshot(event.package_code);
        const transaction = (await mongoClient()).startSession();
        let created: SaleRecord | null = null;
        try {
          await transaction.withTransaction(async () => {
            let ordinal: number | null = null;
            if (selectedPackage.qualifiesForVolumeCommission) {
              const counter = await database.collection("monthly_sales_counters").findOneAndUpdate(
                { partner_id: event.partner_id, period },
                { $setOnInsert: { partner_id: event.partner_id, period, refunded_count: 0 }, $inc: { paid_count: 1, net_count: 1 }, $set: { updated_at: new Date().toISOString() } },
                { upsert: true, returnDocument: "after", session: transaction },
              );
              ordinal = Number(counter?.net_count || 1);
            }
            const pricing = event.price_snapshot || priceSnapshot(event.package_code!, [], []);
            const snapshot = commissionSnapshot(event.package_code!, ordinal, input.vat_rate_bps, pricing);
            created = {
              id: randomUUID(), idempotency_key: input.idempotency_key,
              partner_id: event.partner_id, wedding_id: event.id, package_code: event.package_code!,
              status: "paid", period, occurred_at: occurredAt, recorded_at: new Date().toISOString(), recorded_by: user.id,
              net_cents: snapshot.netCents, vat_rate_bps: snapshot.vatRateBps,
              vat_cents: snapshot.grossCents - snapshot.netCents, gross_cents: snapshot.grossCents,
              qualifying_ordinal: snapshot.qualifyingOrdinal, commission_rate_bps: snapshot.commissionRateBps,
              commission_cents: snapshot.commissionCents, platform_cents: snapshot.netCents - snapshot.commissionCents,
              price_snapshot: pricing,
              refunded_at: null, refunded_by: null,
            };
            await sales.insertOne(created, { session: transaction });
            await database.collection("commission_ledger").insertOne({
              id: randomUUID(), sale_id: created.id, partner_id: created.partner_id, type: "accrual",
              amount_cents: created.commission_cents, period, created_at: created.recorded_at, created_by: user.id,
            }, { session: transaction });
          });
        } finally { await transaction.endSession(); }
        await audit(req, "sale.recorded", user, { sale_id: created!.id, wedding_id: event.id });
        return json(created, 201);
      }
    }
    if (path.length === 4 && path[0] === "admin" && path[1] === "sales" && path[3] === "refund" && method === "POST" && user) {
      requirePermission(user, "commission.manage");
      const reason = z.object({ reason: z.string().trim().min(3).max(500) }).parse(await req.json()).reason;
      const sales = database.collection<SaleRecord>("sales");
      const transaction = (await mongoClient()).startSession();
      let refunded: SaleRecord | null = null;
      try {
        await transaction.withTransaction(async () => {
          const now = new Date().toISOString();
          refunded = await sales.findOneAndUpdate(
            { id: path[2], status: "paid" },
            { $set: { status: "refunded", refunded_at: now, refunded_by: user.id, refund_reason: reason } },
            { returnDocument: "after", session: transaction },
          );
          if (!refunded) throw new HttpError(409, "Satış bulunamadı veya daha önce iade edildi.");
          await database.collection("commission_ledger").insertOne({
            id: randomUUID(), sale_id: refunded.id, partner_id: refunded.partner_id, type: "reversal",
            amount_cents: -refunded.commission_cents, period: refunded.period, reason, created_at: now, created_by: user.id,
          }, { session: transaction });
          if (refunded.qualifying_ordinal !== null)
            await database.collection("monthly_sales_counters").updateOne(
              { partner_id: refunded.partner_id, period: refunded.period },
              { $inc: { refunded_count: 1, net_count: -1 }, $set: { updated_at: now } },
              { session: transaction },
            );
        });
      } finally { await transaction.endSession(); }
      await audit(req, "sale.refunded", user, { sale_id: refunded!.id, reason });
      return json(refunded);
    }
    if (route === "admin/operations" && method === "GET" && user) {
      requirePlatform(user);
      const now = new Date().toISOString();
      const [mediaTotals, processingFailures, retentionDue, archiveFailures, archiveActive, sample, failedMedia, failedArchives, dueItems, quotaRows] = await Promise.all([
        database.collection("media").aggregate([{ $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: "$size_bytes" } } }]).next(),
        database.collection("media").countDocuments({ processing_status: "failed" }),
        database.collection("media").countDocuments({ purge_at: { $lte: now } }),
        database.collection("archive_jobs").countDocuments({ status: "failed" }),
        database.collection("archive_jobs").countDocuments({ status: { $in: ["pending", "processing"] } }),
        database.collection("media").find({ purging: { $ne: true } }, { projection: { _id: 0, id: 1, storage_path: 1, wedding_id: 1 } }).sort({ uploaded_at: -1 }).limit(30).toArray(),
        database.collection("media").find({ processing_status: "failed" }, { projection: { _id: 0, id: 1, wedding_id: 1, original_name: 1, processing_error: 1, uploaded_at: 1 } }).sort({ uploaded_at: -1 }).limit(30).toArray(),
        database.collection("archive_jobs").find({ status: "failed" }, { projection: { _id: 0, id: 1, wedding_id: 1, error: 1, created_at: 1 } }).sort({ created_at: -1 }).limit(30).toArray(),
        database.collection("media").find({ purge_at: { $lte: now }, purging: { $ne: true } }, { projection: { _id: 0, id: 1, wedding_id: 1, original_name: 1, purge_at: 1 } }).sort({ purge_at: 1 }).limit(30).toArray(),
        weddings.find(
          { purged_at: null, package_snapshot: { $exists: true } },
          { projection: { _id: 0, id: 1, title: 1, package_code: 1, package_snapshot: 1, media_bytes: 1, trashed_bytes: 1, reserved_upload_bytes: 1, storage_limit_override_bytes: 1 } },
        ).toArray(),
      ]);
      const quotaDetails = quotaRows.map((row) => {
        const base = packageStorageLimit(row.package_snapshot!);
        const limit = Math.max(base || 0, row.storage_limit_override_bytes || 0);
        const used = storageBytesInUse(row);
        return {
          id: row.id,
          title: row.title,
          package_code: row.package_code,
          used_bytes: used,
          limit_bytes: limit,
          percent: limit ? Math.round((used / limit) * 1000) / 10 : 0,
          overridden: (row.storage_limit_override_bytes || 0) > (base || 0),
        };
      }).filter((row) => row.percent >= 80).sort((a, b) => b.percent - a.percent);
      let checked = 0, missing = 0, r2_error = "";
      try {
        const { client, bucket } = storage();
        const results = await Promise.all(sample.map(async (row) => {
          try { await client.send(new HeadObjectCommand({ Bucket: bucket, Key: row.storage_path })); return true; } catch { return false; }
        }));
        checked = results.length; missing = results.filter((found) => !found).length;
      } catch (reason) { r2_error = reason instanceof Error ? reason.message : "R2 kontrol edilemedi."; }
      return json({
        media: { count: mediaTotals?.count || 0, bytes: mediaTotals?.bytes || 0 },
        consistency: { checked, missing, r2_error, mode: "latest-sample" },
        failures: { processing: processingFailures, archives: archiveFailures },
        retention: { due: retentionDue },
        archives: { active: archiveActive },
        details: { failed_media: failedMedia, failed_archives: failedArchives, retention_due: dueItems },
        quotas: {
          warning: quotaDetails.filter((row) => row.percent >= 80 && row.percent < 100).length,
          blocked: quotaDetails.filter((row) => row.percent >= 100).length,
          details: quotaDetails.slice(0, 50),
        },
        finance: { enabled: true, recognized_revenue: 0, reason: "Finans, komisyon ve dinamik ek ürün fiyatlandırma motoru etkin. Gelir yalnızca tahsil edilmiş satışlardan oluşur." },
      });
    }
    if (route === "admin/operations/retry" && method === "POST" && user) {
      requirePlatform(user);
      const data = z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("media"), id: z.string().min(1).max(100) }),
        z.object({ kind: z.literal("archive"), id: z.string().min(1).max(100) }),
      ]).parse(await req.json());
      if (data.kind === "media") {
        const result = await database.collection("media").updateOne({ id: data.id, processing_status: "failed" }, { $set: { processing_status: "pending" }, $unset: { processing_error: "" } });
        if (!result.matchedCount) throw new HttpError(404, "Başarısız medya kaydı bulunamadı.");
      } else {
        const result = await database.collection("archive_jobs").updateOne({ id: data.id, status: "failed" }, { $set: { status: "pending" }, $unset: { error: "" } });
        if (!result.matchedCount) throw new HttpError(404, "Başarısız arşiv işi bulunamadı.");
      }
      await audit(req, "operation.retried", user, { kind: data.kind, id: data.id });
      return json({ ok: true });
    }
    if (route === "admin/notifications" && method === "GET" && user) {
      const scope = weddingScope(user);
      const eventIds = user.role === "platform" ? null : await weddings.find(scope, { projection: { id: 1 } }).map((row) => row.id).toArray();
      const mediaScope = eventIds ? { wedding_id: { $in: eventIds } } : {};
      const now = new Date(), soon = new Date(now.getTime() + 3 * 86400_000).toISOString();
      const [failedMedia, failedArchives, expiring, drafts, quotaRows] = await Promise.all([
        database.collection("media").countDocuments({ ...mediaScope, processing_status: "failed" }),
        database.collection("archive_jobs").countDocuments({ ...mediaScope, status: "failed" }),
        weddings.countDocuments({ ...scope, expires_at: { $gt: now.toISOString(), $lte: soon }, lifecycle_status: { $ne: "archived" } }),
        weddings.countDocuments({ ...scope, lifecycle_status: "draft" }),
        weddings.find(
          { ...scope, purged_at: null, package_snapshot: { $exists: true } },
          { projection: { package_snapshot: 1, media_bytes: 1, trashed_bytes: 1, reserved_upload_bytes: 1, storage_limit_override_bytes: 1 } },
        ).toArray(),
      ]);
      const quotaUsage = quotaRows.map((row) => {
        const limit = Math.max(packageStorageLimit(row.package_snapshot!) || 0, row.storage_limit_override_bytes || 0);
        return limit ? storageBytesInUse(row) / limit : 0;
      });
      const quotaBlocked = user.role === "platform" ? quotaUsage.filter((usage) => usage >= 1).length : 0;
      const quotaWarning = user.role === "platform" ? quotaUsage.filter((usage) => usage >= 0.8 && usage < 1).length : 0;
      const items = [
        failedMedia ? { id: "failed-media", severity: "danger", title: `${failedMedia} medya işlenemedi`, description: "Başarısız medya işlemlerini inceleyin.", href: "/admin/operations" } : null,
        failedArchives ? { id: "failed-archives", severity: "danger", title: `${failedArchives} arşiv işi başarısız`, description: "Arşiv işlerini yeniden deneyin.", href: "/admin/operations" } : null,
        expiring ? { id: "expiring", severity: "warning", title: `${expiring} organizasyonun saklama süresi yaklaşıyor`, description: "Gerekli arşivleri hazırlayın.", href: "/admin?status=expired" } : null,
        drafts ? { id: "drafts", severity: "info", title: `${drafts} yayınlanmamış taslak`, description: "Taslakları tamamlayın veya temizleyin.", href: "/admin?status=draft" } : null,
        quotaBlocked ? { id: "quota-blocked", severity: "danger", title: `${quotaBlocked} organizasyonun kotası doldu`, description: "Yüklemeler durduruldu. Ek kapasite kararını inceleyin.", href: "/admin/operations" } : null,
        quotaWarning ? { id: "quota-warning", severity: "warning", title: `${quotaWarning} organizasyon kota sınırına yaklaştı`, description: "Depolama kullanımı %80 seviyesini geçti.", href: "/admin/operations" } : null,
      ].filter(Boolean);
      return json({ items, total: items.length });
    }
    if (route === "admin/search" && method === "GET" && user) {
      const query = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
      if (query.length < 2) return json({ items: [] });
      const matcher = { $regex: escapeRegex(query), $options: "i" };
      const partnerScope = user.role === "platform" ? {} : { id: user.partner_id };
      const accountScope = user.role === "platform" ? {} : { partner_id: user.partner_id };
      const [eventRows, partnerRows, accountRows] = await Promise.all([
        weddings.find({ ...weddingScope(user), $or: [{ title: matcher }, { event_type: matcher }, { customer_name: matcher }, { customer_email: matcher }] }, { projection: { _id: 0, id: 1, title: 1, event_type: 1 } }).limit(8).toArray(),
        database.collection("partners").find({ ...partnerScope, name: matcher }, { projection: { _id: 0, id: 1, name: 1 } }).limit(6).toArray(),
        user.role === "owner" ? [] : database.collection("users").find({ ...accountScope, $or: [{ display_name: matcher }, { email: matcher }] }, { projection: { _id: 0, id: 1, display_name: 1, email: 1, role: 1 } }).limit(8).toArray(),
      ]);
      return json({ items: [
        ...eventRows.map((row) => ({ id: row.id, type: "event", title: row.title, subtitle: row.event_type, href: `/admin/${row.id}` })),
        ...partnerRows.map((row) => ({ id: row.id, type: "partner", title: row.name, subtitle: "İşletme", href: `/admin/partners/${row.id}` })),
        ...accountRows.map((row) => ({ id: row.id, type: "account", title: row.display_name, subtitle: row.email, href: "/admin/accounts" })),
      ] });
    }
    if (route === "admin/audit" && method === "GET" && user) {
      requirePlatform(user);
      const page = Math.max(
        1,
        Number(req.nextUrl.searchParams.get("page")) || 1,
      );
      const limit = 30;
      const search = (req.nextUrl.searchParams.get("search") || "").trim().slice(0, 100);
      const action = (req.nextUrl.searchParams.get("action") || "").trim().slice(0, 100);
      const role = (req.nextUrl.searchParams.get("role") || "").trim().slice(0, 30);
      const from = req.nextUrl.searchParams.get("from") || "";
      const to = req.nextUrl.searchParams.get("to") || "";
      const filter = {
        ...(action ? { action } : {}),
        ...(role ? { actor_role: role } : {}),
        ...((from || to) ? { at: { ...(from ? { $gte: `${from}T00:00:00.000Z` } : {}), ...(to ? { $lte: `${to}T23:59:59.999Z` } : {}) } } : {}),
        ...(search ? { $or: ["action", "actor_id", "actor_role", "ip"].map((field) => ({ [field]: { $regex: escapeRegex(search), $options: "i" } })) } : {}),
      };
      const collection = database.collection("audit_logs");
      const [items, total] = await Promise.all([
        collection
          .find(filter, { projection: { _id: 0 } })
          .sort({ at: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter),
      ]);
      return json({
        items,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      });
    }
    if (route === "admin/weddings/bulk" && method === "POST" && user) {
      requireManager(user);
      const data = z.object({ ids: z.array(z.string().uuid()).min(1).max(100), action: z.enum(["archive", "restore"]) }).parse(await req.json());
      const result = await weddings.updateMany(
        { id: { $in: data.ids }, ...weddingScope(user) },
        { $set: data.action === "archive" ? { lifecycle_status: "archived", archived_at: new Date().toISOString() } : { lifecycle_status: "upcoming", archived_at: null } },
      );
      await audit(req, `wedding.bulk_${data.action}`, user, { wedding_ids: data.ids, matched: result.matchedCount });
      return json({ matched: result.matchedCount, modified: result.modifiedCount });
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
        if (
          ![
            "all",
            "draft",
            "upcoming",
            "open",
            "closed",
            "expired",
            "archived",
          ].includes(status)
        )
          throw new HttpError(400, "Geçersiz durum filtresi.");
        const now = new Date().toISOString();
        const filter: Record<string, unknown> = {
          ...weddingScope(user),
          ...(status === "draft" ? { lifecycle_status: "draft" } : {}),
          ...(status === "upcoming" ? { lifecycle_status: "upcoming" } : {}),
          ...(status === "archived" ? { lifecycle_status: "archived" } : {}),
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
        // Legacy direct creation remains available to platform operators only.
        // Partners must use the draft -> submit -> platform approval workflow.
        requirePlatform(user);
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
          package_code: "plan-1",
          package_snapshot: packageSnapshot("plan-1"),
          add_on_selections: [],
          price_snapshot: priceSnapshot("plan-1", [], []),
          upload_days: data.upload_days || 7,
          trash_days: data.trash_days || 7,
          uploads_open_at: now,
          upload_enabled: true,
          purged_at: null,
          photo_count: 0,
          video_count: 0,
          media_bytes: 0,
          reserved_upload_bytes: 0,
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
    if (route === "admin/weddings/draft" && method === "POST" && user) {
      const data = eventDraftInput.parse(await req.json());
      requirePermission(user, data.id ? "organization.update" : "organization.create");
      if (data.id) {
        const existing = await eventFor(user, data.id);
        if (existing.lifecycle_status !== "draft")
          throw new HttpError(409, "Yalnızca taslak organizasyonlar bu akışta güncellenebilir.");
        if (data.partner_id && data.partner_id !== existing.partner_id)
          throw new HttpError(400, "Organizasyonun işletmesi değiştirilemez.");
        if (user.role !== "platform" && existing.approval_status === "submitted")
          throw new HttpError(409, "Onay bekleyen organizasyon değiştirilemez.");
        const { id: _id, partner_id: _partner, package_code, add_on_selections, ...changes } = data;
        const effectivePackageCode = package_code || existing.package_code || "plan-1";
        const addOnProducts = await database.collection<AddOnProduct>("add_on_products").find({
          id: { $in: add_on_selections.map((item) => item.product_id) },
          active: true,
        }).toArray();
        let pricing;
        try {
          pricing = priceSnapshot(effectivePackageCode, add_on_selections, addOnProducts);
        } catch (reason) {
          throw new HttpError(409, reason instanceof Error ? reason.message : "Ek ürün seçimi geçersiz.");
        }
        const packageChanges = package_code
          ? {
              package_code,
              package_snapshot: packageSnapshot(package_code),
              upload_days: packageUploadDays(package_code),
            }
          : {};
        if (changes.cover_images)
          await validateCovers(changes.cover_images, existing.partner_id);
        await weddings.updateOne(
          { id: existing.id, ...weddingScope(user), lifecycle_status: "draft" },
          { $set: { ...changes, ...packageChanges, add_on_selections, price_snapshot: pricing, updated_at: new Date().toISOString() } },
        );
        await audit(req, "wedding.draft_saved", user, {
          wedding_id: existing.id,
          wizard_step: changes.wizard_step,
        });
        return json(await weddings.findOne({ id: existing.id }, { projection: { _id: 0 } }));
      }
      const partner_id =
        user.role === "platform" ? data.partner_id || "platform" : user.partner_id!;
      const partner = await database.collection("partners").findOne({ id: partner_id, active: true });
      if (!partner) throw new HttpError(400, "İşletme bulunamadı.");
      const id = randomUUID();
      const now = new Date().toISOString();
      const packageCode = data.package_code || "plan-1";
      const selectedPackage = packageSnapshot(packageCode);
      const selections = data.add_on_selections || [];
      const addOnProducts = await database.collection<AddOnProduct>("add_on_products").find({
        id: { $in: selections.map((item) => item.product_id) },
        active: true,
      }).toArray();
      let pricing;
      try {
        pricing = priceSnapshot(packageCode, selections, addOnProducts);
      } catch (reason) {
        throw new HttpError(409, reason instanceof Error ? reason.message : "Ek ürün seçimi geçersiz.");
      }
      const draft: Wedding = {
        id,
        slug: data.slug || `taslak-${id}`,
        partner_id,
        owner_id: null,
        title: data.title || "İsimsiz organizasyon",
        event_type: data.event_type || "Düğün",
        venue: data.venue || "",
        description: data.description || "",
        bride_name: data.bride_name || "Gelin",
        groom_name: data.groom_name || "Damat",
        wedding_date: data.wedding_date || null,
        cover_images: data.cover_images || [],
        logo_url: data.logo_url || partner.logo_url || "",
        hero_message: data.hero_message || "",
        thank_you_message: data.thank_you_message || "",
        customer_name: data.customer_name || "",
        customer_email: data.customer_email || "",
        lifecycle_status: "draft",
        wizard_step: data.wizard_step,
        created_at: now,
        published_at: null,
        archived_at: null,
        package_code: packageCode,
        package_snapshot: selectedPackage,
        add_on_selections: selections,
        price_snapshot: pricing,
        upload_days: packageUploadDays(packageCode),
        trash_days: data.trash_days || 7,
        uploads_open_at: now,
        uploads_close_at: null,
        expires_at: null,
        upload_enabled: false,
        approval_status: "draft",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        purged_at: null,
        photo_count: 0,
        video_count: 0,
        media_bytes: 0,
        reserved_upload_bytes: 0,
        trashed_photo_count: 0,
        trashed_video_count: 0,
        trashed_count: 0,
        trashed_bytes: 0,
      };
      if (draft.cover_images.length) await validateCovers(draft.cover_images, partner_id);
      await weddings.insertOne(draft);
      if (user.role === "partner" && effectiveStaffRole(user) !== "partner_owner") {
        await database.collection("users").updateOne(
          { id: user.id, partner_id },
          { $addToSet: { assigned_event_ids: id } },
        );
        invalidateSessionCache();
      }
      await audit(req, "wedding.draft_created", user, { wedding_id: id });
      return json(draft, 201);
    }
    if (path[0] === "admin" && path[1] === "weddings" && path[2] && user) {
      const event = await eventFor(user, path[2]);
      const id = event.id;
      if (path.length === 4 && path[3] === "storage-limit" && method === "PATCH") {
        requirePlatform(user);
        const { additional_gib } = z.object({
          additional_gib: z.number().int().min(0).max(350),
        }).parse(await req.json());
        const code: PackageCode = event.package_code === "plan-2" || event.package_code === "plan-3"
          ? event.package_code
          : "plan-1";
        const policy = event.package_snapshot || packageSnapshot(code);
        const base = packageStorageLimit(policy) || 0;
        const effective = base + additional_gib * GIB;
        await weddings.updateOne(
          { id },
          additional_gib
            ? { $set: { storage_limit_override_bytes: effective, storage_limit_approved_at: new Date().toISOString(), storage_limit_approved_by: user.id } }
            : { $unset: { storage_limit_override_bytes: "", storage_limit_approved_at: "", storage_limit_approved_by: "" } },
        );
        await audit(req, "wedding.storage_limit_updated", user, {
          wedding_id: id,
          additional_gib,
          effective_limit_bytes: effective,
        });
        return json({
          additional_gib,
          effective_limit_bytes: effective,
          used_bytes: storageBytesInUse(event),
        });
      }
      if (path.length === 4 && path[3] === "approve" && method === "POST") {
        requirePlatform(user);
        if (event.lifecycle_status !== "draft" || event.approval_status !== "submitted")
          throw new HttpError(409, "Bu organizasyon onay beklemiyor.");
        const validated = eventInput.safeParse(event);
        if (!validated.success)
          throw new HttpError(400, validated.error.issues[0]?.message || "Organizasyon bilgileri eksik.");
        if (!event.customer_name?.trim() || !event.customer_email?.trim())
          throw new HttpError(400, "Müşteri adı ve e-posta adresi gerekli.");
        const approval = await database.collection("organization_approval_requests").findOne({ wedding_id: id });
        if (!approval?.owner_credentials?.salt || !approval?.owner_credentials?.passwordHash)
          throw new HttpError(409, "Müşteri hesap bilgileri bulunamadı. Organizasyonu yeniden onaya gönderin.");
        const slugOwner = await weddings.findOne({
          slug: validated.data.slug,
          id: { $ne: id },
          lifecycle_status: { $ne: "draft" },
        });
        if (slugOwner)
          throw new HttpError(409, "Bu sayfa adresi başka bir organizasyonda kullanılıyor.");
        const times = deadlines(
          validated.data.wedding_date,
          event.upload_days || 7,
          event.package_snapshot?.digitalRetentionMonths || 3,
        );
        const lifecycle_status = Date.parse(`${validated.data.wedding_date}T00:00:00+03:00`) > Date.now() ? "upcoming" : "active";
        const now = new Date().toISOString();
        const ownerId = randomUUID();
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            const claimed = await weddings.updateOne(
              { id, lifecycle_status: "draft", approval_status: "submitted", owner_id: null },
              { $set: { owner_id: ownerId, lifecycle_status, approval_status: "approved", approved_at: now, approved_by: user.id, wizard_step: 7, published_at: now, upload_enabled: true, uploads_open_at: now, ...times } },
              { session: transaction },
            );
            if (!claimed.modifiedCount)
              throw new HttpError(409, "Onay talebi başka bir işlem tarafından değiştirildi.");
            await database.collection("users").insertOne(
              {
                id: ownerId,
                email: event.customer_email,
                display_name: event.customer_name,
                salt: approval.owner_credentials.salt,
                passwordHash: approval.owner_credentials.passwordHash,
                role: "owner",
                staff_role: "organization_owner",
                partner_id: event.partner_id,
                owner_event_id: id,
                must_change_password: true,
                disabled: false,
              },
              { session: transaction },
            );
            await database.collection("organization_approval_requests").deleteOne(
              { wedding_id: id },
              { session: transaction },
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "wedding.approved", user, { wedding_id: id, submitted_by: approval.submitted_by });
        return json({ ok: true, lifecycle_status, approval_status: "approved" });
      }
      if (path.length === 4 && path[3] === "approval-decision" && method === "POST") {
        requirePlatform(user);
        if (event.lifecycle_status !== "draft" || event.approval_status !== "submitted")
          throw new HttpError(409, "Bu organizasyon onay beklemiyor.");
        const decision = approvalDecisionInput.parse(await req.json());
        const now = new Date().toISOString();
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            const changed = await weddings.updateOne(
              { id, lifecycle_status: "draft", approval_status: "submitted" },
              {
                $set: {
                  approval_status: decision.decision,
                  rejection_reason: decision.reason,
                  reviewed_at: now,
                  reviewed_by: user.id,
                  upload_enabled: false,
                },
              },
              { session: transaction },
            );
            if (!changed.modifiedCount)
              throw new HttpError(409, "Onay talebi başka bir işlem tarafından değiştirildi.");
            await database.collection("organization_approval_requests").deleteOne(
              { wedding_id: id },
              { session: transaction },
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, `wedding.${decision.decision}`, user, {
          wedding_id: id,
          reason: decision.reason,
        });
        return json({ ok: true, approval_status: decision.decision });
      }
      if (path.length === 4 && path[3] === "publish" && method === "POST") {
        requirePermission(user, user.role === "platform" ? "organization.approve" : "organization.submit");
        if (event.lifecycle_status !== "draft")
          throw new HttpError(409, "Bu organizasyon zaten yayınlanmış.");
        const credentials = eventPublishInput.parse(await req.json());
        const validated = eventInput.safeParse(event);
        if (!validated.success)
          throw new HttpError(400, validated.error.issues[0]?.message || "Organizasyon bilgileri eksik.");
        if (!event.customer_name?.trim() || !event.customer_email?.trim())
          throw new HttpError(400, "Müşteri adı ve e-posta adresi gerekli.");
        const slugOwner = await weddings.findOne({
          slug: validated.data.slug,
          id: { $ne: id },
          lifecycle_status: { $ne: "draft" },
        });
        if (slugOwner)
          throw new HttpError(409, "Bu sayfa adresi başka bir organizasyonda kullanılıyor.");
        const times = deadlines(
          validated.data.wedding_date,
          event.upload_days || 7,
          event.package_snapshot?.digitalRetentionMonths || 3,
        );
        const lifecycle_status = Date.parse(`${validated.data.wedding_date}T00:00:00+03:00`) > Date.now() ? "upcoming" : "active";
        const now = new Date().toISOString();
        const ownerId = randomUUID();
        const password = await passwordFields(credentials.password);
        if (user.role !== "platform") {
          const submission = (await mongoClient()).startSession();
          try {
            await submission.withTransaction(async () => {
              const claimed = await weddings.updateOne(
                {
                  id,
                  ...weddingScope(user),
                  lifecycle_status: "draft",
                  $or: [
                    { approval_status: { $exists: false } },
                    { approval_status: { $in: ["draft", "changes_requested", "rejected"] } },
                  ],
                  owner_id: null,
                },
                {
                  $set: {
                    approval_status: "submitted",
                    submitted_at: now,
                    wizard_step: 7,
                    upload_enabled: false,
                  },
                  $unset: { rejection_reason: "" },
                },
                { session: submission },
              );
              if (!claimed.modifiedCount)
                throw new HttpError(409, "Organizasyon zaten onay bekliyor veya yayınlanmış.");
              await database.collection("organization_approval_requests").updateOne(
                { wedding_id: id },
                {
                  $set: {
                    wedding_id: id,
                    partner_id: event.partner_id,
                    submitted_by: user.id,
                    submitted_at: now,
                    owner_credentials: password,
                  },
                },
                { upsert: true, session: submission },
              );
            });
          } finally {
            await submission.endSession();
          }
          await audit(req, "wedding.submitted", user, { wedding_id: id });
          return json({ ok: true, approval_status: "submitted" }, 202);
        }
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            const claimed = await weddings.updateOne(
              { id, ...weddingScope(user), lifecycle_status: "draft", owner_id: null },
              { $set: { owner_id: ownerId, lifecycle_status, approval_status: "approved", approved_at: now, approved_by: user.id, wizard_step: 7, published_at: now, upload_enabled: true, uploads_open_at: now, ...times } },
              { session: transaction },
            );
            if (!claimed.modifiedCount)
              throw new HttpError(409, "Taslak başka bir işlem tarafından yayınlandı.");
            await database.collection("users").insertOne(
              {
                id: ownerId,
                email: event.customer_email,
                display_name: event.customer_name,
                ...password,
                role: "owner",
                staff_role: "organization_owner",
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
        await audit(req, "wedding.published", user, { wedding_id: id });
        return json({ ok: true, lifecycle_status });
      }
      if (path.length === 5 && path[3] === "design" && path[4] === "request-revision" && method === "POST") {
        requirePermission(user, "design.request_revision");
        if (!event.design || event.design_status !== "approved_for_print")
          throw new HttpError(409, "Yalnızca baskı için onaylanmış bir tasarımda revizyon istenebilir.");
        const input = z.object({ reason: z.string().trim().min(5).max(1000) }).parse(await req.json());
        const knownCode: PackageCode = event.package_code === "plan-2" || event.package_code === "plan-3" ? event.package_code : "plan-1";
        const limit = (event.package_snapshot || packageSnapshot(knownCode)).revisionLimit;
        const used = event.design_revisions_used || 0;
        if (used >= limit)
          throw new HttpError(409, `Bu paketin ${limit} revizyon hakkı kullanıldı.`);
        const now = new Date().toISOString();
        const changed = await weddings.updateOne(
          { id, ...weddingScope(user), design_status: "approved_for_print", design_revisions_used: event.design_revisions_used === undefined ? { $exists: false } : used },
          { $set: { design_status: "revision_requested", design_revisions_used: used + 1, design_revision_reason: input.reason, design_revision_requested_at: now, design_revision_requested_by: user.id } },
        );
        if (!changed.modifiedCount) throw new HttpError(409, "Revizyon durumu başka bir oturumda değiştirildi.");
        await audit(req, "wedding.design_revision_requested", user, { wedding_id: id, revision_used: used + 1, revision_limit: limit, reason: input.reason });
        return json({ design_status: "revision_requested", design_revisions_used: used + 1, design_revision_limit: limit });
      }
      if (path.length === 5 && path[3] === "design" && path[4] === "approve" && method === "POST") {
        requirePermission(user, "design.approve_for_print");
        if (!event.design) throw new HttpError(409, "Onaylanacak kayıtlı bir tasarım bulunamadı.");
        if (event.design_status === "approved_for_print") throw new HttpError(409, "Tasarım zaten baskı için onaylı.");
        const now = new Date().toISOString();
        const changed = await weddings.updateOne(
          { id, ...weddingScope(user), design_snapshot_id: event.design_snapshot_id, design_status: event.design_status || { $exists: false } },
          { $set: { design_status: "approved_for_print", design_approved_at: now, design_approved_by: user.id, design_revision_reason: null } },
        );
        if (!changed.modifiedCount) throw new HttpError(409, "Tasarım başka bir oturumda değiştirildi.");
        await audit(req, "wedding.design_approved_for_print", user, { wedding_id: id, snapshot_id: event.design_snapshot_id, revisions_used: event.design_revisions_used || 0 });
        return json({ design_status: "approved_for_print", design_revisions_used: event.design_revisions_used || 0 });
      }
      if (path.length === 4 && path[3] === "design" && method === "PUT") {
        requirePermission(user, "design.select");
        if (user.role !== "platform" && event.approval_status === "submitted")
          throw new HttpError(409, "Onay bekleyen organizasyonun tasarımı değiştirilemez.");
        if (event.design_status === "approved_for_print")
          throw new HttpError(409, "Baskı için onaylanan tasarım kilitlidir. Önce revizyon talebi oluşturun.");
        const body: unknown = await req.json();
        const designEnvelope = z.object({
          design: z.unknown(),
          add_on_selections: z.array(z.object({
            product_id: z.string().uuid(),
            quantity: z.number().int().min(1).max(100),
          })).max(20).optional(),
        }).strict().safeParse(body);
        const design = designSchema.parse(designEnvelope.success ? designEnvelope.data.design : body);
        if (!weddingImageBelongsToEvent(design.weddingImage, event.cover_images || []))
          throw new HttpError(400, "Seçilen Wedding fotoğrafı bu organizasyona ait değil.");
        const addOnSelections = designEnvelope.success ? designEnvelope.data.add_on_selections : undefined;
        let pricing = event.price_snapshot;
        if (addOnSelections) {
          requirePermission(user, "organization.update");
          const uniqueProductIds = new Set(addOnSelections.map((selection) => selection.product_id));
          if (uniqueProductIds.size !== addOnSelections.length)
            throw new HttpError(400, "Aynı ek ürün birden fazla kez seçilemez.");
          const addOnProducts = await database.collection<AddOnProduct>("add_on_products").find({
            id: { $in: [...uniqueProductIds] },
            active: true,
          }).toArray();
          const knownCode: PackageCode = event.package_code === "plan-2" || event.package_code === "plan-3" ? event.package_code : "plan-1";
          try {
            pricing = priceSnapshot(knownCode, addOnSelections, addOnProducts);
          } catch (reason) {
            throw new HttpError(400, reason instanceof Error ? reason.message : "Ek ürün seçimi doğrulanamadı.");
          }
        }
        const snapshotId = randomUUID();
        const savedAt = new Date().toISOString();
        const revision = (event.design_revision || 0) + 1;
        const snapshot = {
          id: snapshotId,
          wedding_id: id,
          partner_id: event.partner_id,
          revision,
          schema_version: design.version,
          created_at: savedAt,
          created_by: user.id,
          revision_round: event.design_revisions_used || 0,
          configuration: {
            design,
            commercial: {
              package_snapshot: event.package_snapshot,
              add_on_selections: addOnSelections ?? event.add_on_selections ?? [],
              price_snapshot: pricing,
            },
            event: {
              slug: event.slug,
              title: event.title,
              event_type: event.event_type,
              wedding_date: event.wedding_date,
              cover_images: [...(event.cover_images || [])],
              logo_url: event.logo_url,
            },
          },
        };
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            await database.collection("design_snapshots").insertOne(snapshot, { session: transaction });
            const result = await weddings.updateOne(
              { id, ...weddingScope(user), ...(event.design_revision === undefined ? { design_revision: { $exists: false } } : { design_revision: event.design_revision }) },
              { $set: {
                design,
                design_revision: revision,
                design_snapshot_id: snapshotId,
                design_status: event.design_status || "draft",
                design_revisions_used: event.design_revisions_used || 0,
                ...(addOnSelections ? { add_on_selections: addOnSelections, price_snapshot: pricing } : {}),
              } },
              { session: transaction },
            );
            if (!result.matchedCount)
              throw new HttpError(409, "Tasarım başka bir oturumda değiştirildi. Sayfayı yenileyin.");
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "wedding.design_saved", user, { wedding_id: id, snapshot_id: snapshotId, revision, add_on_selection_count: addOnSelections?.length });
        return json({ design, snapshot_id: snapshotId, revision, design_status: event.design_status || "draft", design_revisions_used: event.design_revisions_used || 0, add_on_selections: addOnSelections ?? event.add_on_selections ?? [], price_snapshot: pricing });
      }
      if (path.length === 3) {
        if (method === "GET") return json(event);
        if (method === "PATCH") {
          requirePermission(user, "organization.update");
          if (user.role !== "platform" && event.approval_status === "submitted")
            throw new HttpError(409, "Onay bekleyen organizasyon değiştirilemez.");
          const data = eventInput.partial().parse(await req.json());
          if (data.partner_id && data.partner_id !== event.partner_id)
            throw new HttpError(
              400,
              "Organizasyonun işletmesi değiştirilemez.",
            );
          if (
            user.role !== "platform" &&
            (data.upload_days !== undefined ||
              data.trash_days !== undefined ||
              data.upload_enabled !== undefined)
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
          requirePlatform(user);
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
        requireMediaPermission(user, path.length === 4 && method !== "GET" ? "manage" : "view");
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
          if (req.nextUrl.searchParams.get("download") === "1")
            requireMediaPermission(user, "download");
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
        requireMediaPermission(user, "archive");
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
        requireMediaPermission(user, "archive");
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
        requireMediaPermission(user, "archive");
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
      const mediaType = data.mime_type.startsWith("image/") ? "photo" : "video";
      const fileLimit = mediaType === "photo"
        ? FAIR_USE_POLICY.maxPhotoBytes
        : FAIR_USE_POLICY.maxVideoBytes;
      if (data.size_bytes > fileLimit)
        throw new HttpError(
          413,
          mediaType === "photo"
            ? "Fotoğraf en fazla 25 MB olabilir."
            : "Video en fazla 1 GB olabilir.",
        );
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
      const knownCode: PackageCode =
        event.package_code === "plan-2" || event.package_code === "plan-3"
          ? event.package_code
          : "plan-1";
      const policy = (event.package_snapshot || packageSnapshot(knownCode)) as PackagePolicy;
      const configuredLimit = packageStorageLimit(policy);
      const storageLimit = Math.max(configuredLimit || 0, event.storage_limit_override_bytes || 0);
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          const reserved = await weddings.updateOne(
            {
              id: event.id,
              $expr: {
                $lte: [
                  {
                    $add: [
                      { $ifNull: ["$media_bytes", 0] },
                      { $ifNull: ["$trashed_bytes", 0] },
                      { $ifNull: ["$reserved_upload_bytes", 0] },
                      data.size_bytes,
                    ],
                  },
                  storageLimit,
                ],
              },
            },
            { $inc: { reserved_upload_bytes: data.size_bytes } },
            { session: transaction },
          );
          if (!reserved.matchedCount)
            throw new HttpError(
              413,
              policy.hardStorageBytes
                ? "Paketin 3 GB depolama kotası doldu."
                : "Adil kullanım sınırına ulaşıldı. Ek kapasite için ShineQR onayı gerekiyor.",
            );
          await tickets.insertOne({
            ...data,
            token: hash(ticket),
            storage_path: key,
            reserved_bytes: data.size_bytes,
            reservation_released: false,
            storage_limit_bytes: storageLimit,
            createdAt: new Date(),
            expiresAt: new Date(
              Math.min(Date.now() + 3600000, Date.parse(event.uploads_close_at!)),
            ),
            completed: false,
          }, { session: transaction });
        });
      } finally {
        await transaction.endSession();
      }
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
        const release = (await mongoClient()).startSession();
        try {
          await release.withTransaction(async () => {
            const released = await database.collection("upload_tickets").updateOne(
              { _id: t._id, reservation_released: { $ne: true } },
              {
                $set: {
                  reservation_released: true,
                  failed_at: new Date(),
                  failure_reason: "object_validation",
                },
              },
              { session: release },
            );
            if (released.modifiedCount && t.reserved_bytes)
              await weddings.updateOne(
                { id: t.weddingId },
                { $inc: { reserved_upload_bytes: -t.reserved_bytes } },
                { session: release },
              );
          });
        } finally {
          await release.endSession();
        }
        throw new HttpError(400, "Dosya doğrulanamadı.");
      }
      const mediaType = t.mime_type.startsWith("image/") ? "photo" : "video";
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          const claimed = await database.collection("upload_tickets").updateOne(
            { _id: t._id, completed: false },
            {
              $set: {
                completed: true,
                reservation_released: true,
                completed_at: new Date(),
              },
            },
            { session: transaction },
          );
          if (!claimed.modifiedCount) return;
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
                duration_seconds: t.duration_seconds,
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
            { upsert: true, session: transaction },
          );
          await weddings.updateOne(
            { id: event.id },
            {
              $inc: {
                reserved_upload_bytes: -(t.reserved_bytes || 0),
                photo_count: inserted.upsertedCount && mediaType === "photo" ? 1 : 0,
                video_count: inserted.upsertedCount && mediaType === "video" ? 1 : 0,
                media_bytes: inserted.upsertedCount ? t.size_bytes : 0,
              },
            },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      return json({ ok: true });
    }
    throw new HttpError(404, "İşlem bulunamadı.");
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError)
      return json({ error: "İstek gövdesi geçerli JSON olmalıdır." }, 400);
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
