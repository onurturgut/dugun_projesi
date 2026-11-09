import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { MongoServerError, type ClientSession, type Db } from "mongodb";
import { z } from "zod";
import {
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, mongoClient } from "./db";
import { hash, invalidateSessionCache, session } from "./auth";
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
import {
  uploadCover,
  validateCovers,
  coverResponse,
  coverAssetResponse,
} from "./covers";
import { availableDesignRequestTemplates } from "@/lib/design";
import { qrTemplates } from "@/lib/qr-templates";
import { qrProductEntitlement, qrProducts } from "@/lib/qr-products";
import {
  deadlines,
  expired,
  uploadsOpen,
  uploadsOpenForRuntime,
  uploadWindowDeadline,
  trashDeadline,
  weddingScope,
  canAccess,
} from "@/lib/policy";
import type {
  Wedding,
  Media,
  Account,
  SaleRecord,
  PhotographerSaleRecord,
  ServicePayoutLedgerEntry,
  AddOnProduct,
  ExpenseRecord,
  PackageConfiguration,
  PartnerCommissionPolicy,
  PhotographerPackageConfiguration,
  TaxConfiguration,
  AgentReport,
  PrintJob,
  PrintJobStatus,
  DesignRequest,
} from "@/lib/models";
import { designSchema } from "@/lib/design";
import { weddingImageBelongsToEvent } from "@/lib/wedding-templates";
import { defaultDigitalInvitationContent, digitalInvitationAccessEnabled, invitationGalleryBelongsToWedding } from "@/lib/digital-invitation";
import { audit } from "./audit";
import {
  commissionSnapshot,
  FAIR_USE_POLICY,
  GIB,
  hasCustomDesignEntitlement,
  istanbulCalendarMonth,
  packageSnapshot,
  packageStorageLimit,
  packageUploadDays,
  priceSnapshot,
  photographerSettlementSnapshot,
  storageBytesInUse,
  type PackageCode,
  type PackagePolicy,
} from "@/lib/commercial-policy";
import {
  calculateCommissionCents,
  commissionRateForOrdinal,
  breakEvenGrossCents,
  monthlyBreakEvenUnits,
  netFromVatIncluded,
  profitability,
  targetMarginGrossCents,
} from "@/lib/finance";
import {
  currentCommissionPolicy,
  currentPackage,
  currentPackages,
  currentPhotographerPackage,
  priceSnapshotForPackage,
  selectionsWithExtraQr,
} from "./pricing";
import {
  accountHasPermission,
  effectiveStaffRole,
  initialPartnerStaffRole,
} from "@/lib/access-control";
import { approvedPrintSource, canTransitionPrintJob } from "@/lib/print-jobs";
import { sendPasswordResetEmail } from "./email";
import { createPaymentQuote } from "./payment-quote";
import {
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotp,
} from "./totp";
const addOnEffectValues: Record<
  NonNullable<AddOnProduct["effect_type"]>,
  readonly number[]
> = {
  print_quantity: [1, 10, 20, 30, 50],
  welcome_sign: [1],
  storage_gib: [10],
  retention_months: [3, 6, 12],
  digital_invitation: [1],
  custom_design: [1],
  second_event: [1],
};
const validAddOnEffect = (
  effectType: NonNullable<AddOnProduct["effect_type"]>,
  effectValue: number,
) =>
  effectType === "print_quantity"
    ? Number.isInteger(effectValue) && effectValue >= 1 && effectValue <= 10_000
    : addOnEffectValues[effectType].includes(effectValue);
function requireCompleteCustomDesignRequest(
  products: AddOnProduct[],
  request: Wedding["custom_design_request"],
  covers: string[],
) {
  if (!products.some((product) => product.effect_type === "custom_design"))
    return;
  if (
    !request?.description.trim() ||
    !request.colors.trim() ||
    !request.text_content.trim() ||
    !request.main_image_url ||
    !covers.includes(request.main_image_url) ||
    !request.surfaces.length ||
    !request.due_date
  )
    throw new HttpError(
      400,
      "Kişiye özel tasarım bilgileri eksik veya ana görsel organizasyon görsellerine ait değil.",
    );
}
async function ensureSaleDraft(
  database: Db,
  event: Wedding,
  actorId: string,
  transaction?: ClientSession,
) {
  if (!event.package_code) return null;
  const existing = await database
    .collection<SaleRecord>("sales")
    .findOne(
      { wedding_id: event.id },
      { projection: { _id: 0 }, session: transaction },
    );
  if (existing) return existing;
  const selectedPackage =
    event.package_snapshot ||
    (await currentPackage(database, event.package_code));
  const pricing =
    event.price_snapshot ||
    priceSnapshotForPackage(selectedPackage as PackageConfiguration, [], []);
  const vatRateBps =
    (selectedPackage as Partial<PackageConfiguration>).vat_rate_bps ?? 2000;
  const netCents =
    pricing.net_cents ?? netFromVatIncluded(pricing.gross_cents, vatRateBps);
  const now = new Date().toISOString();
  const draft: SaleRecord = {
    id: randomUUID(),
    idempotency_key: `wedding-draft-${event.id}`,
    partner_id: event.seller_partner_id || event.partner_id,
    wedding_id: event.id,
    package_code: event.package_code,
    status: "draft",
    period: istanbulCalendarMonth(now),
    occurred_at: now,
    recorded_at: now,
    recorded_by: actorId,
    net_cents: netCents,
    vat_rate_bps: vatRateBps,
    vat_cents: pricing.gross_cents - netCents,
    gross_cents: pricing.gross_cents,
    qualifying_ordinal: null,
    commission_rate_bps: 0,
    commission_cents: 0,
    package_snapshot: structuredClone(selectedPackage),
    platform_cents: 0,
    price_snapshot: structuredClone(pricing),
    variable_cost_cents:
      ((selectedPackage as Partial<PackageConfiguration>).variable_cost_cents ||
        0) +
      pricing.add_ons.reduce(
        (sum, item) => sum + (item.line_cost_cents || 0),
        0,
      ),
    payment_reference: null,
    paid_at: null,
    paid_by: null,
    refunded_at: null,
    refunded_by: null,
  };
  return database.collection<SaleRecord>("sales").findOneAndUpdate(
    { wedding_id: event.id },
    { $setOnInsert: draft },
    {
      upsert: true,
      returnDocument: "after",
      projection: { _id: 0 },
      session: transaction,
    },
  );
}
async function ensureRequestedPhotographerSale(
  database: Db,
  event: Wedding,
  actorId: string,
  transaction?: ClientSession,
) {
  if (!event.photographer_package_requested) return null;
  const existing = await database
    .collection<PhotographerSaleRecord>("photographer_sales")
    .findOne(
      { idempotency_key: `wedding-photographer-offer-${event.id}` },
      { projection: { _id: 0 }, session: transaction },
    );
  if (existing) return existing;
  const assignment = await database
    .collection("organization_participants")
    .findOne(
      { wedding_id: event.id, participant_role: "photographer", active: true },
      { session: transaction },
    );
  if (!assignment?.account_id || !assignment.partner_id)
    throw new HttpError(
      409,
      "Fotoğrafçı paketi için aktif bir fotoğrafçı ataması gerekli.",
    );
  const photographerPackage = await currentPhotographerPackage(database);
  const now = new Date().toISOString();
  const draft: PhotographerSaleRecord = {
    id: randomUUID(),
    idempotency_key: `wedding-photographer-offer-${event.id}`,
    wedding_id: event.id,
    photographer_account_id: assignment.account_id,
    photographer_partner_id: assignment.partner_id,
    originating_partner_id: event.lead_partner_id || event.partner_id,
    status: "pending_customer_consent",
    occurred_at: now,
    recorded_at: now,
    recorded_by: actorId,
    settlement_snapshot: photographerSettlementSnapshot(photographerPackage),
    refunded_at: null,
    refunded_by: null,
    delivery_completed_at: null,
    customer_approval_status: "pending_delivery",
    customer_approved_at: null,
    customer_approved_by: null,
    commercial_consent_version: 1,
    commercial_consent_at: null,
    commercial_consent_by: null,
    payment_reference: null,
    paid_at: null,
    paid_by: null,
  };
  return database
    .collection<PhotographerSaleRecord>("photographer_sales")
    .findOneAndUpdate(
      { idempotency_key: draft.idempotency_key },
      { $setOnInsert: draft },
      {
        upsert: true,
        returnDocument: "after",
        projection: { _id: 0 },
        session: transaction,
      },
    );
}
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
const publishedDigitalInvitation = (w: Wedding) => {
  const invitation = w.digital_invitation;
  if (!invitation || invitation.status !== "published") return null;
  const content = invitation.published_content || invitation.content || {
    ...defaultDigitalInvitationContent,
    bride_name: w.bride_name || defaultDigitalInvitationContent.bride_name,
    groom_name: w.groom_name || defaultDigitalInvitationContent.groom_name,
    event_type: w.event_type || defaultDigitalInvitationContent.event_type,
    event_date: invitation.event_date,
    event_time: invitation.event_time,
    venue: invitation.venue,
    map_url: invitation.map_url,
    message: invitation.message,
  };
  return {
    template_version: invitation.template_version,
    status: invitation.status,
    theme_id: invitation.theme_id || "botanical",
    content,
    event_date: content.event_date,
    event_time: content.event_time,
    venue: content.venue,
    map_url: content.map_url,
    message: content.message,
    published_at: invitation.published_at || null,
  };
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
  can_upload: uploadsOpenForRuntime(w),
  uploads_close_at: w.uploads_close_at,
  ...(digitalInvitationAccessEnabled(w) && w.digital_invitation?.status === "published"
    ? { digital_invitation: publishedDigitalInvitation(w) }
    : {}),
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
        await (
          await db()
        )
          .collection("sessions")
          .deleteOne({ token: hash(previewToken), preview: true });
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
        ? await requireAccount(
            route === "auth/me" ||
              route === "auth/password" ||
              route === "auth/preferences" ||
              route === "auth/preview-stop",
          )
        : route === "uploads/sign" || route === "uploads/complete"
          ? await session()
          : null;
    if (
      user?.preview_read_only &&
      !["GET", "HEAD"].includes(method) &&
      route !== "auth/preview-stop"
    )
      throw new HttpError(403, "Hesap önizlemesi salt okunurdur.");
    const database = await db(),
      weddings = database.collection<Wedding>("weddings"),
      media = database.collection<Media>("media");
    if (
      path.length === 3 &&
      path[0] === "photographer-invitations" &&
      path[2] === "accept" &&
      method === "POST"
    ) {
      const input = z
        .object({
          display_name: z.string().trim().min(2).max(100),
          password: passwordSchema,
        })
        .strict()
        .parse(await req.json());
      const invitation = await database
        .collection("photographer_invitations")
        .findOne({
          token_hash: hash(path[1]),
          accepted_at: null,
          expires_at: { $gt: new Date().toISOString() },
        });
      if (!invitation)
        throw new HttpError(404, "Davet geçersiz veya süresi dolmuş.");
      const partnerId = randomUUID();
      const accountId = randomUUID();
      const now = new Date().toISOString();
      if (
        await database.collection("organization_participants").findOne({
          wedding_id: invitation.wedding_id,
          participant_role: "photographer",
          active: true,
        })
      )
        throw new HttpError(
          409,
          "Bu organizasyonda zaten aktif bir fotoğrafçı bulunuyor.",
        );
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          await database.collection("partners").insertOne(
            {
              id: partnerId,
              name: invitation.business_name,
              phone: invitation.phone,
              address: invitation.address,
              logo_url: "",
              active: true,
              business_types: ["photography"],
              created_at: now,
            },
            { session: transaction },
          );
          await database.collection("users").insertOne(
            {
              id: accountId,
              email: invitation.email,
              display_name: input.display_name,
              ...(await passwordFields(input.password)),
              role: "partner",
              staff_role: "photographer",
              partner_id: partnerId,
              assigned_event_ids: [invitation.wedding_id],
              must_change_password: false,
              disabled: false,
            },
            { session: transaction },
          );
          await database.collection("organization_participants").insertOne(
            {
              id: randomUUID(),
              wedding_id: invitation.wedding_id,
              account_id: accountId,
              partner_id: partnerId,
              participant_role: "photographer",
              active: true,
              assigned_at: now,
              assigned_by: invitation.created_by,
              delivery_due_at: invitation.delivery_due_at || null,
              expected_file_count: invitation.expected_file_count || null,
              delivery_status: "assigned",
              delivered_file_count: 0,
              completed_at: null,
              completed_by: null,
            },
            { session: transaction },
          );
          await database
            .collection("photographer_invitations")
            .updateOne(
              { _id: invitation._id, accepted_at: null },
              { $set: { accepted_at: now, accepted_account_id: accountId } },
              { session: transaction },
            );
        });
      } finally {
        await transaction.endSession();
      }
      await weddings.updateOne(
        { id: invitation.wedding_id },
        { $addToSet: { participant_partner_ids: partnerId } },
      );
      await audit(req, "photographer.invitation_accepted", null, {
        wedding_id: invitation.wedding_id,
        account_id: accountId,
      });
      return json({ ok: true }, 201);
    }
    const ensureActivePartners = async (
      ids: Array<string | null | undefined>,
    ) => {
      const unique = [
        ...new Set(ids.filter((id): id is string => !!id && id !== "platform")),
      ];
      if (!unique.length) return;
      const count = await database
        .collection("partners")
        .countDocuments({ id: { $in: unique }, active: true });
      if (count !== unique.length)
        throw new HttpError(
          400,
          "Seçilen işletmelerden biri bulunamadı veya aktif değil.",
        );
    };
    if (route === "auth/preview-stop" && method === "POST" && user) {
      const jar = await cookies();
      const previewToken = jar.get("wm_preview")?.value;
      const previewSession = previewToken
        ? await database
            .collection("sessions")
            .findOne({ token: hash(previewToken), preview: true })
        : null;
      if (previewToken)
        await database
          .collection("sessions")
          .deleteOne({ token: hash(previewToken), preview: true });
      jar.delete("wm_preview");
      invalidateSessionCache();
      if (previewSession)
        await audit(
          req,
          "account.preview_stopped",
          {
            id: String(previewSession.actorUserId),
            role: "platform",
            partner_id: null,
          },
          { target_user_id: previewSession.targetUserId },
        );
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
      const account = await database
        .collection("users")
        .findOne({ email, disabled: { $ne: true } });
      if (account) {
        const rawToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 60_000);
        await database
          .collection("password_reset_tokens")
          .deleteMany({ userId: account.id });
        const reset = {
          id: randomUUID(),
          userId: account.id,
          token: hash(rawToken),
          createdAt: new Date(),
          expiresAt,
          usedAt: null,
          delivery: "pending",
        };
        await database.collection("password_reset_tokens").insertOne(reset);
        const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        try {
          const delivery = await sendPasswordResetEmail(
            account.email,
            `${base}/auth/reset-password?token=${rawToken}`,
          );
          await database.collection("password_reset_tokens").updateOne(
            { id: reset.id },
            {
              $set: {
                delivery: delivery.delivered ? "sent" : delivery.reason,
              },
            },
          );
        } catch {
          await database
            .collection("password_reset_tokens")
            .updateOne({ id: reset.id }, { $set: { delivery: "failed" } });
        }
        await audit(req, "auth.password_reset_requested", {
          id: account.id,
          role: account.role,
          partner_id: account.partner_id || null,
        });
      }
      return json({
        ok: true,
        message: "Hesap uygunsa parola yenileme bağlantısı gönderildi.",
      });
    }
    if (route === "auth/reset-password" && method === "POST") {
      const data = z
        .object({
          token: z.string().min(32).max(256),
          password: passwordSchema,
        })
        .parse(await req.json());
      const tokenHash = hash(data.token);
      const reset = await database.collection("password_reset_tokens").findOne({
        token: tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (!reset)
        throw new HttpError(
          400,
          "Parola yenileme bağlantısı geçersiz veya süresi dolmuş.",
        );
      const account = await database
        .collection("users")
        .findOne({ id: reset.userId, disabled: { $ne: true } });
      if (!account)
        throw new HttpError(
          400,
          "Parola yenileme bağlantısı geçersiz veya süresi dolmuş.",
        );
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          const claimed = await database
            .collection("password_reset_tokens")
            .updateOne(
              { _id: reset._id, usedAt: null },
              { $set: { usedAt: new Date() } },
              { session: transaction },
            );
          if (!claimed.modifiedCount)
            throw new HttpError(409, "Bu bağlantı daha önce kullanılmış.");
          await database.collection("users").updateOne(
            { id: account.id },
            {
              $set: {
                ...(await passwordFields(data.password)),
                must_change_password: false,
              },
            },
            { session: transaction },
          );
          await database
            .collection("sessions")
            .deleteMany({ userId: account.id }, { session: transaction });
        });
      } finally {
        await transaction.endSession();
      }
      invalidateSessionCache();
      await audit(req, "auth.password_reset_completed", {
        id: account.id,
        role: account.role,
        partner_id: account.partner_id || null,
      });
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
    if (route === "partners" && method === "GET")
      return json(
        await database
          .collection("partners")
          .find(
            { active: true, logo_url: { $type: "string", $ne: "" } },
            { projection: { _id: 0, id: 1, name: 1, logo_url: 1 } },
          )
          .sort({ name: 1 })
          .limit(24)
          .toArray(),
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
            username: z
              .string()
              .trim()
              .toLowerCase()
              .email("Geçerli bir e-posta adresi girin.")
              .max(254),
            name: z.string().trim().min(1).max(120),
            phone: z
              .string()
              .trim()
              .regex(
                /^0[0-9]{10}$/,
                "Telefon numarası 0 ile başlayan 11 rakam olmalıdır.",
              ),
            address: z.string().trim().min(5).max(500),
            id: z.string().uuid().optional(),
            logo_url: z.string().max(2048).default(""),
            business_types: z
              .array(
                z.enum([
                  "venue",
                  "planner",
                  "photography",
                  "print_vendor",
                  "other",
                ]),
              )
              .min(1)
              .max(5)
              .default(["other"]),
          })
          .parse(await req.json());
        const id = data.id || randomUUID();
        if (data.logo_url) await validateCovers([data.logo_url], id);
        const fields = await passwordFields(data.password);
        const initialStaffRole = initialPartnerStaffRole(data.business_types);
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            await database.collection("users").insertOne(
              {
                id: randomUUID(),
                email: data.username,
                ...fields,
                role: "partner",
                staff_role: initialStaffRole,
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
                phone: data.phone,
                address: data.address,
                logo_url: data.logo_url,
                business_types: data.business_types,
                active: true,
                created_at: new Date().toISOString(),
              },
              { session: transaction },
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "partner.created", user, {
          partner_id: id,
          initial_staff_role: initialStaffRole,
        });
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
        const partner = await database
          .collection("partners")
          .findOne({ id: path[2] }, { projection: { _id: 0 } });
        if (!partner) throw new HttpError(404, "İşletme bulunamadı.");
        const [events, accounts, activity] = await Promise.all([
          weddings
            .find(
              { partner_id: path[2] },
              {
                projection: {
                  _id: 0,
                  id: 1,
                  title: 1,
                  lifecycle_status: 1,
                  wedding_date: 1,
                  photo_count: 1,
                  video_count: 1,
                  media_bytes: 1,
                },
              },
            )
            .sort({ created_at: -1 })
            .limit(50)
            .toArray(),
          database
            .collection("users")
            .find(
              { partner_id: path[2], role: { $in: ["partner", "owner"] } },
              {
                projection: {
                  _id: 0,
                  password_hash: 0,
                  password_salt: 0,
                  mfa_secret: 0,
                },
              },
            )
            .sort({ display_name: 1 })
            .toArray(),
          database
            .collection("audit_logs")
            .find(
              {
                $or: [
                  { "target.partner_id": path[2] },
                  { actor_partner_id: path[2] },
                ],
              },
              { projection: { _id: 0 } },
            )
            .sort({ at: -1 })
            .limit(20)
            .toArray(),
        ]);
        const photographers = accounts.filter(
          (account) =>
            account.role === "partner" && account.staff_role === "photographer",
        );
        const eventsWithPhotographers = events.map((event) => ({
          ...event,
          photographers: photographers
            .filter(
              (account) =>
                Array.isArray(account.assigned_event_ids) &&
                account.assigned_event_ids.includes(event.id),
            )
            .map((account) => ({
              id: account.id,
              display_name: account.display_name,
              email: account.email,
              disabled: !!account.disabled,
            })),
        }));
        return json({
          partner,
          events: eventsWithPhotographers,
          accounts,
          activity,
        });
      }
      if (method !== "PATCH")
        throw new HttpError(405, "Yöntem desteklenmiyor.");
      const data = z
        .object({
          active: z.boolean().optional(),
          logo_url: z.string().max(2048).optional(),
          name: z.string().trim().min(1).max(120).optional(),
          phone: z
            .string()
            .trim()
            .regex(
              /^0[0-9]{10}$/,
              "Telefon numarası 0 ile başlayan 11 rakam olmalıdır.",
            )
            .optional(),
          address: z.string().trim().min(1).max(500).optional(),
          business_types: z
            .array(
              z.enum([
                "venue",
                "planner",
                "photography",
                "print_vendor",
                "other",
              ]),
            )
            .min(1)
            .max(5)
            .optional(),
        })
        .refine((value) => Object.keys(value).length > 0)
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
        const page = Math.max(
          1,
          Number(req.nextUrl.searchParams.get("page")) || 1,
        );
        const limit = Math.min(
          100,
          Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 25),
        );
        const status = req.nextUrl.searchParams.get("status");
        const reviewStatus = req.nextUrl.searchParams.get("review_status");
        const agentName = req.nextUrl.searchParams.get("agent_name");
        const search = req.nextUrl.searchParams.get("search")?.trim();
        const filter: Record<string, unknown> = {};
        if (status && ["complete", "needs-review", "blocked"].includes(status))
          filter.status = status;
        if (
          reviewStatus &&
          ["pending", "approved", "changes_requested", "rejected"].includes(
            reviewStatus,
          )
        )
          filter.review_status = reviewStatus;
        if (
          agentName &&
          agentNames.includes(agentName as (typeof agentNames)[number])
        )
          filter.agent_name = agentName;
        if (search)
          filter.$or = [
            { task_title: { $regex: escapeRegex(search), $options: "i" } },
            { run_id: search },
            { change_ref: { $regex: escapeRegex(search), $options: "i" } },
          ];
        const [items, total, summaryRows] = await Promise.all([
          reports
            .find(filter, { projection: { _id: 0 } })
            .sort({ created_at: -1, id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          reports.countDocuments(filter),
          reports
            .aggregate<{
              total: number;
              pending: number;
              blocked: number;
              critical: number;
              failed_checks: number;
            }>([
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  pending: {
                    $sum: {
                      $cond: [{ $eq: ["$review_status", "pending"] }, 1, 0],
                    },
                  },
                  blocked: {
                    $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] },
                  },
                  critical: {
                    $sum: {
                      $cond: [
                        {
                          $gt: [
                            {
                              $size: {
                                $filter: {
                                  input: "$findings",
                                  as: "finding",
                                  cond: {
                                    $eq: ["$$finding.severity", "critical"],
                                  },
                                },
                              },
                            },
                            0,
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  failed_checks: {
                    $sum: {
                      $size: {
                        $filter: {
                          input: "$verification",
                          as: "check",
                          cond: { $eq: ["$$check.result", "failed"] },
                        },
                      },
                    },
                  },
                },
              },
              { $project: { _id: 0 } },
            ])
            .toArray(),
        ]);
        return json({
          items,
          total,
          page,
          pages: Math.max(1, Math.ceil(total / limit)),
          summary: summaryRows[0] || {
            total: 0,
            pending: 0,
            blocked: 0,
            critical: 0,
            failed_checks: 0,
          },
        });
      }
      if (method === "POST") {
        requirePermission(user, "agent.report.manage");
        const input = agentReportInput.parse(await req.json());
        const now = new Date().toISOString();
        const report: AgentReport = {
          id: randomUUID(),
          ...input,
          review_status: "pending",
          reviews: [],
          created_at: now,
          created_by: user.id,
          updated_at: now,
        };
        const inserted = await reports.updateOne(
          { run_id: report.run_id, agent_name: report.agent_name },
          { $setOnInsert: report },
          { upsert: true },
        );
        const stored = await reports.findOne(
          { run_id: report.run_id, agent_name: report.agent_name },
          { projection: { _id: 0 } },
        );
        if (inserted.upsertedCount)
          await audit(req, "agent_report.created", user, {
            report_id: report.id,
            run_id: report.run_id,
            agent_name: report.agent_name,
            recommendation: report.recommendation,
          });
        return json(stored, inserted.upsertedCount ? 201 : 200);
      }
    }
    if (
      path.length === 3 &&
      path[0] === "admin" &&
      path[1] === "agent-reports" &&
      method === "GET" &&
      user
    ) {
      requirePermission(user, "agent.report.view");
      const report = await database
        .collection<AgentReport>("agent_reports")
        .findOne({ id: path[2] }, { projection: { _id: 0 } });
      if (!report) throw new HttpError(404, "Agent raporu bulunamadı.");
      return json(report);
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "agent-reports" &&
      path[3] === "review" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "agent.report.manage");
      const input = agentReportReviewInput.parse(await req.json());
      const now = new Date().toISOString();
      const review = {
        id: randomUUID(),
        decision: input.decision,
        note: input.note,
        reviewed_at: now,
        reviewed_by: user.id,
      };
      const result = await database
        .collection<AgentReport>("agent_reports")
        .findOneAndUpdate(
          { id: path[2] },
          {
            $set: { review_status: input.decision, updated_at: now },
            $push: { reviews: review },
          },
          { returnDocument: "after", projection: { _id: 0 } },
        );
      if (!result) throw new HttpError(404, "Agent raporu bulunamadı.");
      await audit(req, "agent_report.reviewed", user, {
        report_id: path[2],
        decision: input.decision,
        review_id: review.id,
      });
      return json(result);
    }
    if (route === "admin/accounts" && user) {
      requireManager(user);
      const scope =
        user.role === "platform" ? {} : { partner_id: user.partner_id };
      if (method === "GET") {
        return json(
          await database
            .collection("users")
            .find(
              { ...scope, role: { $in: ["partner", "owner"] } },
              {
                projection: {
                  _id: 0,
                  id: 1,
                  email: 1,
                  display_name: 1,
                  role: 1,
                  staff_role: 1,
                  partner_id: 1,
                  owner_event_id: 1,
                  disabled: 1,
                  media_permissions: 1,
                  assigned_event_ids: 1,
                },
              },
            )
            .sort({ display_name: 1 })
            .toArray(),
        );
      }
      if (method === "POST") {
        const data = accountInput
          .extend({
            partner_id: z.string().min(1).max(100).optional(),
            staff_role: z
              .enum([
                "partner_sales",
                "partner_operations_design",
                "photographer",
                "print_vendor",
              ])
              .default("partner_sales"),
            media_permissions: z
              .object({
                view: z.boolean(),
                download: z.boolean(),
                manage: z.boolean(),
                archive: z.boolean(),
              })
              .optional(),
          })
          .parse(await req.json());
        const partner_id =
          user.role === "platform"
            ? data.partner_id || "platform"
            : user.partner_id!;
        const id = randomUUID();
        await database.collection("users").insertOne({
          id,
          email: data.username,
          display_name: data.display_name,
          ...(await passwordFields(data.password)),
          role: "partner",
          staff_role: data.staff_role,
          partner_id,
          media_permissions: {
            view: false,
            download: false,
            manage: false,
            archive: false,
          },
          must_change_password: true,
          disabled: false,
        });
        await audit(req, "account.created", user, { user_id: id, partner_id });
        return json({ id }, 201);
      }
    }
    if (route === "admin/photographers" && method === "GET" && user) {
      requireManager(user);
      const photographers = await database
        .collection("users")
        .find(
          { role: "partner", staff_role: "photographer", disabled: false },
          { projection: { _id: 0, id: 1, display_name: 1, partner_id: 1 } },
        )
        .sort({ display_name: 1 })
        .toArray();
      const partnerIds = [
        ...new Set(
          photographers
            .map((photographer) => photographer.partner_id)
            .filter((id): id is string => typeof id === "string"),
        ),
      ];
      const partners = await database
        .collection("partners")
        .find(
          { id: { $in: partnerIds } },
          { projection: { _id: 0, id: 1, name: 1, logo_url: 1 } },
        )
        .toArray();
      const partnerById = new Map(
        partners.map((partner) => [partner.id, partner]),
      );
      return json(
        photographers.map((photographer) => {
          const partner = partnerById.get(photographer.partner_id);
          return {
            ...photographer,
            partner_name: partner?.name || "",
            logo_url: partner?.logo_url || "",
          };
        }),
      );
    }
    if (route === "admin/print-vendors" && method === "GET" && user) {
      requirePermission(user, "print_job.manage");
      return json(
        await database
          .collection("users")
          .find(
            { role: "partner", staff_role: "print_vendor", disabled: false },
            {
              projection: {
                _id: 0,
                id: 1,
                display_name: 1,
                partner_id: 1,
              },
            },
          )
          .sort({ display_name: 1 })
          .toArray(),
      );
    }
    if (route === "admin/print-jobs" && user) {
      const printJobs = database.collection<PrintJob>("print_jobs");
      if (method === "GET") {
        if (
          !accountHasPermission(user, "print_job.manage") &&
          !accountHasPermission(user, "print_job.view_assigned")
        )
          throw new HttpError(403, "Baskı işlerini görme yetkiniz yok.");
        const scope = accountHasPermission(user, "print_job.manage")
          ? {}
          : { printer_account_id: user.id };
        return json(
          await printJobs
            .find(scope, { projection: { _id: 0 } })
            .sort({ created_at: -1 })
            .limit(250)
            .toArray(),
        );
      }
      if (method === "POST") {
        requirePermission(user, "print_job.manage");
        const input = z
          .object({
            wedding_id: z.string().uuid(),
            printer_account_id: z.string().uuid(),
            product_description: z.string().trim().min(3).max(240),
            quantity: z.number().int().min(1).max(100000),
            due_date: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .nullable()
              .default(null),
            production_notes: z.string().trim().max(2000).default(""),
          })
          .strict()
          .parse(await req.json());
        const event = await weddings.findOne(
          { id: input.wedding_id },
          { projection: { _id: 0 } },
        );
        if (!event) throw new HttpError(404, "Organizasyon bulunamadı.");
        const printSource = approvedPrintSource(event);
        if (!printSource)
          throw new HttpError(
            409,
            "Baskı işi oluşturmak için QR tasarımının müşteri onayı gerekir.",
          );
        const requestProduct = qrProducts.find(
          (product) => product.id === printSource.productId,
        );
        const printer = await database.collection<Account>("users").findOne({
          id: input.printer_account_id,
          role: "partner",
          staff_role: "print_vendor",
          disabled: false,
        });
        if (!printer?.partner_id)
          throw new HttpError(400, "Aktif baskıcı hesabı bulunamadı.");
        const now = new Date().toISOString();
        let designSnapshotId =
          printSource.source === "legacy_design"
            ? event.design_snapshot_id
            : undefined;
        const designRevision = printSource.revision;
        if (!designSnapshotId) {
          const snapshot = await database
            .collection("design_snapshots")
            .findOneAndUpdate(
              { wedding_id: event.id, revision: designRevision },
              {
                $setOnInsert: {
                  id: randomUUID(),
                  wedding_id: event.id,
                  revision: designRevision,
                  schema_version: 1,
                  created_at: now,
                  created_by: user.id,
                  configuration: {
                    design: event.design || {
                      qrProductId: requestProduct!.id,
                      design_request: event.design_request,
                    },
                    event: {
                      slug: event.slug,
                      title: event.title,
                      wedding_date: event.wedding_date,
                    },
                  },
                },
              },
              { upsert: true, returnDocument: "after" },
            );
          designSnapshotId = snapshot!.id;
        }
        if (!designSnapshotId)
          throw new HttpError(500, "Tasarım sürümü kaydedilemedi.");
        const job: PrintJob = {
          id: randomUUID(),
          wedding_id: event.id,
          wedding_title: event.title,
          design_snapshot_id: designSnapshotId,
          design_revision: designRevision,
          qr_product_id: printSource.productId,
          printer_account_id: printer.id,
          printer_partner_id: printer.partner_id,
          printer_name: printer.display_name,
          product_description: input.product_description,
          quantity: input.quantity,
          due_date: input.due_date,
          production_notes: input.production_notes,
          status: "assigned",
          status_version: 1,
          created_at: now,
          created_by: user.id,
          updated_at: now,
          updated_by: user.id,
          status_history: [{ status: "assigned", at: now, by: user.id }],
        };
        await printJobs.insertOne(job);
        await audit(req, "print_job.created", user, {
          print_job_id: job.id,
          wedding_id: job.wedding_id,
          printer_account_id: job.printer_account_id,
          design_snapshot_id: job.design_snapshot_id,
        });
        return json({ ...job, _id: undefined }, 201);
      }
    }
    if (
      path.length >= 3 &&
      path[0] === "admin" &&
      path[1] === "print-jobs" &&
      user
    ) {
      const printJobs = database.collection<PrintJob>("print_jobs");
      if (
        !accountHasPermission(user, "print_job.manage") &&
        !accountHasPermission(user, "print_job.view_assigned")
      )
        throw new HttpError(403, "Baskı işlerine erişim yetkiniz yok.");
      const scope = accountHasPermission(user, "print_job.manage")
        ? { id: path[2] }
        : { id: path[2], printer_account_id: user.id };
      const job = await printJobs.findOne(scope, { projection: { _id: 0 } });
      if (!job) throw new HttpError(404, "Baskı işi bulunamadı.");
      if (path.length === 3 && method === "GET") return json(job);
      if (
        path.length === 4 &&
        path[3] === "production-package" &&
        method === "GET"
      ) {
        if (
          !accountHasPermission(user, "print_job.manage") &&
          !accountHasPermission(user, "print_job.view_assigned")
        )
          throw new HttpError(403, "Üretim paketini görme yetkiniz yok.");
        const snapshot = await database.collection("design_snapshots").findOne(
          { id: job.design_snapshot_id, wedding_id: job.wedding_id },
          {
            projection: {
              _id: 0,
              id: 1,
              wedding_id: 1,
              revision: 1,
              schema_version: 1,
              created_at: 1,
              "configuration.design": 1,
              "configuration.event": 1,
            },
          },
        );
        if (!snapshot)
          throw new HttpError(404, "Onaylı üretim paketi bulunamadı.");
        return json(snapshot);
      }
      if (
        path.length === 4 &&
        path[3] === "production-pdf" &&
        method === "POST"
      ) {
        requirePermission(user, "print_job.manage");
        if (Number(req.headers.get("content-length")) > 105 * 1024 * 1024)
          throw new HttpError(413, "PDF dosyası en fazla 100 MB olabilir.");
        const form = await req.formData();
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > 100 * 1024 * 1024
        )
          throw new HttpError(400, "Geçerli bir PDF seçin (en fazla 100 MB).");
        const body = Buffer.from(await file.arrayBuffer());
        if (
          file.type !== "application/pdf" ||
          body.toString("ascii", 0, 5) !== "%PDF-" ||
          !body
            .subarray(Math.max(0, body.length - 2048))
            .includes(Buffer.from("%%EOF"))
        )
          throw new HttpError(
            400,
            "Dosya geçerli ve tamamlanmış bir PDF değil.",
          );
        const key = `print-jobs/${job.id}/${randomUUID()}.pdf`;
        const { client, bucket } = storage();
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: "application/pdf",
          }),
        );
        const now = new Date().toISOString();
        const previousPath = job.production_pdf?.storage_path;
        const updated = await printJobs.findOneAndUpdate(
          { ...scope, status_version: job.status_version },
          {
            $set: {
              production_pdf: {
                storage_path: key,
                file_name: file.name.toLowerCase().endsWith(".pdf")
                  ? file.name.slice(0, 180)
                  : "baski-dosyasi.pdf",
                size_bytes: file.size,
                uploaded_at: now,
                uploaded_by: user.id,
              },
              updated_at: now,
              updated_by: user.id,
            },
            $inc: { status_version: 1 },
          },
          { returnDocument: "after", projection: { _id: 0 } },
        );
        if (!updated) {
          await deleteObject(key);
          throw new HttpError(409, "Baskı işi başka bir oturumda güncellendi.");
        }
        if (previousPath) await deleteObject(previousPath);
        await audit(req, "print_job.pdf_uploaded", user, {
          print_job_id: job.id,
          size_bytes: file.size,
          replaced: !!previousPath,
        });
        return json(updated);
      }
      if (
        path.length === 4 &&
        path[3] === "production-pdf" &&
        method === "GET"
      ) {
        if (!job.production_pdf)
          throw new HttpError(404, "Baskıya hazır PDF henüz yüklenmedi.");
        const { client, bucket } = storage();
        const object = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: job.production_pdf.storage_path,
          }),
        );
        if (!object.Body) throw new HttpError(404, "PDF dosyası bulunamadı.");
        await audit(req, "print_job.pdf_downloaded", user, {
          print_job_id: job.id,
        });
        return new NextResponse(
          object.Body.transformToWebStream() as ReadableStream,
          {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(job.production_pdf.file_name)}`,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      }
      if (
        path.length === 4 &&
        path[3] === "printer-preflight" &&
        method === "POST"
      ) {
        requirePermission(user, "print_job.update_status");
        if (
          user.staff_role !== "print_vendor" ||
          job.printer_account_id !== user.id
        )
          throw new HttpError(
            403,
            "Matbaa kontrolünü yalnızca atanan baskıcı onaylayabilir.",
          );
        if (job.status !== "downloaded")
          throw new HttpError(
            409,
            "Matbaa kontrolü PDF indirildikten sonra yapılabilir.",
          );
        if (!job.production_pdf)
          throw new HttpError(409, "Baskı PDF'i bulunamadı.");
        const input = z
          .object({
            color_profile_confirmed: z.literal(true),
            fonts_confirmed: z.literal(true),
            resolution_confirmed: z.literal(true),
            bleed_and_trim_confirmed: z.literal(true),
            note: z.string().trim().max(1000).default(""),
            version: z.number().int().positive(),
          })
          .strict()
          .parse(await req.json());
        const now = new Date().toISOString();
        const changed = await printJobs.findOneAndUpdate(
          {
            ...scope,
            status: "downloaded",
            status_version: input.version,
          },
          {
            $set: {
              printer_preflight: {
                color_profile_confirmed: true,
                fonts_confirmed: true,
                resolution_confirmed: true,
                bleed_and_trim_confirmed: true,
                note: input.note,
                confirmed_at: now,
                confirmed_by: user.id,
              },
              updated_at: now,
              updated_by: user.id,
            },
            $inc: { status_version: 1 },
          },
          { returnDocument: "after", projection: { _id: 0 } },
        );
        if (!changed)
          throw new HttpError(409, "Baskı işi başka bir oturumda güncellendi.");
        await audit(req, "print_job.printer_preflight_confirmed", user, {
          print_job_id: job.id,
        });
        return json(changed);
      }
      if (
        path.length === 4 &&
        path[3] === "delivery-proof" &&
        method === "POST"
      ) {
        requirePermission(user, "print_job.manage");
        if (job.status !== "delivered_to_partner")
          throw new HttpError(
            409,
            "Teslim kanıtı yalnızca tamamlanan teslimata eklenebilir.",
          );
        const form = await req.formData();
        const file = form.get("file");
        const recipientName = String(form.get("recipient_name") || "").trim();
        if (recipientName.length < 2 || recipientName.length > 120)
          throw new HttpError(400, "Teslim alan kişinin adı gerekli.");
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > 10 * 1024 * 1024
        )
          throw new HttpError(
            400,
            "En fazla 10 MB PDF, JPG veya PNG kanıt dosyası seçin.",
          );
        const body = Buffer.from(await file.arrayBuffer());
        const mimeType =
          file.type === "application/pdf" &&
          body.toString("ascii", 0, 5) === "%PDF-"
            ? "application/pdf"
            : file.type === "image/jpeg" &&
                body.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
              ? "image/jpeg"
              : file.type === "image/png" &&
                  body
                    .subarray(0, 8)
                    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
                ? "image/png"
                : null;
        if (!mimeType)
          throw new HttpError(400, "Teslim kanıtı dosya türü geçersiz.");
        const extension =
          mimeType === "application/pdf"
            ? "pdf"
            : mimeType === "image/png"
              ? "png"
              : "jpg";
        const key = `print-jobs/${job.id}/delivery-proof-${randomUUID()}.${extension}`;
        const { client, bucket } = storage();
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: mimeType,
          }),
        );
        const now = new Date().toISOString();
        const previousPath = job.delivery_proof?.storage_path;
        await printJobs.updateOne(scope, {
          $set: {
            delivery_proof: {
              recipient_name: recipientName,
              file_name: file.name.slice(0, 180),
              mime_type: mimeType,
              storage_path: key,
              size_bytes: file.size,
              uploaded_at: now,
              uploaded_by: user.id,
            },
            updated_at: now,
            updated_by: user.id,
          },
        });
        if (previousPath) await deleteObject(previousPath);
        await audit(req, "print_job.delivery_proof_uploaded", user, {
          print_job_id: job.id,
          recipient_name: recipientName,
        });
        return json({ ok: true });
      }
      if (
        path.length === 4 &&
        path[3] === "delivery-proof" &&
        method === "GET"
      ) {
        requirePermission(user, "print_job.manage");
        if (!job.delivery_proof)
          throw new HttpError(404, "Teslim kanıtı bulunamadı.");
        const { client, bucket } = storage();
        const object = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: job.delivery_proof.storage_path,
          }),
        );
        if (!object.Body) throw new HttpError(404, "Teslim kanıtı bulunamadı.");
        return new NextResponse(
          object.Body.transformToWebStream() as ReadableStream,
          {
            headers: {
              "Content-Type": job.delivery_proof.mime_type,
              "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(job.delivery_proof.file_name)}`,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      }
      if (path.length === 4 && path[3] === "status" && method === "PATCH") {
        if (
          !accountHasPermission(user, "print_job.manage") &&
          !accountHasPermission(user, "print_job.update_status")
        )
          throw new HttpError(403, "Baskı durumunu değiştirme yetkiniz yok.");
        const input = z
          .object({
            status: z.enum([
              "assigned",
              "downloaded",
              "printing",
              "ready",
              "received_by_shineqr",
              "quality_checked",
              "delivered_to_partner",
              "cancelled",
            ]),
            version: z.number().int().positive(),
            note: z.string().trim().max(1000).default(""),
            carrier: z.string().trim().max(120).optional(),
            tracking_code: z.string().trim().max(120).optional(),
          })
          .strict()
          .parse(await req.json());
        const actor = accountHasPermission(user, "print_job.manage")
          ? "platform"
          : "printer";
        if (!canTransitionPrintJob(job.status, input.status, actor))
          throw new HttpError(409, "Bu baskı durumu geçişine izin verilmiyor.");
        if (input.status === "printing" && !job.printer_preflight)
          throw new HttpError(
            409,
            "Baskıdan önce matbaa kontrol formunu tamamlayın.",
          );
        if (
          [
            "received_by_shineqr",
            "quality_checked",
            "delivered_to_partner",
          ].includes(input.status) &&
          input.note.length < 3
        )
          throw new HttpError(
            400,
            "Bu teslimat adımı için en az 3 karakterlik not gerekli.",
          );
        const now = new Date().toISOString();
        const recordsStatus = [
          "ready",
          "received_by_shineqr",
          "quality_checked",
          "delivered_to_partner",
        ].includes(input.status);
        const changed = await printJobs.findOneAndUpdate(
          { ...scope, status: job.status, status_version: input.version },
          {
            $set: {
              status: input.status,
              updated_at: now,
              updated_by: user.id,
            },
            $inc: { status_version: 1 },
            $push: {
              status_history: { status: input.status, at: now, by: user.id },
              ...(recordsStatus
                ? {
                    fulfillment_records: {
                      status: input.status,
                      note: input.note,
                      ...(input.carrier ? { carrier: input.carrier } : {}),
                      ...(input.tracking_code
                        ? { tracking_code: input.tracking_code }
                        : {}),
                      at: now,
                      by: user.id,
                    },
                  }
                : {}),
            },
          },
          { returnDocument: "after", projection: { _id: 0 } },
        );
        if (!changed)
          throw new HttpError(
            409,
            "Baskı işi başka bir oturumda güncellendi. Sayfayı yenileyin.",
          );
        await audit(req, "print_job.status_changed", user, {
          print_job_id: job.id,
          from: job.status,
          to: input.status,
        });
        return json(changed);
      }
    }
    if (route === "admin/business-directory" && method === "GET" && user) {
      requireManager(user);
      return json(
        await database
          .collection("partners")
          .find(
            { active: true },
            { projection: { _id: 0, id: 1, name: 1, business_types: 1 } },
          )
          .sort({ name: 1 })
          .toArray(),
      );
    }
    if (
      path.length === 3 &&
      path[0] === "admin" &&
      path[1] === "accounts" &&
      method === "PATCH" &&
      user
    ) {
      requireManager(user);
      if (path[2] === user.id)
        throw new HttpError(400, "Kendi hesabınızı buradan değiştiremezsiniz.");
      const target = await database.collection("users").findOne({
        id: path[2],
        ...(user.role === "platform" ? {} : { partner_id: user.partner_id }),
        role: { $in: ["partner", "owner"] },
      });
      if (!target) throw new HttpError(404, "Hesap bulunamadı.");
      const changes = z
        .object({
          disabled: z.boolean().optional(),
          media_permissions: z
            .object({
              view: z.boolean(),
              download: z.boolean(),
              manage: z.boolean(),
              archive: z.boolean(),
            })
            .optional(),
        })
        .refine((value) => Object.keys(value).length > 0)
        .parse(await req.json());
      await database
        .collection("users")
        .updateOne({ id: target.id }, { $set: changes });
      invalidateSessionCache();
      if (changes.disabled !== undefined)
        await database.collection("sessions").deleteMany({ userId: target.id });
      await audit(req, "account.updated", user, {
        user_id: target.id,
        fields: Object.keys(changes),
      });
      return json({ ok: true });
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "accounts" &&
      path[3] === "reset-password" &&
      method === "POST" &&
      user
    ) {
      requireManager(user);
      if (path[2] === user.id)
        throw new HttpError(
          400,
          "Kendi parolanızı hesap ayarlarından değiştirin.",
        );
      const target = await database.collection("users").findOne({
        id: path[2],
        ...(user.role === "platform" ? {} : { partner_id: user.partner_id }),
        role: { $in: ["partner", "owner"] },
      });
      if (!target) throw new HttpError(404, "Hesap bulunamadı.");
      const data = z
        .object({ password: passwordSchema })
        .parse(await req.json());
      await database.collection("users").updateOne(
        { id: target.id },
        {
          $set: {
            ...(await passwordFields(data.password)),
            must_change_password: true,
          },
        },
      );
      await database.collection("sessions").deleteMany({ userId: target.id });
      invalidateSessionCache();
      await audit(req, "account.password_reset", user, {
        user_id: target.id,
        partner_id: target.partner_id,
      });
      return json({ ok: true });
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "accounts" &&
      path[3] === "preview" &&
      method === "POST" &&
      user
    ) {
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
        id: randomUUID(),
        token: hash(token),
        preview: true,
        actorUserId: user.id,
        actorDisplayName: user.display_name,
        targetUserId: target.id,
        expiresAt,
        createdAt: new Date(),
      });
      (await cookies()).set("wm_preview", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
      });
      invalidateSessionCache();
      await audit(req, "account.preview_started", user, {
        target_user_id: target.id,
      });
      return json({ ok: true });
    }
    if (route === "admin/partner-overview" && method === "GET" && user) {
      requireManager(user);
      const weddingFilter =
        user.role === "platform" ? {} : { partner_id: user.partner_id! };
      const accountFilter =
        user.role === "platform"
          ? { role: { $in: ["partner", "owner"] } }
          : {
              partner_id: user.partner_id!,
              role: { $in: ["partner", "owner"] },
            };
      const [eventRows, accounts] = await Promise.all([
        weddings
          .find(weddingFilter, {
            projection: {
              _id: 0,
              id: 1,
              partner_id: 1,
              lifecycle_status: 1,
              photo_count: 1,
              video_count: 1,
              media_bytes: 1,
            },
          })
          .toArray(),
        database
          .collection("users")
          .find(accountFilter, {
            projection: { _id: 0, id: 1, role: 1, partner_id: 1, disabled: 1 },
          })
          .toArray(),
      ]);
      const grouped = new Map<
        string,
        {
          partner_id: string;
          events: number;
          customers: number;
          accounts: number;
          media: number;
          bytes: number;
        }
      >();
      for (const row of eventRows) {
        const value = grouped.get(row.partner_id) || {
          partner_id: row.partner_id,
          events: 0,
          customers: 0,
          accounts: 0,
          media: 0,
          bytes: 0,
        };
        value.events++;
        value.media += (row.photo_count || 0) + (row.video_count || 0);
        value.bytes += row.media_bytes || 0;
        grouped.set(row.partner_id, value);
      }
      for (const account of accounts) {
        const key = account.partner_id || "platform";
        const value = grouped.get(key) || {
          partner_id: key,
          events: 0,
          customers: 0,
          accounts: 0,
          media: 0,
          bytes: 0,
        };
        value.accounts++;
        if (account.role === "owner") value.customers++;
        grouped.set(key, value);
      }
      return json({
        items: [...grouped.values()],
        relationship_model: "one-owner-per-event",
        usage_rights: {
          enforcement: "not-configured",
          reason: "Paket ve kota iş kuralları doğrulanmadı.",
        },
      });
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "weddings" &&
      path[3] === "payment-quote" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "organization.update");
      const event = await eventFor(user, path[2]);
      const quote = await createPaymentQuote(database, event, user.id);
      await audit(req, "payment_quote.created", user, {
        quote_id: quote.id,
        wedding_id: event.id,
        gross_cents: quote.gross_cents,
      });
      return json(quote, 201);
    }
    if (route === "admin/finance/packages" && user && method === "GET") {
      requirePermission(
        user,
        user.role === "platform" ? "finance.view_all" : "finance.view_own",
      );
      const result = await currentPackages(database);
      if (user.role === "platform") return json(result);
      return json({
        ...result,
        items: result.items.map(
          ({
            variable_cost_cents: _cost,
            target_margin_bps: _margin,
            updated_by: _updatedBy,
            ...item
          }) => item,
        ),
      });
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "finance" &&
      path[2] === "packages" &&
      method === "PATCH" &&
      user
    ) {
      requirePermission(user, "commission.manage");
      const code = z.enum(["plan-1", "plan-2", "plan-3"]).parse(path[3]);
      const changes = z
        .object({
          name: z.string().trim().min(2).max(120).optional(),
          description: z.string().trim().max(1000).optional(),
          grossPriceCents: z.number().int().min(0).max(100_000_000).optional(),
          miniQrCount: z.number().int().min(0).max(10000).optional(),
          welcomeSignCount: z.number().int().min(0).max(1000).optional(),
          active: z.boolean().optional(),
          display_order: z.number().int().min(0).max(1000).optional(),
          featured: z.boolean().optional(),
          vat_rate_bps: z.number().int().min(0).max(10_000).optional(),
          target_margin_bps: z.number().int().min(0).max(9900).optional(),
          variable_cost_cents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .optional(),
          hardStorageBytes: z
            .number()
            .int()
            .min(0)
            .max(Number.MAX_SAFE_INTEGER)
            .nullable()
            .optional(),
          fairUseSoftCapBytes: z
            .number()
            .int()
            .min(0)
            .max(Number.MAX_SAFE_INTEGER)
            .nullable()
            .optional(),
          uploadWindow: z.enum(["event-day", "seven-days"]).optional(),
          digitalRetentionMonths: z.number().int().min(1).max(120).optional(),
          physicalRetentionMonths: z.number().int().min(0).max(120).optional(),
          revisionLimit: z.number().int().min(0).max(100).nullable().optional(),
          includedEventCount: z.number().int().min(1).max(100).optional(),
          secondEventPrintingIncluded: z.boolean().optional(),
          qualifiesForVolumeCommission: z.boolean().optional(),
          digitalInvitationIncluded: z.boolean().optional(),
          tableQrCount: z.number().int().min(0).max(10_000).optional(),
          campaign_starts_at: z.string().datetime().nullable().optional(),
          campaign_ends_at: z.string().datetime().nullable().optional(),
          compare_at_gross_cents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .nullable()
            .optional(),
        })
        .refine(
          (value) => Object.keys(value).length > 0,
          "En az bir alan değiştirilmeli.",
        )
        .parse(await req.json());
      const previous = await currentPackage(database, code, true);
      const now = new Date().toISOString();
      const next: PackageConfiguration = {
        ...previous,
        ...changes,
        version: previous.version + 1,
        updated_at: now,
        updated_by: user.id,
      };
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          await database
            .collection<PackageConfiguration>("package_configurations")
            .replaceOne({ code }, next, { upsert: true, session: transaction });
          await database.collection("pricing_change_history").insertOne(
            {
              id: randomUUID(),
              entity_type: "package",
              entity_id: code,
              previous,
              next,
              changed_fields: Object.keys(changes),
              changed_at: now,
              changed_by: user.id,
            },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "pricing.package.updated", user, {
        code,
        previous,
        next,
      });
      return json(next);
    }
    if (route === "admin/finance/photographer-package" && user) {
      requirePermission(
        user,
        user.role === "platform" ? "finance.view_all" : "finance.view_own",
      );
      if (method === "GET") {
        const item = await currentPhotographerPackage(database, true);
        if (user.role === "platform") return json(item);
        return json({
          code: item.code,
          name: item.name,
          description: item.description,
          grossPriceCents: item.grossPriceCents,
          active: item.active,
        });
      }
      if (method !== "PATCH")
        throw new HttpError(405, "Desteklenmeyen yöntem.");
      requirePermission(user, "commission.manage");
      const changes = z
        .object({
          name: z.string().trim().min(2).max(120).optional(),
          description: z.string().trim().max(1000).optional(),
          grossPriceCents: z.number().int().min(0).max(100_000_000).optional(),
          vatRateBps: z.number().int().min(0).max(10_000).optional(),
          digitalRetentionMonths: z.number().int().min(1).max(120).optional(),
          photographerGrossCents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .optional(),
          originatingPartnerGrossCents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .optional(),
          platformGrossCents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .optional(),
          active: z.boolean().optional(),
        })
        .refine(
          (value) => Object.keys(value).length > 0,
          "En az bir alan değiştirilmeli.",
        )
        .parse(await req.json());
      const previous = await currentPhotographerPackage(database, true);
      const now = new Date().toISOString();
      const next: PhotographerPackageConfiguration = {
        ...previous,
        ...changes,
        version: previous.version + 1,
        updated_at: now,
        updated_by: user.id,
      };
      const allocation =
        next.photographerGrossCents +
        next.originatingPartnerGrossCents +
        next.platformGrossCents;
      if (allocation !== next.grossPriceCents)
        throw new HttpError(
          400,
          "Fotoğrafçı, kaynak işletme ve platform payları toplam satış fiyatına eşit olmalı.",
        );
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          await database
            .collection<PhotographerPackageConfiguration>(
              "photographer_package_configurations",
            )
            .replaceOne({ code: next.code }, next, {
              upsert: true,
              session: transaction,
            });
          await database.collection("pricing_change_history").insertOne(
            {
              id: randomUUID(),
              entity_type: "photographer_package",
              entity_id: next.code,
              previous,
              next,
              changed_fields: Object.keys(changes),
              changed_at: now,
              changed_by: user.id,
            },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "pricing.photographer_package.updated", user, {
        previous,
        next,
      });
      return json(next);
    }
    if (route === "admin/finance/commission-policies" && user) {
      if (method === "GET") {
        requirePermission(
          user,
          user.role === "platform" ? "finance.view_all" : "commission.view_own",
        );
        const scope =
          user.role === "platform"
            ? { active: true }
            : { active: true, partner_id: user.partner_id! };
        const [policies, partners] = await Promise.all([
          database
            .collection<PartnerCommissionPolicy>("partner_commission_policies")
            .find(scope, { projection: { _id: 0 } })
            .sort({ partner_id: 1, version: -1 })
            .toArray(),
          database
            .collection("partners")
            .find(user.role === "platform" ? {} : { id: user.partner_id! }, {
              projection: {
                _id: 0,
                id: 1,
                name: 1,
                business_types: 1,
                active: 1,
              },
            })
            .toArray(),
        ]);
        const latest = new Map<string, PartnerCommissionPolicy>();
        for (const policy of policies)
          if (!latest.has(policy.partner_id))
            latest.set(policy.partner_id, policy);
        const period = istanbulCalendarMonth(new Date());
        const counters = await database
          .collection("monthly_sales_counters")
          .find({
            partner_id: { $in: partners.map((item) => item.id) },
            period,
          })
          .toArray();
        return json(
          partners.map((partner) => ({
            ...partner,
            policy: latest.get(String(partner.id)) || null,
            period,
            monthly_valid_sales: Number(
              counters.find((item) => item.partner_id === partner.id)
                ?.net_count || 0,
            ),
          })),
        );
      }
      if (method === "POST") {
        requirePermission(user, "commission.manage");
        const input = z
          .object({
            partner_id: z.string().trim().min(1).max(100),
            base_rate_bps: z.number().int().min(0).max(10_000),
            threshold: z.number().int().min(1).max(10_000).default(10),
            elevated_rate_bps: z.number().int().min(0).max(10_000),
            tiered: z.boolean().default(true),
            qualifying_package_codes: z
              .array(z.enum(["plan-1", "plan-2", "plan-3"]))
              .min(1),
            effective_from: z.string().datetime(),
          })
          .parse(await req.json());
        const now = new Date().toISOString();
        const current = await database
          .collection<PartnerCommissionPolicy>("partner_commission_policies")
          .findOne(
            { partner_id: input.partner_id, active: true },
            { sort: { version: -1 } },
          );
        const policy: PartnerCommissionPolicy = {
          id: randomUUID(),
          ...input,
          version: (current?.version || 0) + 1,
          active: true,
          created_at: now,
          created_by: user.id,
          updated_at: now,
          updated_by: user.id,
        };
        const tx = (await mongoClient()).startSession();
        try {
          await tx.withTransaction(async () => {
            await database
              .collection<PartnerCommissionPolicy>(
                "partner_commission_policies",
              )
              .insertOne(policy, { session: tx });
            await database.collection("pricing_change_history").insertOne(
              {
                id: randomUUID(),
                entity_type: "commission_policy",
                entity_id: input.partner_id,
                previous: current || null,
                next: policy,
                changed_fields: Object.keys(input),
                changed_at: now,
                changed_by: user.id,
              },
              { session: tx },
            );
          });
        } finally {
          await tx.endSession();
        }
        await audit(req, "commission.policy.updated", user, {
          partner_id: input.partner_id,
          previous: current || null,
          next: policy,
        });
        return json(policy, 201);
      }
    }
    if (route === "admin/finance/tax" && user) {
      requirePermission(user, "finance.view_all");
      const taxes = database.collection<TaxConfiguration>("tax_configurations");
      if (method === "GET")
        return json(
          await taxes.findOne({ id: "default" }, { projection: { _id: 0 } }),
        );
      requirePermission(user, "commission.manage");
      const input = z
        .object({
          default_vat_rate_bps: z.number().int().min(0).max(10_000),
          category_vat_rate_bps: z
            .record(z.string(), z.number().int().min(0).max(10_000))
            .default({}),
          carried_vat_cents: z.number().int().min(0),
          effective_from: z.string().datetime(),
        })
        .parse(await req.json());
      const previous = await taxes.findOne({ id: "default" });
      const next: TaxConfiguration = {
        id: "default",
        ...input,
        version: (previous?.version || 0) + 1,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          await taxes.replaceOne({ id: "default" }, next, {
            upsert: true,
            session: transaction,
          });
          await database.collection("pricing_change_history").insertOne(
            {
              id: randomUUID(),
              entity_type: "tax_configuration",
              entity_id: "default",
              previous,
              next,
              changed_fields: Object.keys(input),
              changed_at: next.updated_at,
              changed_by: user.id,
            },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "tax.configuration.updated", user, { previous, next });
      return json(next);
    }
    if (route === "admin/finance/expenses" && user) {
      requirePermission(user, "finance.view_all");
      const expenses = database.collection<ExpenseRecord>("expense_records");
      if (method === "GET")
        return json(
          await expenses
            .find(
              {
                $or: [
                  { archived_at: null },
                  { archived_at: { $exists: false } },
                ],
              },
              { projection: { _id: 0 } },
            )
            .sort({ payment_date: -1 })
            .limit(500)
            .toArray(),
        );
      const input = z
        .object({
          name: z.string().trim().min(2).max(160),
          category: z.string().trim().min(2).max(80),
          amount_cents: z.number().int().min(0),
          vat_rate_bps: z.number().int().min(0).max(10_000).default(2000),
          deductible_vat: z.boolean().default(false),
          kind: z.enum(["fixed", "variable"]),
          recurrence: z.enum(["once", "monthly", "yearly"]),
          payment_status: z.enum(["planned", "paid"]),
          payment_date: z.string().date(),
          order_id: z.string().trim().optional(),
          estimated: z.boolean().default(false),
        })
        .parse(await req.json());
      const now = new Date().toISOString();
      const expense: ExpenseRecord = {
        id: randomUUID(),
        ...input,
        currency: "TRY",
        created_at: now,
        created_by: user.id,
        updated_at: now,
        updated_by: user.id,
      };
      const transaction = (await mongoClient()).startSession();
      try {
        await transaction.withTransaction(async () => {
          await expenses.insertOne(expense, { session: transaction });
          await database.collection("pricing_change_history").insertOne(
            {
              id: randomUUID(),
              entity_type: "expense",
              entity_id: expense.id,
              previous: null,
              next: expense,
              changed_fields: Object.keys(input),
              changed_at: now,
              changed_by: user.id,
            },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "expense.created", user, {
        expense_id: expense.id,
        amount_cents: expense.amount_cents,
      });
      return json(expense, 201);
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "finance" &&
      path[2] === "expenses" &&
      user
    ) {
      requirePermission(user, "finance.view_all");
      const expenses = database.collection<ExpenseRecord>("expense_records");
      const previous = await expenses.findOne(
        {
          id: path[3],
          $or: [{ archived_at: null }, { archived_at: { $exists: false } }],
        },
        { projection: { _id: 0 } },
      );
      if (!previous) throw new HttpError(404, "Gider kaydı bulunamadı.");
      const now = new Date().toISOString();
      if (method === "DELETE") {
        const next = {
          ...previous,
          archived_at: now,
          archived_by: user.id,
          updated_at: now,
          updated_by: user.id,
        };
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            await expenses.updateOne(
              { id: path[3] },
              {
                $set: {
                  archived_at: now,
                  archived_by: user.id,
                  updated_at: now,
                  updated_by: user.id,
                },
              },
              { session: transaction },
            );
            await database.collection("pricing_change_history").insertOne(
              {
                id: randomUUID(),
                entity_type: "expense",
                entity_id: path[3],
                previous,
                next,
                changed_fields: ["archived_at"],
                changed_at: now,
                changed_by: user.id,
              },
              { session: transaction },
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "expense.archived", user, {
          expense_id: path[3],
          previous,
          next,
        });
        return json(next);
      }
      if (method === "PATCH") {
        const changes = z
          .object({
            name: z.string().trim().min(2).max(160).optional(),
            category: z.string().trim().min(2).max(80).optional(),
            amount_cents: z.number().int().min(0).optional(),
            vat_rate_bps: z.number().int().min(0).max(10_000).optional(),
            deductible_vat: z.boolean().optional(),
            kind: z.enum(["fixed", "variable"]).optional(),
            recurrence: z.enum(["once", "monthly", "yearly"]).optional(),
            payment_status: z.enum(["planned", "paid"]).optional(),
            payment_date: z.string().date().optional(),
            order_id: z.string().trim().optional(),
            estimated: z.boolean().optional(),
          })
          .refine(
            (value) => Object.keys(value).length > 0,
            "En az bir alan değiştirilmeli.",
          )
          .parse(await req.json());
        const next = {
          ...previous,
          ...changes,
          updated_at: now,
          updated_by: user.id,
        };
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            await expenses.updateOne(
              { id: path[3] },
              { $set: { ...changes, updated_at: now, updated_by: user.id } },
              { session: transaction },
            );
            await database.collection("pricing_change_history").insertOne(
              {
                id: randomUUID(),
                entity_type: "expense",
                entity_id: path[3],
                previous,
                next,
                changed_fields: Object.keys(changes),
                changed_at: now,
                changed_by: user.id,
              },
              { session: transaction },
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "expense.updated", user, {
          expense_id: path[3],
          previous,
          next,
        });
        return json(next);
      }
    }
    if (route === "admin/finance/history" && user && method === "GET") {
      requirePermission(user, "finance.view_all");
      const entityType = req.nextUrl.searchParams.get("entity_type");
      const filter = entityType ? { entity_type: entityType } : {};
      return json(
        await database
          .collection("pricing_change_history")
          .find(filter, { projection: { _id: 0 } })
          .sort({ changed_at: -1 })
          .limit(500)
          .toArray(),
      );
    }
    if (route === "admin/finance/profitability" && user && method === "GET") {
      requirePermission(user, "finance.view_all");
      const packageResult = await currentPackages(database);
      const [products, fixedExpenses, salesByPackage] = await Promise.all([
        database
          .collection<AddOnProduct>("add_on_products")
          .find({ active: true })
          .toArray(),
        database
          .collection<ExpenseRecord>("expense_records")
          .find({
            kind: "fixed",
            payment_status: "paid",
            estimated: false,
            $or: [{ archived_at: null }, { archived_at: { $exists: false } }],
          })
          .toArray(),
        database
          .collection<SaleRecord>("sales")
          .aggregate<{ _id: PackageCode; count: number }>([
            { $match: { status: "paid" } },
            { $group: { _id: "$package_code", count: { $sum: 1 } } },
          ])
          .toArray(),
      ]);
      const partnerId =
        req.nextUrl.searchParams.get("partner_id") || "platform";
      const commissionPolicy = await currentCommissionPolicy(
        database,
        partnerId,
        new Date().toISOString(),
      );
      const packageRows = packageResult.items.map((item) => {
        const miniCost =
          products.find(
            (product) =>
              product.category === "qr_print" &&
              product.print_format === "vertical_mini" &&
              product.unit === "item",
          )?.unit_cost_cents || 0;
        const tableCost =
          products.find(
            (product) =>
              product.category === "qr_print" &&
              product.print_format === "table_card" &&
              product.unit === "item",
          )?.unit_cost_cents || 0;
        const signCost =
          products.find((product) => product.effect_type === "welcome_sign")
            ?.unit_cost_cents || 0;
        const variableCost =
          item.variable_cost_cents +
          item.miniQrCount * miniCost +
          (item.tableQrCount || 0) * tableCost +
          item.welcomeSignCount * signCost;
        const rate = commissionRateForOrdinal(commissionPolicy, item.code, 1);
        const result = profitability({
          gross_cents: item.grossPriceCents,
          vat_rate_bps: item.vat_rate_bps,
          variable_cost_cents: variableCost,
          commission_rate_bps: rate,
          payment_rate_bps: 0,
          target_margin_bps: item.target_margin_bps,
        });
        let breakEvenGrossCentsValue: number | null = null;
        let targetGrossCentsValue: number | null = null;
        let calculationWarning: string | null = null;
        try {
          breakEvenGrossCentsValue = breakEvenGrossCents({
            vat_rate_bps: item.vat_rate_bps,
            variable_cost_cents: variableCost,
            commission_rate_bps: rate,
            payment_rate_bps: 0,
          });
          targetGrossCentsValue = targetMarginGrossCents({
            vat_rate_bps: item.vat_rate_bps,
            variable_cost_cents: variableCost,
            commission_rate_bps: rate,
            payment_rate_bps: 0,
            target_margin_bps: item.target_margin_bps,
          });
        } catch (reason) {
          calculationWarning =
            reason instanceof Error ? reason.message : "Fiyat hesaplanamıyor.";
        }
        return {
          ...item,
          variable_cost_cents: variableCost,
          commission_rate_bps: rate,
          ...result,
          break_even_gross_cents: breakEvenGrossCentsValue,
          target_gross_cents: targetGrossCentsValue,
          calculation_warning: calculationWarning,
          sales_count:
            salesByPackage.find((sale) => sale._id === item.code)?.count || 0,
        };
      });
      const monthlyFixedCents = fixedExpenses.reduce(
        (sum, item) =>
          sum +
          (item.recurrence === "yearly"
            ? Math.ceil(item.amount_cents / 12)
            : item.recurrence === "monthly"
              ? item.amount_cents
              : 0),
        0,
      );
      const totalSales = packageRows.reduce(
        (sum, item) => sum + item.sales_count,
        0,
      );
      const weightedContribution =
        totalSales > 0
          ? Math.round(
              packageRows.reduce(
                (sum, item) => sum + item.contribution_cents * item.sales_count,
                0,
              ) / totalSales,
            )
          : packageRows.length
            ? Math.round(
                packageRows.reduce(
                  (sum, item) => sum + item.contribution_cents,
                  0,
                ) / packageRows.length,
              )
            : 0;
      return json({
        packages: packageRows,
        monthly_fixed_cents: monthlyFixedCents,
        weighted_contribution_cents: weightedContribution,
        monthly_break_even_units: monthlyBreakEvenUnits(
          monthlyFixedCents,
          weightedContribution,
        ),
        commission_policy: commissionPolicy,
        payment_cost_assumption: {
          configured: false,
          rate_bps: 0,
          fixed_cents: 0,
        },
      });
    }
    if (route === "admin/finance/overview" && user && method === "GET") {
      requirePermission(
        user,
        user.role === "platform" ? "finance.view_all" : "finance.view_own",
      );
      const scope =
        user.role === "platform"
          ? { status: "paid" as const }
          : { status: "paid" as const, partner_id: user.partner_id! };
      const [salesRows, expenses] = await Promise.all([
        database
          .collection<SaleRecord>("sales")
          .find(scope, { projection: { _id: 0 } })
          .toArray(),
        user.role === "platform"
          ? database
              .collection<ExpenseRecord>("expense_records")
              .find({
                payment_status: "paid",
                estimated: false,
                $or: [
                  { archived_at: null },
                  { archived_at: { $exists: false } },
                ],
              })
              .toArray()
          : Promise.resolve([]),
      ]);
      const totals = salesRows.reduce(
        (sum, sale) => ({
          gross_cents: sum.gross_cents + sale.gross_cents,
          net_cents: sum.net_cents + sale.net_cents,
          vat_cents: sum.vat_cents + sale.vat_cents,
          commission_cents: sum.commission_cents + sale.commission_cents,
          variable_cost_cents:
            sum.variable_cost_cents + (sale.variable_cost_cents || 0),
        }),
        {
          gross_cents: 0,
          net_cents: 0,
          vat_cents: 0,
          commission_cents: 0,
          variable_cost_cents: 0,
        },
      );
      const expenseCents = expenses.reduce(
        (sum, item) => sum + item.amount_cents,
        0,
      );
      if (user.role !== "platform")
        return json({
          sales_count: salesRows.length,
          gross_cents: totals.gross_cents,
          commission_cents: totals.commission_cents,
          remittance_cents: totals.gross_cents - totals.commission_cents,
        });
      return json({
        sales_count: salesRows.length,
        ...totals,
        expense_cents: expenseCents,
        operating_contribution_cents:
          totals.net_cents -
          totals.commission_cents -
          totals.variable_cost_cents -
          expenseCents,
      });
    }
    if (route === "admin/add-ons" && user) {
      const products = database.collection<AddOnProduct>("add_on_products");
      if (method === "GET") {
        if (user.role !== "platform") requirePermission(user, "design.select");
        return json(
          await products
            .find(user.role === "platform" ? {} : { active: true }, {
              projection:
                user.role === "platform"
                  ? { _id: 0 }
                  : { _id: 0, unit_cost_cents: 0 },
            })
            .sort({ active: -1, name: 1 })
            .toArray(),
        );
      }
      requireManager(user);
      if (method === "POST") {
        requirePlatform(user);
        const input = z
          .object({
            code: z
              .string()
              .trim()
              .toUpperCase()
              .regex(/^[A-Z0-9_-]{2,40}$/)
              .optional(),
            name: z.string().trim().min(2).max(120),
            description: z.string().trim().max(500).default(""),
            gross_price_cents: z.number().int().min(0).max(100_000_000),
            unit_cost_cents: z
              .number()
              .int()
              .min(0)
              .max(100_000_000)
              .default(0),
            vat_rate_bps: z.number().int().min(0).max(10_000).optional(),
            quantity: z.number().int().min(1).max(10_000).optional(),
            minimum_quantity: z.number().int().min(1).max(10_000).optional(),
            maximum_quantity: z.number().int().min(1).max(10_000).optional(),
            eligible_package_codes: z
              .array(z.enum(["plan-1", "plan-2", "plan-3"]))
              .default(["plan-1", "plan-2", "plan-3"]),
            image_url: z.string().url().max(1000).optional(),
            commissionable: z.boolean().optional(),
            category: z
              .enum([
                "qr_print",
                "storage_retention",
                "digital",
                "design",
                "organization",
              ])
              .default("digital"),
            unit: z
              .enum(["item", "gib", "month", "service", "organization"])
              .default("service"),
            effect_type: z.enum([
              "print_quantity",
              "welcome_sign",
              "storage_gib",
              "retention_months",
              "digital_invitation",
              "custom_design",
              "second_event",
            ]),
            effect_value: z.number().int().min(1).max(10000).default(1),
            print_format: z.enum(["vertical_mini", "table_card"]).optional(),
            pricing_type: z
              .enum(["fixed", "package_percentage_discount"])
              .default("fixed"),
            percentage_bps: z.number().int().min(1).max(9000).optional(),
            active: z.boolean().default(true),
          })
          .superRefine((value, context) => {
            if (
              value.quantity === undefined &&
              value.maximum_quantity !== undefined &&
              value.minimum_quantity !== undefined &&
              value.maximum_quantity < value.minimum_quantity
            )
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["maximum_quantity"],
                message: "Maksimum adet minimum adetten küçük olamaz.",
              });
            if (
              value.category === "qr_print" &&
              (value.unit !== "item" ||
                value.effect_type !== "print_quantity" ||
                value.effect_value !== 1)
            )
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["effect_value"],
                message:
                  "Ekstra QR ürünü adet biriminde ve birim etkisi 1 olarak tanımlanmalıdır.",
              });
            if (value.pricing_type === "fixed" && value.gross_price_cents < 1)
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["gross_price_cents"],
                message: "Sabit fiyatlı üründe fiyat gerekli.",
              });
            if (
              value.pricing_type === "package_percentage_discount" &&
              !value.percentage_bps
            )
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["percentage_bps"],
                message: "İndirim oranı gerekli.",
              });
            if (
              value.pricing_type === "package_percentage_discount" &&
              value.effect_type !== "second_event"
            )
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["effect_type"],
                message:
                  "Yüzde indirim yalnızca ikinci organizasyon ürününde kullanılabilir.",
              });
            if (
              value.effect_type === "second_event" &&
              value.pricing_type !== "package_percentage_discount"
            )
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["pricing_type"],
                message:
                  "İkinci organizasyon yüzde indirimli fiyatlandırılmalı.",
              });
            if (!validAddOnEffect(value.effect_type, value.effect_value))
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["effect_value"],
                message:
                  "Bu ek ürün için izin verilen miktarlardan birini seçin.",
              });
            if (value.effect_type === "print_quantity" && !value.print_format)
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["print_format"],
                message: "QR baskı tipi gerekli.",
              });
            if (value.effect_type !== "print_quantity" && value.print_format)
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["print_format"],
                message:
                  "Baskı tipi yalnızca QR baskı ürünlerinde kullanılabilir.",
              });
          })
          .parse(await req.json());
        if (input.code && (await products.findOne({ code: input.code })))
          throw new HttpError(409, "Bu ek ürün kodu zaten kullanılıyor.");
        const now = new Date().toISOString();
        const taxConfiguration = await database
          .collection<TaxConfiguration>("tax_configurations")
          .findOne({ id: "default" });
        const { minimum_quantity, maximum_quantity, ...catalogInput } = input;
        const product: AddOnProduct = {
          id: randomUUID(),
          ...catalogInput,
          quantity: input.quantity ?? maximum_quantity ?? minimum_quantity ?? 1,
          vat_rate_bps:
            input.vat_rate_bps ??
            taxConfiguration?.category_vat_rate_bps[input.category] ??
            taxConfiguration?.default_vat_rate_bps ??
            2000,
          commissionable: true,
          created_at: now,
          updated_at: now,
        };
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            await products.insertOne(product, { session: transaction });
            await database.collection("pricing_change_history").insertOne(
              {
                id: randomUUID(),
                entity_type: "add_on_product",
                entity_id: product.id,
                previous: null,
                next: product,
                changed_fields: Object.keys(input),
                changed_at: now,
                changed_by: user.id,
              },
              { session: transaction },
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "add_on.created", user, {
          product_id: product.id,
          gross_price_cents: product.gross_price_cents,
        });
        return json(product, 201);
      }
    }
    if (
      path.length === 3 &&
      path[0] === "admin" &&
      path[1] === "add-ons" &&
      method === "PATCH" &&
      user
    ) {
      requirePlatform(user);
      const changes = z
        .object({
          code: z
            .string()
            .trim()
            .toUpperCase()
            .regex(/^[A-Z0-9_-]{2,40}$/)
            .optional(),
          name: z.string().trim().min(2).max(120).optional(),
          description: z.string().trim().max(500).optional(),
          gross_price_cents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .optional(),
          unit_cost_cents: z.number().int().min(0).max(100_000_000).optional(),
          vat_rate_bps: z.number().int().min(0).max(10_000).optional(),
          quantity: z.number().int().min(1).max(10_000).optional(),
          minimum_quantity: z.number().int().min(1).max(10_000).optional(),
          maximum_quantity: z.number().int().min(1).max(10_000).optional(),
          eligible_package_codes: z
            .array(z.enum(["plan-1", "plan-2", "plan-3"]))
            .optional(),
          image_url: z.string().url().max(1000).optional(),
          category: z
            .enum([
              "qr_print",
              "storage_retention",
              "digital",
              "design",
              "organization",
            ])
            .optional(),
          unit: z
            .enum(["item", "gib", "month", "service", "organization"])
            .optional(),
          effect_type: z
            .enum([
              "print_quantity",
              "welcome_sign",
              "storage_gib",
              "retention_months",
              "digital_invitation",
              "custom_design",
              "second_event",
            ])
            .optional(),
          effect_value: z.number().int().min(1).max(10000).optional(),
          print_format: z.enum(["vertical_mini", "table_card"]).optional(),
          pricing_type: z
            .enum(["fixed", "package_percentage_discount"])
            .optional(),
          percentage_bps: z.number().int().min(1).max(9000).optional(),
          active: z.boolean().optional(),
        })
        .refine(
          (value) => Object.keys(value).length > 0,
          "En az bir alan değiştirilmeli.",
        )
        .parse(await req.json());
      const currentProduct = await database
        .collection<AddOnProduct>("add_on_products")
        .findOne({ id: path[2] });
      if (!currentProduct) throw new HttpError(404, "Ek ürün bulunamadı.");
      const normalizedChanges =
        changes.quantity === undefined
          ? changes
          : { ...changes, quantity: changes.quantity };
      const nextProduct = { ...currentProduct, ...normalizedChanges };
      if (
        nextProduct.quantity === undefined &&
        (nextProduct.maximum_quantity || 100) <
          (nextProduct.minimum_quantity || 1)
      )
        throw new HttpError(400, "Maksimum adet minimum adetten küçük olamaz.");
      if (
        nextProduct.category === "qr_print" &&
        (nextProduct.unit !== "item" ||
          nextProduct.effect_type !== "print_quantity" ||
          nextProduct.effect_value !== 1)
      )
        throw new HttpError(
          400,
          "Ekstra QR ürünü adet biriminde ve birim etkisi 1 olarak tanımlanmalıdır.",
        );
      if (
        nextProduct.effect_type &&
        nextProduct.effect_value &&
        !validAddOnEffect(nextProduct.effect_type, nextProduct.effect_value)
      )
        throw new HttpError(
          400,
          "Bu ek ürün için izin verilen miktarlardan birini seçin.",
        );
      if (
        nextProduct.effect_type === "print_quantity" &&
        !nextProduct.print_format
      )
        throw new HttpError(400, "QR baskı tipi gerekli.");
      if (
        nextProduct.effect_type !== "print_quantity" &&
        nextProduct.print_format
      )
        throw new HttpError(
          400,
          "Baskı tipi yalnızca QR baskı ürünlerinde kullanılabilir.",
        );
      if (
        nextProduct.pricing_type === "package_percentage_discount" &&
        nextProduct.effect_type !== "second_event"
      )
        throw new HttpError(
          400,
          "Yüzde indirim yalnızca ikinci organizasyon ürününde kullanılabilir.",
        );
      if (
        nextProduct.effect_type === "second_event" &&
        (nextProduct.pricing_type !== "package_percentage_discount" ||
          !nextProduct.percentage_bps)
      )
        throw new HttpError(
          400,
          "İkinci organizasyon için geçerli bir yüzde indirim oranı gerekli.",
        );
      if (
        changes.code &&
        (await database
          .collection<AddOnProduct>("add_on_products")
          .findOne({ code: changes.code, id: { $ne: path[2] } }))
      )
        throw new HttpError(409, "Bu ek ürün kodu zaten kullanılıyor.");
      const updatedAt = new Date().toISOString();
      const transaction = (await mongoClient()).startSession();
      let result: AddOnProduct | null = null;
      try {
        await transaction.withTransaction(async () => {
          result = await database
            .collection<AddOnProduct>("add_on_products")
            .findOneAndUpdate(
              { id: path[2] },
              {
                $set: {
                  ...normalizedChanges,
                  commissionable: true,
                  updated_at: updatedAt,
                },
              },
              {
                returnDocument: "after",
                projection: { _id: 0 },
                session: transaction,
              },
            );
          if (!result) throw new HttpError(404, "Ek ürün bulunamadı.");
          await database.collection("pricing_change_history").insertOne(
            {
              id: randomUUID(),
              entity_type: "add_on_product",
              entity_id: path[2],
              previous: currentProduct,
              next: result,
              changed_fields: Object.keys(normalizedChanges),
              changed_at: updatedAt,
              changed_by: user.id,
            },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      if (!result) throw new HttpError(404, "Ek ürün bulunamadı.");
      await audit(req, "add_on.updated", user, {
        product_id: path[2],
        fields: Object.keys(changes),
        previous: currentProduct,
        next: result,
      });
      return json(result);
    }
    if (
      path.length === 3 &&
      path[0] === "admin" &&
      path[1] === "add-ons" &&
      method === "DELETE" &&
      user
    ) {
      requirePlatform(user);
      const products = database.collection<AddOnProduct>("add_on_products");
      const currentProduct = await products.findOne({ id: path[2] });
      if (!currentProduct) throw new HttpError(404, "Ek ürün bulunamadı.");

      const deletedAt = new Date().toISOString();
      const transaction = (await mongoClient()).startSession();
      let deleted = false;
      try {
        await transaction.withTransaction(async () => {
          const deletion = await products.deleteOne(
            { id: path[2] },
            { session: transaction },
          );
          deleted = deletion.deletedCount === 1;
          if (!deleted) throw new HttpError(404, "Ek ürün bulunamadı.");
          await database.collection("pricing_change_history").insertOne(
            {
              id: randomUUID(),
              entity_type: "add_on_product",
              entity_id: path[2],
              previous: currentProduct,
              next: null,
              changed_fields: ["deleted"],
              changed_at: deletedAt,
              changed_by: user.id,
            },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      if (!deleted) throw new HttpError(404, "Ek ürün bulunamadı.");
      await audit(req, "add_on.deleted", user, {
        product_id: path[2],
        previous: currentProduct,
      });
      return json({ deleted: true, id: path[2] });
    }
    if (route === "admin/sales/partner-summary" && method === "GET" && user) {
      requirePermission(
        user,
        user.role === "platform" ? "finance.view_all" : "finance.view_own",
      );
      const partnerScope =
        user.role === "platform" ? {} : { id: user.partner_id! };
      const saleScope =
        user.role === "platform" ? {} : { partner_id: user.partner_id! };
      const sales = database.collection<SaleRecord>("sales");
      const [partners, totals, monthly, organizations] = await Promise.all([
        database
          .collection("partners")
          .find(partnerScope, {
            projection: {
              _id: 0,
              id: 1,
              name: 1,
              phone: 1,
              address: 1,
              active: 1,
            },
          })
          .sort({ name: 1 })
          .toArray(),
        sales
          .aggregate([
            { $match: saleScope },
            {
              $group: {
                _id: "$partner_id",
                paid_sales: {
                  $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
                },
                draft_sales: {
                  $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
                },
                refunded_sales: {
                  $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] },
                },
                gross_cents: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "paid"] }, "$gross_cents", 0],
                  },
                },
                commission_cents: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "paid"] },
                      "$commission_cents",
                      0,
                    ],
                  },
                },
                last_sale_at: {
                  $max: {
                    $cond: [{ $eq: ["$status", "paid"] }, "$occurred_at", null],
                  },
                },
              },
            },
          ])
          .toArray(),
        sales
          .aggregate([
            { $match: saleScope },
            {
              $group: {
                _id: { partner_id: "$partner_id", period: "$period" },
                paid_sales: {
                  $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
                },
                refunded_sales: {
                  $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] },
                },
                gross_cents: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "paid"] }, "$gross_cents", 0],
                  },
                },
                commission_cents: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "paid"] },
                      "$commission_cents",
                      0,
                    ],
                  },
                },
              },
            },
            { $sort: { "_id.period": -1 } },
          ])
          .toArray(),
        sales
          .aggregate([
            { $match: saleScope },
            {
              $group: {
                _id: { partner_id: "$partner_id", wedding_id: "$wedding_id" },
                paid_sales: {
                  $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
                },
                refunded_sales: {
                  $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] },
                },
                gross_cents: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "paid"] }, "$gross_cents", 0],
                  },
                },
                commission_cents: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "paid"] },
                      "$commission_cents",
                      0,
                    ],
                  },
                },
                last_sale_at: { $max: "$occurred_at" },
              },
            },
            { $sort: { last_sale_at: -1 } },
          ])
          .toArray(),
      ]);
      const weddingIds = organizations.map(
        (row) => row._id.wedding_id as string,
      );
      const eventRows = await weddings
        .find(
          { id: { $in: weddingIds } },
          {
            projection: {
              _id: 0,
              id: 1,
              title: 1,
              wedding_date: 1,
              customer_name: 1,
            },
          },
        )
        .toArray();
      const eventsById = new Map(eventRows.map((event) => [event.id, event]));
      const totalsByPartner = new Map(
        totals.map((row) => [row._id as string, row]),
      );
      return json({
        generated_at: new Date().toISOString(),
        items: partners.map((partner) => {
          const total = totalsByPartner.get(partner.id);
          return {
            partner_id: partner.id,
            partner_name: partner.name,
            phone: partner.phone || null,
            address: partner.address || null,
            active: partner.active !== false,
            paid_sales: total?.paid_sales || 0,
            draft_sales: total?.draft_sales || 0,
            refunded_sales: total?.refunded_sales || 0,
            gross_cents: total?.gross_cents || 0,
            commission_cents: total?.commission_cents || 0,
            last_sale_at: total?.last_sale_at || null,
            monthly: monthly
              .filter((row) => row._id.partner_id === partner.id)
              .map((row) => ({
                period: row._id.period,
                paid_sales: row.paid_sales,
                refunded_sales: row.refunded_sales,
                gross_cents: row.gross_cents,
                commission_cents: row.commission_cents,
              })),
            organizations: organizations
              .filter((row) => row._id.partner_id === partner.id)
              .map((row) => {
                const event = eventsById.get(row._id.wedding_id as string);
                return {
                  wedding_id: row._id.wedding_id,
                  title: event?.title || row._id.wedding_id,
                  customer_name: event?.customer_name || null,
                  wedding_date: event?.wedding_date || null,
                  paid_sales: row.paid_sales,
                  refunded_sales: row.refunded_sales,
                  gross_cents: row.gross_cents,
                  commission_cents: row.commission_cents,
                  last_sale_at: row.last_sale_at,
                };
              }),
          };
        }),
      });
    }
    if (route === "admin/sales" && user) {
      const sales = database.collection<SaleRecord>("sales");
      if (method === "GET") {
        requirePermission(
          user,
          user.role === "platform" ? "finance.view_all" : "finance.view_own",
        );
        const scope =
          user.role === "platform" ? {} : { partner_id: user.partner_id! };
        const [items, totals] = await Promise.all([
          sales
            .find(scope, { projection: { _id: 0 } })
            .sort({ occurred_at: -1 })
            .limit(250)
            .toArray(),
          sales
            .aggregate([
              { $match: scope },
              {
                $group: {
                  _id: null,
                  paid_sales: {
                    $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
                  },
                  draft_sales: {
                    $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
                  },
                  draft_gross_cents: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "draft"] }, "$gross_cents", 0],
                    },
                  },
                  gross_cents: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "paid"] }, "$gross_cents", 0],
                    },
                  },
                  net_cents: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "paid"] }, "$net_cents", 0],
                    },
                  },
                  commission_cents: {
                    $sum: {
                      $cond: [
                        { $eq: ["$status", "paid"] },
                        "$commission_cents",
                        0,
                      ],
                    },
                  },
                  platform_cents: {
                    $sum: {
                      $cond: [
                        { $eq: ["$status", "paid"] },
                        "$platform_cents",
                        0,
                      ],
                    },
                  },
                },
              },
            ])
            .next(),
        ]);
        const weddingIds = [...new Set(items.map((item) => item.wedding_id))];
        const saleEvents = await weddings
          .find(
            { id: { $in: weddingIds } },
            {
              projection: {
                _id: 0,
                id: 1,
                title: 1,
                customer_name: 1,
                customer_email: 1,
                owner_id: 1,
                wedding_date: 1,
                venue: 1,
                bride_name: 1,
                groom_name: 1,
                lead_partner_id: 1,
                seller_partner_id: 1,
                partner_id: 1,
                design: 1,
                design_status: 1,
                design_revision_reason: 1,
                price_snapshot: 1,
                package_snapshot: 1,
              },
            },
          )
          .toArray();
        const partnerIds = [
          ...new Set([
            ...items.map((item) => item.partner_id),
            ...saleEvents
              .flatMap((event) => [
                event.partner_id,
                event.lead_partner_id,
                event.seller_partner_id,
              ])
              .filter((id): id is string => Boolean(id)),
          ]),
        ];
        const [salePartners, photographerAssignments, creationAudits] =
          await Promise.all([
            database
              .collection("partners")
              .find(
                { id: { $in: partnerIds } },
                {
                  projection: { _id: 0, id: 1, name: 1, phone: 1, address: 1 },
                },
              )
              .toArray(),
            database
              .collection("organization_participants")
              .find(
                {
                  wedding_id: { $in: weddingIds },
                  participant_role: "photographer",
                  active: true,
                },
                {
                  projection: {
                    _id: 0,
                    wedding_id: 1,
                    account_id: 1,
                    assigned_at: 1,
                    assigned_by: 1,
                  },
                },
              )
              .toArray(),
            database
              .collection("audit_logs")
              .find(
                {
                  action: "wedding.draft_created",
                  outcome: "success",
                  "target.wedding_id": { $in: weddingIds },
                },
                {
                  projection: {
                    _id: 0,
                    actor_id: 1,
                    partner_id: 1,
                    target: 1,
                    at: 1,
                  },
                },
              )
              .sort({ at: 1 })
              .toArray(),
          ]);
        const accountIds = [
          ...new Set([
            ...items.map((item) => item.recorded_by),
            ...saleEvents
              .map((event) => event.owner_id)
              .filter((id): id is string => Boolean(id)),
            ...photographerAssignments.flatMap((assignment) => [
              assignment.account_id,
              assignment.assigned_by,
            ]),
            ...creationAudits
              .map((entry) => entry.actor_id)
              .filter((id): id is string => Boolean(id)),
          ]),
        ];
        const saleAccounts = await database
          .collection("users")
          .find(
            { id: { $in: accountIds } },
            { projection: { _id: 0, id: 1, display_name: 1, email: 1 } },
          )
          .toArray();
        const partnerNames = new Map(
          salePartners.map((partner) => [partner.id, partner.name]),
        );
        const partnersById = new Map(
          salePartners.map((partner) => [partner.id, partner]),
        );
        const eventsById = new Map(
          saleEvents.map((event) => [event.id, event]),
        );
        const accountsById = new Map(
          saleAccounts.map((account) => [account.id, account]),
        );
        const creationAuditByWedding = new Map<
          string,
          (typeof creationAudits)[number]
        >();
        for (const entry of creationAudits) {
          const weddingId =
            typeof entry.target?.wedding_id === "string"
              ? entry.target.wedding_id
              : null;
          if (weddingId && !creationAuditByWedding.has(weddingId))
            creationAuditByWedding.set(weddingId, entry);
        }
        return json({
          items: items.map((item) => {
            const event = eventsById.get(item.wedding_id);
            const owner = event?.owner_id
              ? accountsById.get(event.owner_id)
              : null;
            const creationAudit = creationAuditByWedding.get(item.wedding_id);
            const creator = creationAudit?.actor_id
              ? accountsById.get(creationAudit.actor_id)
              : null;
            const organizerPartnerId =
              event?.lead_partner_id ||
              event?.seller_partner_id ||
              event?.partner_id ||
              item.partner_id;
            const organizerPartner = partnersById.get(organizerPartnerId);
            const photographers = photographerAssignments
              .filter((assignment) => assignment.wedding_id === item.wedding_id)
              .map((assignment) => ({
                name:
                  accountsById.get(assignment.account_id)?.display_name ||
                  assignment.account_id,
                email: accountsById.get(assignment.account_id)?.email || null,
                assigned_at: assignment.assigned_at || null,
                assigned_by:
                  accountsById.get(assignment.assigned_by)?.display_name ||
                  assignment.assigned_by,
              }));
            const frozenAddOns =
              item.price_snapshot?.add_ons ||
              event?.price_snapshot?.add_ons ||
              [];
            return {
              ...(user.role === "platform"
                ? item
                : {
                    id: item.id,
                    partner_id: item.partner_id,
                    wedding_id: item.wedding_id,
                    package_code: item.package_code,
                    status: item.status,
                    period: item.period,
                    occurred_at: item.occurred_at,
                    recorded_at: item.recorded_at,
                    gross_cents: item.gross_cents,
                    commission_cents: item.commission_cents,
                    payment_method: item.payment_method,
                    paid_at: item.paid_at,
                  }),
              partner_name:
                partnerNames.get(item.partner_id) || item.partner_id,
              wedding_title: event?.title || item.wedding_id,
              detail: {
                customer_name:
                  event?.customer_name || owner?.display_name || null,
                customer_email: event?.customer_email || owner?.email || null,
                couple:
                  [event?.bride_name, event?.groom_name]
                    .filter(Boolean)
                    .join(" & ") || null,
                wedding_date: event?.wedding_date || null,
                venue: event?.venue || null,
                organizer_name: creator?.display_name || null,
                organizer_email: creator?.email || null,
                organizer_partner_name: organizerPartner?.name || null,
                organizer_partner_phone: organizerPartner?.phone || null,
                organizer_partner_address: organizerPartner?.address || null,
                photographers,
                package_name:
                  item.package_snapshot?.name ||
                  event?.package_snapshot?.name ||
                  item.package_code,
                add_ons: frozenAddOns.map((addOn) => ({
                  name: addOn.name,
                  quantity: addOn.quantity,
                  line_gross_cents: addOn.line_gross_cents,
                  effect_type: addOn.effect_type || null,
                })),
                custom_design_requested: frozenAddOns.some(
                  (addOn) => addOn.effect_type === "custom_design",
                ),
                design: event?.design
                  ? {
                      qr_template_id: event.design.qrTemplateId,
                      loading_template_id: event.design.intro,
                      wedding_template_id: event.design.pageTemplate,
                      status: event.design_status || "draft",
                      revision_reason: event.design_revision_reason || null,
                    }
                  : null,
              },
            };
          }),
          totals:
            user.role === "platform"
              ? totals || {
                  paid_sales: 0,
                  draft_sales: 0,
                  draft_gross_cents: 0,
                  gross_cents: 0,
                  net_cents: 0,
                  commission_cents: 0,
                  platform_cents: 0,
                }
              : {
                  paid_sales: totals?.paid_sales || 0,
                  draft_sales: totals?.draft_sales || 0,
                  draft_gross_cents: totals?.draft_gross_cents || 0,
                  gross_cents: totals?.gross_cents || 0,
                  commission_cents: totals?.commission_cents || 0,
                },
        });
      }
      if (method === "POST") {
        requirePermission(user, "commission.manage");
        const input = z
          .object({
            wedding_id: z.string().uuid(),
          })
          .parse(await req.json());
        const event = await weddings.findOne({
          id: input.wedding_id,
          approval_status: "approved",
        });
        if (!event?.package_code)
          throw new HttpError(
            409,
            "Onaylı paket bilgisi bulunan bir organizasyon gerekli.",
          );
        const draft = await ensureSaleDraft(database, event, user.id);
        await audit(req, "sale.draft_created", user, {
          sale_id: draft!.id,
          wedding_id: event.id,
        });
        return json(draft, 201);
      }
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "sales" &&
      path[3] === "confirm-payment" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "commission.manage");
      const payment = z
        .object({
          payment_method: z.enum(["bank_transfer", "cash", "card", "other"]),
          payment_reference: z.string().trim().min(3).max(120),
          paid_at: z.string().datetime(),
        })
        .parse(await req.json());
      const sales = database.collection<SaleRecord>("sales");
      const draft = await sales.findOne({ id: path[2], status: "draft" });
      if (!draft) {
        const existing = await sales.findOne(
          { id: path[2] },
          { projection: { _id: 0 } },
        );
        if (existing?.status === "paid") return json(existing);
        throw new HttpError(
          409,
          "SatÄ±ÅŸ taslaÄŸÄ± bulunamadÄ± veya Ã¶deme onayÄ±na uygun deÄŸil.",
        );
      }
      const paymentEvent = await weddings.findOne({
        id: draft.wedding_id,
        lifecycle_status: "draft",
        approval_status: "approved",
      });
      if (!paymentEvent)
        throw new HttpError(
          409,
          "Ödeme onayı için onaylanmış bir organizasyon taslağı gerekli.",
        );
      const period = istanbulCalendarMonth(payment.paid_at);
      const transaction = (await mongoClient()).startSession();
      let paid: SaleRecord | null = null;
      try {
        await transaction.withTransaction(async () => {
          const commissionPolicy = await currentCommissionPolicy(
            database,
            draft.partner_id,
            payment.paid_at,
            transaction,
          );
          let ordinal: number | null = null;
          if (
            commissionPolicy.tiered &&
            commissionPolicy.qualifying_package_codes.includes(
              draft.package_code,
            )
          ) {
            const counter = await database
              .collection("monthly_sales_counters")
              .findOneAndUpdate(
                { partner_id: draft.partner_id, period },
                {
                  $setOnInsert: {
                    partner_id: draft.partner_id,
                    period,
                    refunded_count: 0,
                  },
                  $inc: { paid_count: 1, net_count: 1 },
                  $set: { updated_at: new Date().toISOString() },
                },
                { upsert: true, returnDocument: "after", session: transaction },
              );
            ordinal = Number(counter?.net_count || 1);
          }
          const eligibleNetCents =
            draft.price_snapshot?.commissionable_net_cents ??
            netFromVatIncluded(
              draft.price_snapshot?.commissionable_gross_cents ||
                draft.gross_cents,
              draft.vat_rate_bps,
            );
          const commissionRateBps = commissionRateForOrdinal(
            commissionPolicy,
            draft.package_code,
            ordinal,
          );
          const commissionCents = calculateCommissionCents(
            eligibleNetCents,
            commissionRateBps,
          );
          paid = await sales.findOneAndUpdate(
            { id: draft.id, status: "draft" },
            {
              $set: {
                status: "paid",
                period,
                occurred_at: payment.paid_at,
                paid_at: payment.paid_at,
                paid_by: user.id,
                payment_method: payment.payment_method,
                payment_reference: payment.payment_reference,
                qualifying_ordinal: ordinal,
                commission_rate_bps: commissionRateBps,
                commission_cents: commissionCents,
                commission_policy_snapshot: commissionPolicy,
                platform_cents: draft.net_cents - commissionCents,
              },
            },
            { returnDocument: "after", session: transaction },
          );
          if (!paid)
            throw new HttpError(409, "SatÄ±ÅŸ baÅŸka bir oturumda onaylandÄ±.");
          await database.collection("commission_ledger").insertOne(
            {
              id: randomUUID(),
              sale_id: paid.id,
              partner_id: paid.partner_id,
              type: "accrual",
              amount_cents: paid.commission_cents,
              period,
              created_at: payment.paid_at,
              created_by: user.id,
            },
            { session: transaction },
          );
        });
      } catch (reason) {
        if (reason instanceof MongoServerError && reason.code === 11000)
          throw new HttpError(409, "Bu ödeme referansı daha önce kullanılmış.");
        throw reason;
      } finally {
        await transaction.endSession();
      }
      await audit(req, "sale.payment_confirmed", user, {
        sale_id: paid!.id,
        wedding_id: paid!.wedding_id,
        payment_reference: payment.payment_reference,
      });
      return json(paid);
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "sales" &&
      path[3] === "refund" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "commission.manage");
      const reason = z
        .object({ reason: z.string().trim().min(3).max(500) })
        .parse(await req.json()).reason;
      const sales = database.collection<SaleRecord>("sales");
      const transaction = (await mongoClient()).startSession();
      let refunded: SaleRecord | null = null;
      try {
        await transaction.withTransaction(async () => {
          const now = new Date().toISOString();
          refunded = await sales.findOneAndUpdate(
            { id: path[2], status: "paid" },
            {
              $set: {
                status: "refunded",
                refunded_at: now,
                refunded_by: user.id,
                refund_reason: reason,
              },
            },
            { returnDocument: "after", session: transaction },
          );
          if (!refunded)
            throw new HttpError(
              409,
              "Satış bulunamadı veya daha önce iade edildi.",
            );
          await database.collection("commission_ledger").insertOne(
            {
              id: randomUUID(),
              sale_id: refunded.id,
              partner_id: refunded.partner_id,
              type: "reversal",
              amount_cents: -refunded.commission_cents,
              period: refunded.period,
              reason,
              created_at: now,
              created_by: user.id,
            },
            { session: transaction },
          );
          if (refunded.qualifying_ordinal !== null)
            await database.collection("monthly_sales_counters").updateOne(
              { partner_id: refunded.partner_id, period: refunded.period },
              {
                $inc: { refunded_count: 1, net_count: -1 },
                $set: { updated_at: now },
              },
              { session: transaction },
            );
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "sale.refunded", user, {
        sale_id: refunded!.id,
        reason,
      });
      return json(refunded);
    }
    if (route === "admin/photographer-sales" && user) {
      const photographerSales =
        database.collection<PhotographerSaleRecord>("photographer_sales");
      if (method === "GET") {
        requirePermission(
          user,
          user.role === "platform" ? "finance.view_all" : "finance.view_own",
        );
        const filters = z
          .object({
            sale_status: z
              .enum([
                "pending_customer_consent",
                "pending_payment",
                "paid",
                "refunded",
              ])
              .optional(),
            payout_status: z
              .enum([
                "pending_delivery",
                "pending_customer_approval",
                "payable",
                "approved",
                "paid",
                "recognized",
                "reversed",
              ])
              .optional(),
          })
          .parse({
            sale_status:
              req.nextUrl.searchParams.get("sale_status") || undefined,
            payout_status:
              req.nextUrl.searchParams.get("payout_status") || undefined,
          });
        const tenantScope =
          user.role === "platform"
            ? {}
            : {
                $or: [
                  { originating_partner_id: user.partner_id! },
                  { photographer_partner_id: user.partner_id! },
                ],
              };
        let payoutSaleIds: string[] | undefined;
        if (filters.payout_status) {
          payoutSaleIds = await database
            .collection<ServicePayoutLedgerEntry>("service_payout_ledger")
            .distinct("sale_id", {
              type: "accrual",
              status: filters.payout_status,
            });
        }
        const scope = {
          ...tenantScope,
          ...(filters.sale_status ? { status: filters.sale_status } : {}),
          ...(payoutSaleIds ? { id: { $in: payoutSaleIds } } : {}),
        };
        const items = await photographerSales
          .find(scope, { projection: { _id: 0 } })
          .sort({ occurred_at: -1 })
          .limit(250)
          .toArray();
        const [events, partners, accounts, payouts] = await Promise.all([
          weddings
            .find(
              {
                id: { $in: [...new Set(items.map((item) => item.wedding_id))] },
              },
              { projection: { _id: 0, id: 1, title: 1 } },
            )
            .toArray(),
          database
            .collection("partners")
            .find(
              {
                id: {
                  $in: [
                    ...new Set(
                      items.flatMap((item) => [
                        item.photographer_partner_id,
                        item.originating_partner_id,
                      ]),
                    ),
                  ],
                },
              },
              { projection: { _id: 0, id: 1, name: 1 } },
            )
            .toArray(),
          database
            .collection("users")
            .find(
              {
                id: {
                  $in: [
                    ...new Set(
                      items.map((item) => item.photographer_account_id),
                    ),
                  ],
                },
              },
              { projection: { _id: 0, id: 1, display_name: 1 } },
            )
            .toArray(),
          database
            .collection<ServicePayoutLedgerEntry>("service_payout_ledger")
            .find(
              {
                sale_id: { $in: items.map((item) => item.id) },
                type: "accrual",
              },
              { projection: { _id: 0 } },
            )
            .toArray(),
        ]);
        const eventNames = new Map(events.map((item) => [item.id, item.title]));
        const partnerNames = new Map(
          partners.map((item) => [item.id, item.name]),
        );
        const accountNames = new Map(
          accounts.map((item) => [item.id, item.display_name]),
        );
        return json(
          items.map((item) => ({
            ...item,
            wedding_title: eventNames.get(item.wedding_id) || item.wedding_id,
            photographer_name:
              accountNames.get(item.photographer_account_id) ||
              item.photographer_account_id,
            photographer_partner_name:
              partnerNames.get(item.photographer_partner_id) ||
              item.photographer_partner_id,
            originating_partner_name:
              partnerNames.get(item.originating_partner_id) ||
              item.originating_partner_id,
            payouts: payouts.filter((payout) => payout.sale_id === item.id),
          })),
        );
      }
      if (method === "POST") {
        requirePermission(user, "commission.manage");
        const input = z
          .object({
            wedding_id: z.string().uuid(),
            photographer_account_id: z.string().uuid(),
            idempotency_key: z.string().trim().min(8).max(120),
            occurred_at: z.string().datetime().optional(),
          })
          .parse(await req.json());
        const existing = await photographerSales.findOne(
          { idempotency_key: input.idempotency_key },
          { projection: { _id: 0 } },
        );
        if (existing) return json(existing);
        if (
          await photographerSales.findOne({
            wedding_id: input.wedding_id,
            status: {
              $in: ["pending_customer_consent", "pending_payment", "paid"],
            },
          })
        )
          throw new HttpError(
            409,
            "Bu organizasyon için ödenmiş bir fotoğrafçı paketi zaten var.",
          );
        const event = await weddings.findOne({
          id: input.wedding_id,
          approval_status: "approved",
        });
        if (!event)
          throw new HttpError(409, "Onaylı bir organizasyon gerekli.");
        const assignment = await database
          .collection("organization_participants")
          .findOne({
            wedding_id: event.id,
            account_id: input.photographer_account_id,
            participant_role: "photographer",
            active: true,
          });
        if (!assignment?.partner_id)
          throw new HttpError(
            409,
            "Fotoğrafçı organizasyona aktif olarak atanmış olmalı.",
          );
        const originatingPartnerId = event.lead_partner_id || event.partner_id;
        const originatingPartner = await database
          .collection("partners")
          .findOne({
            id: originatingPartnerId,
            active: true,
          });
        if (!originatingPartner)
          throw new HttpError(
            409,
            "Organizasyonu oluşturan aktif işletme bulunamadı.",
          );
        const occurredAt = input.occurred_at || new Date().toISOString();
        const now = new Date().toISOString();
        const photographerPackage = await currentPhotographerPackage(database);
        const settlement = photographerSettlementSnapshot(photographerPackage);
        const transaction = (await mongoClient()).startSession();
        let created: PhotographerSaleRecord | null = null;
        try {
          await transaction.withTransaction(async () => {
            created = {
              id: randomUUID(),
              idempotency_key: input.idempotency_key,
              wedding_id: event.id,
              photographer_account_id: input.photographer_account_id,
              photographer_partner_id: assignment.partner_id,
              originating_partner_id: originatingPartnerId,
              status: "pending_customer_consent",
              occurred_at: occurredAt,
              recorded_at: now,
              recorded_by: user.id,
              settlement_snapshot: settlement,
              refunded_at: null,
              refunded_by: null,
              delivery_completed_at: null,
              customer_approval_status: "pending_delivery",
              customer_approved_at: null,
              customer_approved_by: null,
              commercial_consent_version: 1,
              commercial_consent_at: null,
              commercial_consent_by: null,
            };
            await photographerSales.insertOne(created, {
              session: transaction,
            });
          });
        } catch (reason) {
          if (
            reason &&
            typeof reason === "object" &&
            "code" in reason &&
            reason.code === 11000
          ) {
            const raced = await photographerSales.findOne(
              { idempotency_key: input.idempotency_key },
              { projection: { _id: 0 } },
            );
            if (raced) created = raced;
            else
              throw new HttpError(
                409,
                "Bu organizasyon için ödenmiş bir fotoğrafçı paketi zaten var.",
              );
          } else throw reason;
        } finally {
          await transaction.endSession();
        }
        await audit(req, "photographer_sale.recorded", user, {
          sale_id: created!.id,
          wedding_id: event.id,
          photographer_account_id: input.photographer_account_id,
          originating_partner_id: originatingPartnerId,
        });
        return json(created, 201);
      }
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "photographer-sales" &&
      path[3] === "refund" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "commission.manage");
      const reason = z
        .object({ reason: z.string().trim().min(3).max(500) })
        .parse(await req.json()).reason;
      const photographerSales =
        database.collection<PhotographerSaleRecord>("photographer_sales");
      const payoutLedger = database.collection<ServicePayoutLedgerEntry>(
        "service_payout_ledger",
      );
      const transaction = (await mongoClient()).startSession();
      let refunded: PhotographerSaleRecord | null = null;
      try {
        await transaction.withTransaction(async () => {
          const now = new Date().toISOString();
          const paidPayout = await payoutLedger.findOne(
            { sale_id: path[2], type: "accrual", status: "paid" },
            { session: transaction },
          );
          if (paidPayout)
            throw new HttpError(
              409,
              "Ödenmiş hakediş bulunan fotoğrafçı satışı doğrudan iade edilemez.",
            );
          refunded = await photographerSales.findOneAndUpdate(
            { id: path[2], status: "paid" },
            {
              $set: {
                status: "refunded",
                refunded_at: now,
                refunded_by: user.id,
                refund_reason: reason,
              },
            },
            { returnDocument: "after", session: transaction },
          );
          if (!refunded)
            throw new HttpError(
              409,
              "Fotoğrafçı paketi satışı bulunamadı veya daha önce iade edildi.",
            );
          const existingAccruals = await payoutLedger
            .find(
              { sale_id: refunded.id, type: "accrual" },
              { session: transaction },
            )
            .toArray();
          const reversals: ServicePayoutLedgerEntry[] = existingAccruals.map(
            (entry) => ({
              id: randomUUID(),
              sale_id: entry.sale_id,
              wedding_id: entry.wedding_id,
              beneficiary_type: entry.beneficiary_type,
              beneficiary_id: entry.beneficiary_id,
              type: "reversal",
              gross_cents: -entry.gross_cents,
              status: "reversed",
              created_at: now,
              created_by: user.id,
              reason,
            }),
          );
          if (reversals.length)
            await payoutLedger.insertMany(reversals, { session: transaction });
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "photographer_sale.refunded", user, {
        sale_id: refunded!.id,
        reason,
      });
      return json(refunded);
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "weddings" &&
      path[3] === "photographer-sale" &&
      method === "GET" &&
      user
    ) {
      const event = await weddings.findOne({ id: path[2] });
      if (!event || !canAccess(user, event))
        throw new HttpError(404, "Organizasyon bulunamadı.");
      const sale = await database
        .collection<PhotographerSaleRecord>("photographer_sales")
        .findOne(
          {
            wedding_id: event.id,
            status: {
              $in: ["pending_customer_consent", "pending_payment", "paid"],
            },
          },
          {
            projection: {
              _id: 0,
              id: 1,
              wedding_id: 1,
              status: 1,
              settlement_snapshot: 1,
              commercial_consent_version: 1,
              commercial_consent_at: 1,
              delivery_completed_at: 1,
              customer_approval_status: 1,
              customer_approved_at: 1,
            },
          },
        );
      return json(sale);
    }
    if (
      path.length === 5 &&
      path[0] === "admin" &&
      path[1] === "weddings" &&
      path[3] === "photographer-sale" &&
      path[4] === "accept" &&
      method === "POST" &&
      user
    ) {
      const event = await weddings.findOne({ id: path[2] });
      if (!event || user.role !== "owner" || event.owner_id !== user.id)
        throw new HttpError(
          403,
          "Satın alma onayını yalnızca organizasyon sahibi verebilir.",
        );
      const photographerSales =
        database.collection<PhotographerSaleRecord>("photographer_sales");
      const existing = await photographerSales.findOne({
        wedding_id: event.id,
        status: {
          $in: ["pending_customer_consent", "pending_payment", "paid"],
        },
      });
      if (!existing)
        throw new HttpError(
          404,
          "Fotoğrafçı paketi satın alma kaydı bulunamadı.",
        );
      if (existing.status !== "pending_customer_consent") return json(existing);
      const transaction = (await mongoClient()).startSession();
      let accepted: PhotographerSaleRecord | null = null;
      try {
        await transaction.withTransaction(async () => {
          const now = new Date().toISOString();
          accepted = await photographerSales.findOneAndUpdate(
            { id: existing.id, status: "pending_customer_consent" },
            {
              $set: {
                status: "pending_payment",
                commercial_consent_at: now,
                commercial_consent_by: user.id,
              },
            },
            { returnDocument: "after", session: transaction },
          );
          if (!accepted)
            throw new HttpError(409, "Satın alma başka bir oturumda işlendi.");
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "photographer_sale.customer_consented", user, {
        sale_id: accepted!.id,
        wedding_id: event.id,
        commercial_consent_version: 1,
        gross_cents: accepted!.settlement_snapshot.grossCents,
      });
      return json(accepted);
    }
    if (
      path.length === 4 &&
      path[0] === "admin" &&
      path[1] === "photographer-sales" &&
      path[3] === "confirm-payment" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "commission.manage");
      const payment = z
        .object({
          payment_method: z.enum(["bank_transfer", "cash", "card", "other"]),
          payment_reference: z.string().trim().min(3).max(120),
          paid_at: z.string().datetime(),
        })
        .parse(await req.json());
      const photographerSales =
        database.collection<PhotographerSaleRecord>("photographer_sales");
      const existing = await photographerSales.findOne({ id: path[2] });
      if (!existing)
        throw new HttpError(404, "Fotoğrafçı paketi satışı bulunamadı.");
      if (existing.status === "paid") return json(existing);
      if (existing.status !== "pending_payment")
        throw new HttpError(
          409,
          "Müşteri onayı tamamlanmadan ödeme doğrulanamaz.",
        );
      const transaction = (await mongoClient()).startSession();
      let paid: PhotographerSaleRecord | null = null;
      try {
        await transaction.withTransaction(async () => {
          paid = await photographerSales.findOneAndUpdate(
            { id: existing.id, status: "pending_payment" },
            {
              $set: {
                status: "paid",
                payment_method: payment.payment_method,
                payment_reference: payment.payment_reference,
                paid_at: payment.paid_at,
                paid_by: user.id,
              },
            },
            { returnDocument: "after", session: transaction },
          );
          if (!paid)
            throw new HttpError(409, "Ödeme başka bir oturumda işlendi.");
          const settlement = paid.settlement_snapshot;
          await database
            .collection<ServicePayoutLedgerEntry>("service_payout_ledger")
            .insertMany(
              [
                {
                  id: randomUUID(),
                  sale_id: paid.id,
                  wedding_id: paid.wedding_id,
                  beneficiary_type: "photographer",
                  beneficiary_id: paid.photographer_account_id,
                  type: "accrual",
                  gross_cents: settlement.photographerGrossCents,
                  status: "pending_delivery",
                  created_at: payment.paid_at,
                  created_by: user.id,
                },
                {
                  id: randomUUID(),
                  sale_id: paid.id,
                  wedding_id: paid.wedding_id,
                  beneficiary_type: "originating_partner",
                  beneficiary_id: paid.originating_partner_id,
                  type: "accrual",
                  gross_cents: settlement.originatingPartnerGrossCents,
                  status: "pending_delivery",
                  created_at: payment.paid_at,
                  created_by: user.id,
                },
                {
                  id: randomUUID(),
                  sale_id: paid.id,
                  wedding_id: paid.wedding_id,
                  beneficiary_type: "platform",
                  beneficiary_id: "shineqr",
                  type: "accrual",
                  gross_cents: settlement.platformGrossCents,
                  status: "recognized",
                  created_at: payment.paid_at,
                  created_by: user.id,
                },
              ],
              { session: transaction },
            );
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "photographer_sale.payment_confirmed", user, {
        sale_id: paid!.id,
        wedding_id: paid!.wedding_id,
        payment_reference: payment.payment_reference,
      });
      return json(paid);
    }
    if (
      path.length === 5 &&
      path[0] === "admin" &&
      path[1] === "weddings" &&
      path[3] === "photographer-sale" &&
      path[4] === "approve-delivery" &&
      method === "POST" &&
      user
    ) {
      const event = await weddings.findOne({ id: path[2] });
      if (!event || user.role !== "owner" || event.owner_id !== user.id)
        throw new HttpError(
          403,
          "Teslimatı yalnızca organizasyon sahibi onaylayabilir.",
        );
      const photographerSales =
        database.collection<PhotographerSaleRecord>("photographer_sales");
      const payoutLedger = database.collection<ServicePayoutLedgerEntry>(
        "service_payout_ledger",
      );
      const transaction = (await mongoClient()).startSession();
      let approved: PhotographerSaleRecord | null = null;
      try {
        await transaction.withTransaction(async () => {
          const now = new Date().toISOString();
          approved = await photographerSales.findOneAndUpdate(
            {
              wedding_id: event.id,
              status: "paid",
              customer_approval_status: "pending",
              delivery_completed_at: { $type: "string" },
            },
            {
              $set: {
                customer_approval_status: "approved",
                customer_approved_at: now,
                customer_approved_by: user.id,
              },
            },
            { returnDocument: "after", session: transaction },
          );
          if (!approved)
            throw new HttpError(
              409,
              "Teslimat onay beklemiyor veya daha önce onaylandı.",
            );
          await payoutLedger.updateMany(
            {
              sale_id: approved.id,
              type: "accrual",
              status: "pending_customer_approval",
              beneficiary_type: {
                $in: ["photographer", "originating_partner"],
              },
            },
            { $set: { status: "payable" } },
            { session: transaction },
          );
        });
      } finally {
        await transaction.endSession();
      }
      await audit(req, "photographer_delivery.customer_approved", user, {
        sale_id: approved!.id,
        wedding_id: event.id,
      });
      return json(approved);
    }
    if (
      path.length === 6 &&
      path[0] === "admin" &&
      path[1] === "photographer-sales" &&
      path[3] === "payouts" &&
      path[5] === "approve" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "payout.approve");
      const now = new Date().toISOString();
      const autoRecognize = effectiveStaffRole(user) === "platform_admin";
      const approvableStatus = autoRecognize
        ? { $in: ["payable", "approved"] as const }
        : "payable";
      const payout = await database
        .collection<ServicePayoutLedgerEntry>("service_payout_ledger")
        .findOneAndUpdate(
          {
            id: path[4],
            sale_id: path[2],
            type: "accrual",
            status: approvableStatus,
            beneficiary_type: { $in: ["photographer", "originating_partner"] },
          },
          {
            $set: {
              status: autoRecognize ? "recognized" : "approved",
              approved_at: now,
              approved_by: user.id,
            },
          },
          { returnDocument: "after", projection: { _id: 0 } },
        );
      if (!payout)
        throw new HttpError(409, "Hakediş onaya uygun durumda değil.");
      await audit(req, "photographer_payout.approved", user, {
        sale_id: path[2],
        payout_id: payout.id,
        beneficiary_type: payout.beneficiary_type,
        gross_cents: payout.gross_cents,
        auto_recognized: autoRecognize,
      });
      return json(payout);
    }
    if (
      path.length === 6 &&
      path[0] === "admin" &&
      path[1] === "photographer-sales" &&
      path[3] === "payouts" &&
      path[5] === "proof" &&
      user
    ) {
      requirePermission(user, "finance.view_all");
      const payoutLedger = database.collection<ServicePayoutLedgerEntry>(
        "service_payout_ledger",
      );
      const payout = await payoutLedger.findOne({
        id: path[4],
        sale_id: path[2],
        type: "accrual",
        beneficiary_type: { $in: ["photographer", "originating_partner"] },
      });
      if (!payout) throw new HttpError(404, "Hakediş bulunamadı.");
      if (method === "GET") {
        if (!payout.payment_proof_storage_path)
          throw new HttpError(404, "Ödeme belgesi bulunamadı.");
        await audit(req, "photographer_payout.proof_viewed", user, {
          sale_id: path[2],
          payout_id: payout.id,
          proof_id: payout.payment_proof_id,
        });
        return json({
          file_name: payout.payment_proof_file_name,
          url: await signedObjectUrl(payout.payment_proof_storage_path, 300),
        });
      }
      if (method === "POST") {
        requirePermission(user, "payout.mark_paid");
        if (payout.status !== "approved")
          throw new HttpError(
            409,
            "Ödeme belgesi yalnızca onaylı hakedişe eklenebilir.",
          );
        if (Number(req.headers.get("content-length")) > 6 * 1024 * 1024)
          throw new HttpError(413, "Ödeme belgesi en fazla 5 MB olabilir.");
        const form = await req.formData();
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > 5 * 1024 * 1024
        )
          throw new HttpError(400, "Geçerli bir ödeme belgesi seçin.");
        const body = Buffer.from(await file.arrayBuffer());
        const detectedType =
          body.subarray(0, 4).toString("ascii") === "%PDF"
            ? "application/pdf"
            : body.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
              ? "image/jpeg"
              : body
                    .subarray(0, 8)
                    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
                ? "image/png"
                : null;
        if (!detectedType || detectedType !== file.type)
          throw new HttpError(
            400,
            "Yalnızca PDF, JPG veya PNG ödeme belgesi yüklenebilir.",
          );
        const proofId = randomUUID();
        const storagePath = `payment-proofs/${path[2]}/${path[4]}/${proofId}`;
        const { client, bucket } = storage();
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: storagePath,
            Body: body,
            ContentType: detectedType,
          }),
        );
        const now = new Date().toISOString();
        const updated = await payoutLedger.findOneAndUpdate(
          {
            id: payout.id,
            status: "approved",
            payment_proof_id: { $exists: false },
          },
          {
            $set: {
              payment_proof_id: proofId,
              payment_proof_file_name: file.name.slice(0, 180),
              payment_proof_mime_type: detectedType,
              payment_proof_storage_path: storagePath,
              payment_proof_uploaded_at: now,
              payment_proof_uploaded_by: user.id,
            },
          },
          { returnDocument: "after", projection: { _id: 0 } },
        );
        if (!updated) {
          await deleteObject(storagePath);
          throw new HttpError(
            409,
            "Ödeme belgesi daha önce yüklendi veya durum değişti.",
          );
        }
        await audit(req, "photographer_payout.proof_uploaded", user, {
          sale_id: path[2],
          payout_id: payout.id,
          proof_id: proofId,
          mime_type: detectedType,
        });
        return json(updated, 201);
      }
    }
    if (
      path.length === 6 &&
      path[0] === "admin" &&
      path[1] === "photographer-sales" &&
      path[3] === "payouts" &&
      path[5] === "mark-paid" &&
      method === "POST" &&
      user
    ) {
      requirePermission(user, "payout.mark_paid");
      const input = z
        .object({ payment_reference: z.string().trim().min(3).max(120) })
        .parse(await req.json());
      const now = new Date().toISOString();
      let payout: ServicePayoutLedgerEntry | null = null;
      try {
        payout = await database
          .collection<ServicePayoutLedgerEntry>("service_payout_ledger")
          .findOneAndUpdate(
            {
              id: path[4],
              sale_id: path[2],
              type: "accrual",
              status: "approved",
              approved_by: { $ne: user.id },
              payment_proof_id: { $type: "string" },
              beneficiary_type: {
                $in: ["photographer", "originating_partner"],
              },
            },
            {
              $set: {
                status: "paid",
                paid_at: now,
                paid_by: user.id,
                payment_reference: input.payment_reference,
              },
            },
            { returnDocument: "after", projection: { _id: 0 } },
          );
      } catch (reason) {
        if (
          reason &&
          typeof reason === "object" &&
          "code" in reason &&
          reason.code === 11000
        )
          throw new HttpError(409, "Bu ödeme referansı daha önce kullanıldı.");
        throw reason;
      }
      if (!payout)
        throw new HttpError(
          409,
          "Hakediş ödeme kaydına uygun değil veya aynı kullanıcı tarafından onaylandı.",
        );
      await audit(req, "photographer_payout.marked_paid", user, {
        sale_id: path[2],
        payout_id: payout.id,
        payment_reference: input.payment_reference,
        gross_cents: payout.gross_cents,
      });
      return json(payout);
    }
    if (
      route === "admin/photographer-payout-export.csv" &&
      method === "GET" &&
      user
    ) {
      requirePermission(user, "finance.view_all");
      const ledger = database.collection<ServicePayoutLedgerEntry>(
        "service_payout_ledger",
      );
      const exportFilters = z
        .object({
          from: z.string().date().optional(),
          to: z.string().date().optional(),
          status: z
            .enum([
              "pending_delivery",
              "pending_customer_approval",
              "payable",
              "approved",
              "paid",
              "recognized",
              "reversed",
            ])
            .optional(),
          beneficiary_type: z
            .enum(["photographer", "originating_partner", "platform"])
            .optional(),
        })
        .refine(
          (value) => !value.from || !value.to || value.from <= value.to,
          "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
        )
        .parse({
          from: req.nextUrl.searchParams.get("from") || undefined,
          to: req.nextUrl.searchParams.get("to") || undefined,
          status: req.nextUrl.searchParams.get("status") || undefined,
          beneficiary_type:
            req.nextUrl.searchParams.get("beneficiary_type") || undefined,
        });
      const createdAtFilter = {
        ...(exportFilters.from
          ? {
              $gte: new Date(
                `${exportFilters.from}T00:00:00+03:00`,
              ).toISOString(),
            }
          : {}),
        ...(exportFilters.to
          ? {
              $lt: new Date(
                Date.parse(`${exportFilters.to}T00:00:00+03:00`) + 86_400_000,
              ).toISOString(),
            }
          : {}),
      };
      const entries = await ledger
        .find(
          {
            type: "accrual",
            ...(exportFilters.status ? { status: exportFilters.status } : {}),
            ...(exportFilters.beneficiary_type
              ? { beneficiary_type: exportFilters.beneficiary_type }
              : {}),
            ...(Object.keys(createdAtFilter).length
              ? { created_at: createdAtFilter }
              : {}),
          },
          { projection: { _id: 0 } },
        )
        .sort({ created_at: -1, id: -1 })
        .limit(10_000)
        .toArray();
      const saleIds = [...new Set(entries.map((entry) => entry.sale_id))];
      const sales = await database
        .collection<PhotographerSaleRecord>("photographer_sales")
        .find(
          { id: { $in: saleIds } },
          {
            projection: {
              _id: 0,
              id: 1,
              wedding_id: 1,
              photographer_account_id: 1,
              originating_partner_id: 1,
              occurred_at: 1,
            },
          },
        )
        .toArray();
      const eventIds = [...new Set(sales.map((sale) => sale.wedding_id))];
      const [events, accounts, partners] = await Promise.all([
        weddings
          .find(
            { id: { $in: eventIds } },
            { projection: { _id: 0, id: 1, title: 1 } },
          )
          .toArray(),
        database
          .collection("users")
          .find(
            {
              id: {
                $in: [
                  ...new Set(sales.map((sale) => sale.photographer_account_id)),
                ],
              },
            },
            { projection: { _id: 0, id: 1, display_name: 1 } },
          )
          .toArray(),
        database
          .collection("partners")
          .find(
            {
              id: {
                $in: [
                  ...new Set(sales.map((sale) => sale.originating_partner_id)),
                ],
              },
            },
            { projection: { _id: 0, id: 1, name: 1 } },
          )
          .toArray(),
      ]);
      const saleMap = new Map(sales.map((sale) => [sale.id, sale]));
      const eventMap = new Map(events.map((event) => [event.id, event.title]));
      const accountMap = new Map(
        accounts.map((account) => [account.id, account.display_name]),
      );
      const partnerMap = new Map(
        partners.map((partner) => [partner.id, partner.name]),
      );
      const csvCell = (value: unknown) => {
        let text = String(value ?? "");
        if (/^[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
      };
      const header = [
        "Hakediş ID",
        "Satış ID",
        "Organizasyon",
        "Lehtar türü",
        "Fotoğrafçı",
        "Kaynak işletme",
        "Tutar (TL)",
        "Durum",
        "Satış tarihi",
        "Onay tarihi",
        "Ödeme tarihi",
        "Ödeme referansı",
        "Belge var",
      ];
      const rows = entries.map((entry) => {
        const sale = saleMap.get(entry.sale_id);
        return [
          entry.id,
          entry.sale_id,
          sale
            ? eventMap.get(sale.wedding_id) || sale.wedding_id
            : entry.wedding_id,
          entry.beneficiary_type,
          sale
            ? accountMap.get(sale.photographer_account_id) ||
              sale.photographer_account_id
            : "",
          sale
            ? partnerMap.get(sale.originating_partner_id) ||
              sale.originating_partner_id
            : "",
          (entry.gross_cents / 100).toFixed(2),
          entry.status,
          sale?.occurred_at || "",
          entry.approved_at || "",
          entry.paid_at || "",
          entry.payment_reference || "",
          entry.payment_proof_id ? "Evet" : "Hayır",
        ];
      });
      const csv = `\uFEFF${[header, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n")}`;
      await audit(req, "photographer_payout.csv_exported", user, {
        row_count: rows.length,
        filters: exportFilters,
      });
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="shineqr-fotografci-hakedis-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (
      route === "admin/photographer-payout-reconciliation" &&
      method === "GET" &&
      user
    ) {
      requirePermission(user, "finance.view_all");
      const ledger = database.collection<ServicePayoutLedgerEntry>(
        "service_payout_ledger",
      );
      const [statusRows, anomalyRows] = await Promise.all([
        ledger
          .aggregate<{
            _id: ServicePayoutLedgerEntry["status"];
            count: number;
            gross_cents: number;
          }>([
            { $match: { type: "accrual" } },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                gross_cents: { $sum: "$gross_cents" },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray(),
        ledger
          .find(
            {
              type: "accrual",
              status: "paid",
              $or: [
                { payment_reference: { $exists: false } },
                { payment_proof_id: { $exists: false } },
                { paid_at: { $exists: false } },
                { paid_by: { $exists: false } },
              ],
            },
            {
              projection: {
                _id: 0,
                id: 1,
                sale_id: 1,
                wedding_id: 1,
                beneficiary_type: 1,
                gross_cents: 1,
                payment_reference: 1,
                payment_proof_id: 1,
                paid_at: 1,
                paid_by: 1,
              },
            },
          )
          .limit(100)
          .toArray(),
      ]);
      const statuses = Object.fromEntries(
        statusRows.map((row) => [
          row._id,
          { count: row.count, gross_cents: row.gross_cents },
        ]),
      );
      return json({
        generated_at: new Date().toISOString(),
        statuses,
        anomalies: anomalyRows,
        ready_to_pay: statuses.approved || { count: 0, gross_cents: 0 },
        paid: statuses.paid || { count: 0, gross_cents: 0 },
      });
    }
    if (route === "admin/operations" && method === "GET" && user) {
      requirePlatform(user);
      const now = new Date().toISOString();
      const [
        mediaTotals,
        processingFailures,
        retentionDue,
        archiveFailures,
        archiveActive,
        sample,
        failedMedia,
        failedArchives,
        dueItems,
        quotaRows,
      ] = await Promise.all([
        database
          .collection("media")
          .aggregate([
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                bytes: { $sum: "$size_bytes" },
              },
            },
          ])
          .next(),
        database
          .collection("media")
          .countDocuments({ processing_status: "failed" }),
        database
          .collection("media")
          .countDocuments({ purge_at: { $lte: now } }),
        database
          .collection("archive_jobs")
          .countDocuments({ status: "failed" }),
        database
          .collection("archive_jobs")
          .countDocuments({ status: { $in: ["pending", "processing"] } }),
        database
          .collection("media")
          .find(
            { purging: { $ne: true } },
            { projection: { _id: 0, id: 1, storage_path: 1, wedding_id: 1 } },
          )
          .sort({ uploaded_at: -1 })
          .limit(30)
          .toArray(),
        database
          .collection("media")
          .find(
            { processing_status: "failed" },
            {
              projection: {
                _id: 0,
                id: 1,
                wedding_id: 1,
                original_name: 1,
                processing_error: 1,
                uploaded_at: 1,
              },
            },
          )
          .sort({ uploaded_at: -1 })
          .limit(30)
          .toArray(),
        database
          .collection("archive_jobs")
          .find(
            { status: "failed" },
            {
              projection: {
                _id: 0,
                id: 1,
                wedding_id: 1,
                error: 1,
                created_at: 1,
              },
            },
          )
          .sort({ created_at: -1 })
          .limit(30)
          .toArray(),
        database
          .collection("media")
          .find(
            { purge_at: { $lte: now }, purging: { $ne: true } },
            {
              projection: {
                _id: 0,
                id: 1,
                wedding_id: 1,
                original_name: 1,
                purge_at: 1,
              },
            },
          )
          .sort({ purge_at: 1 })
          .limit(30)
          .toArray(),
        weddings
          .find(
            { purged_at: null, package_snapshot: { $exists: true } },
            {
              projection: {
                _id: 0,
                id: 1,
                title: 1,
                package_code: 1,
                package_snapshot: 1,
                media_bytes: 1,
                trashed_bytes: 1,
                reserved_upload_bytes: 1,
                storage_limit_override_bytes: 1,
              },
            },
          )
          .toArray(),
      ]);
      const quotaDetails = quotaRows
        .map((row) => {
          const base = packageStorageLimit(row.package_snapshot!);
          const limit = Math.max(
            base || 0,
            row.storage_limit_override_bytes || 0,
          );
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
        })
        .filter((row) => row.percent >= 80)
        .sort((a, b) => b.percent - a.percent);
      let checked = 0,
        missing = 0,
        r2_error = "";
      try {
        const { client, bucket } = storage();
        const results = await Promise.all(
          sample.map(async (row) => {
            try {
              await client.send(
                new HeadObjectCommand({
                  Bucket: bucket,
                  Key: row.storage_path,
                }),
              );
              return true;
            } catch {
              return false;
            }
          }),
        );
        checked = results.length;
        missing = results.filter((found) => !found).length;
      } catch (reason) {
        r2_error =
          reason instanceof Error ? reason.message : "R2 kontrol edilemedi.";
      }
      return json({
        media: {
          count: mediaTotals?.count || 0,
          bytes: mediaTotals?.bytes || 0,
        },
        consistency: { checked, missing, r2_error, mode: "latest-sample" },
        failures: { processing: processingFailures, archives: archiveFailures },
        retention: { due: retentionDue },
        archives: { active: archiveActive },
        details: {
          failed_media: failedMedia,
          failed_archives: failedArchives,
          retention_due: dueItems,
        },
        quotas: {
          warning: quotaDetails.filter(
            (row) => row.percent >= 80 && row.percent < 100,
          ).length,
          blocked: quotaDetails.filter((row) => row.percent >= 100).length,
          details: quotaDetails.slice(0, 50),
        },
        finance: {
          enabled: true,
          recognized_revenue: 0,
          reason:
            "Finans, komisyon ve dinamik ek ürün fiyatlandırma motoru etkin. Gelir yalnızca tahsil edilmiş satışlardan oluşur.",
        },
      });
    }
    if (route === "admin/operations/retry" && method === "POST" && user) {
      requirePlatform(user);
      const data = z
        .discriminatedUnion("kind", [
          z.object({
            kind: z.literal("media"),
            id: z.string().min(1).max(100),
          }),
          z.object({
            kind: z.literal("archive"),
            id: z.string().min(1).max(100),
          }),
        ])
        .parse(await req.json());
      if (data.kind === "media") {
        const result = await database.collection("media").updateOne(
          { id: data.id, processing_status: "failed" },
          {
            $set: { processing_status: "pending" },
            $unset: { processing_error: "" },
          },
        );
        if (!result.matchedCount)
          throw new HttpError(404, "Başarısız medya kaydı bulunamadı.");
      } else {
        const result = await database
          .collection("archive_jobs")
          .updateOne(
            { id: data.id, status: "failed" },
            { $set: { status: "pending" }, $unset: { error: "" } },
          );
        if (!result.matchedCount)
          throw new HttpError(404, "Başarısız arşiv işi bulunamadı.");
      }
      await audit(req, "operation.retried", user, {
        kind: data.kind,
        id: data.id,
      });
      return json({ ok: true });
    }
    if (route === "admin/notifications" && method === "GET" && user) {
      const scope = weddingScope(user);
      const eventIds =
        user.role === "platform"
          ? null
          : await weddings
              .find(scope, { projection: { id: 1 } })
              .map((row) => row.id)
              .toArray();
      const mediaScope = eventIds ? { wedding_id: { $in: eventIds } } : {};
      const now = new Date(),
        soon = new Date(now.getTime() + 3 * 86400_000).toISOString();
      const [failedMedia, failedArchives, expiring, drafts, quotaRows] =
        await Promise.all([
          database
            .collection("media")
            .countDocuments({ ...mediaScope, processing_status: "failed" }),
          database
            .collection("archive_jobs")
            .countDocuments({ ...mediaScope, status: "failed" }),
          weddings.countDocuments({
            ...scope,
            expires_at: { $gt: now.toISOString(), $lte: soon },
            lifecycle_status: { $ne: "archived" },
          }),
          weddings.countDocuments({ ...scope, lifecycle_status: "draft" }),
          weddings
            .find(
              {
                ...scope,
                purged_at: null,
                package_snapshot: { $exists: true },
              },
              {
                projection: {
                  package_snapshot: 1,
                  media_bytes: 1,
                  trashed_bytes: 1,
                  reserved_upload_bytes: 1,
                  storage_limit_override_bytes: 1,
                },
              },
            )
            .toArray(),
        ]);
      const quotaUsage = quotaRows.map((row) => {
        const limit = Math.max(
          packageStorageLimit(row.package_snapshot!) || 0,
          row.storage_limit_override_bytes || 0,
        );
        return limit ? storageBytesInUse(row) / limit : 0;
      });
      const quotaBlocked =
        user.role === "platform"
          ? quotaUsage.filter((usage) => usage >= 1).length
          : 0;
      const quotaWarning =
        user.role === "platform"
          ? quotaUsage.filter((usage) => usage >= 0.8 && usage < 1).length
          : 0;
      const canSeePrintJobs =
        accountHasPermission(user, "print_job.manage") ||
        accountHasPermission(user, "print_job.view_assigned");
      const printRows = canSeePrintJobs
        ? await database
            .collection<PrintJob>("print_jobs")
            .find(
              accountHasPermission(user, "print_job.manage")
                ? {}
                : { printer_account_id: user.id },
              {
                projection: {
                  _id: 0,
                  id: 1,
                  status: 1,
                  due_date: 1,
                  production_pdf: 1,
                  printer_preflight: 1,
                },
              },
            )
            .toArray()
        : [];
      const today = now.toISOString().slice(0, 10);
      const dueSoon = new Date(now.getTime() + 3 * 86400_000)
        .toISOString()
        .slice(0, 10);
      const activePrintRows = printRows.filter(
        (row) =>
          row.status !== "delivered_to_partner" && row.status !== "cancelled",
      );
      const overduePrintJobs = activePrintRows.filter(
        (row) => row.due_date && row.due_date < today,
      ).length;
      const upcomingPrintJobs = activePrintRows.filter(
        (row) =>
          row.due_date && row.due_date >= today && row.due_date <= dueSoon,
      ).length;
      const printActionRequired = activePrintRows.filter((row) =>
        accountHasPermission(user, "print_job.manage")
          ? (row.status === "assigned" && !row.production_pdf) ||
            ["ready", "received_by_shineqr", "quality_checked"].includes(
              row.status,
            )
          : row.status === "assigned" ||
            (row.status === "downloaded" && !row.printer_preflight) ||
            row.status === "printing",
      ).length;
      const completedPhotographyDeliveries =
        user.role === "owner" && eventIds?.length
          ? await database
              .collection("organization_participants")
              .countDocuments({
                wedding_id: { $in: eventIds },
                participant_role: "photographer",
                delivery_status: "completed",
                active: true,
              })
          : 0;
      const items = [
        failedMedia
          ? {
              id: "failed-media",
              severity: "danger",
              title: `${failedMedia} medya işlenemedi`,
              description: "Başarısız medya işlemlerini inceleyin.",
              href: "/admin/operations",
            }
          : null,
        failedArchives
          ? {
              id: "failed-archives",
              severity: "danger",
              title: `${failedArchives} arşiv işi başarısız`,
              description: "Arşiv işlerini yeniden deneyin.",
              href: "/admin/operations",
            }
          : null,
        expiring
          ? {
              id: "expiring",
              severity: "warning",
              title: `${expiring} organizasyonun saklama süresi yaklaşıyor`,
              description: "Gerekli arşivleri hazırlayın.",
              href: "/admin?status=expired",
            }
          : null,
        drafts
          ? {
              id: "drafts",
              severity: "info",
              title: `${drafts} yayınlanmamış taslak`,
              description: "Taslakları tamamlayın veya temizleyin.",
              href: "/admin?status=draft",
            }
          : null,
        quotaBlocked
          ? {
              id: "quota-blocked",
              severity: "danger",
              title: `${quotaBlocked} organizasyonun kotası doldu`,
              description:
                "Yüklemeler durduruldu. Ek kapasite kararını inceleyin.",
              href: "/admin/operations",
            }
          : null,
        quotaWarning
          ? {
              id: "quota-warning",
              severity: "warning",
              title: `${quotaWarning} organizasyon kota sınırına yaklaştı`,
              description: "Depolama kullanımı %80 seviyesini geçti.",
              href: "/admin/operations",
            }
          : null,
        overduePrintJobs
          ? {
              id: "print-overdue",
              severity: "danger",
              title: `${overduePrintJobs} baskı işinin hedef tarihi geçti`,
              description: "Geciken baskı ve teslimat adımlarını inceleyin.",
              href: "/admin/print-jobs",
            }
          : null,
        upcomingPrintJobs
          ? {
              id: "print-due-soon",
              severity: "warning",
              title: `${upcomingPrintJobs} baskı işinin teslim tarihi yaklaşıyor`,
              description: "Önümüzdeki 3 günün üretim planını kontrol edin.",
              href: "/admin/print-jobs",
            }
          : null,
        printActionRequired
          ? {
              id: "print-action-required",
              severity: "info",
              title: `${printActionRequired} baskı işi sizden işlem bekliyor`,
              description: "Atanan operasyon adımını tamamlayın.",
              href: "/admin/print-jobs",
            }
          : null,
        completedPhotographyDeliveries
          ? {
              id: "photography-delivered",
              severity: "info",
              title: "Profesyonel fotoğraflarınız hazır",
              description: `${completedPhotographyDeliveries} fotoğrafçı teslimatı albümünüze eklendi.`,
              href: "/admin",
            }
          : null,
      ].filter(Boolean);
      return json({ items, total: items.length });
    }
    if (route === "admin/search" && method === "GET" && user) {
      const query = (req.nextUrl.searchParams.get("q") || "")
        .trim()
        .slice(0, 80);
      if (query.length < 2) return json({ items: [] });
      const matcher = { $regex: escapeRegex(query), $options: "i" };
      const partnerScope =
        user.role === "platform" ? {} : { id: user.partner_id };
      const accountScope =
        user.role === "platform" ? {} : { partner_id: user.partner_id };
      const [eventRows, partnerRows, accountRows] = await Promise.all([
        weddings
          .find(
            {
              ...weddingScope(user),
              $or: [
                { title: matcher },
                { event_type: matcher },
                { customer_name: matcher },
                { customer_email: matcher },
              ],
            },
            { projection: { _id: 0, id: 1, title: 1, event_type: 1 } },
          )
          .limit(8)
          .toArray(),
        database
          .collection("partners")
          .find(
            { ...partnerScope, name: matcher },
            { projection: { _id: 0, id: 1, name: 1 } },
          )
          .limit(6)
          .toArray(),
        user.role === "owner"
          ? []
          : database
              .collection("users")
              .find(
                {
                  ...accountScope,
                  $or: [{ display_name: matcher }, { email: matcher }],
                },
                {
                  projection: {
                    _id: 0,
                    id: 1,
                    display_name: 1,
                    email: 1,
                    role: 1,
                  },
                },
              )
              .limit(8)
              .toArray(),
      ]);
      return json({
        items: [
          ...eventRows.map((row) => ({
            id: row.id,
            type: "event",
            title: row.title,
            subtitle: row.event_type,
            href: `/admin/${row.id}`,
          })),
          ...partnerRows.map((row) => ({
            id: row.id,
            type: "partner",
            title: row.name,
            subtitle: "İşletme",
            href: `/admin/partners/${row.id}`,
          })),
          ...accountRows.map((row) => ({
            id: row.id,
            type: "account",
            title: row.display_name,
            subtitle: row.email,
            href: "/admin/accounts",
          })),
        ],
      });
    }
    if (route === "admin/audit" && method === "GET" && user) {
      requirePlatform(user);
      const page = Math.max(
        1,
        Number(req.nextUrl.searchParams.get("page")) || 1,
      );
      const limit = 30;
      const search = (req.nextUrl.searchParams.get("search") || "")
        .trim()
        .slice(0, 100);
      const action = (req.nextUrl.searchParams.get("action") || "")
        .trim()
        .slice(0, 100);
      const role = (req.nextUrl.searchParams.get("role") || "")
        .trim()
        .slice(0, 30);
      const from = req.nextUrl.searchParams.get("from") || "";
      const to = req.nextUrl.searchParams.get("to") || "";
      const filter = {
        ...(action ? { action } : {}),
        ...(role ? { actor_role: role } : {}),
        ...(from || to
          ? {
              at: {
                ...(from ? { $gte: `${from}T00:00:00.000Z` } : {}),
                ...(to ? { $lte: `${to}T23:59:59.999Z` } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              $or: ["action", "actor_id", "actor_role", "ip"].map((field) => ({
                [field]: { $regex: escapeRegex(search), $options: "i" },
              })),
            }
          : {}),
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
      const data = z
        .object({
          ids: z.array(z.string().uuid()).min(1).max(100),
          action: z.enum(["archive", "restore"]),
        })
        .parse(await req.json());
      const result = await weddings.updateMany(
        { id: { $in: data.ids }, ...weddingScope(user) },
        {
          $set:
            data.action === "archive"
              ? {
                  lifecycle_status: "archived",
                  archived_at: new Date().toISOString(),
                }
              : { lifecycle_status: "upcoming", archived_at: null },
        },
      );
      await audit(req, `wedding.bulk_${data.action}`, user, {
        wedding_ids: data.ids,
        matched: result.matchedCount,
      });
      return json({
        matched: result.matchedCount,
        modified: result.modifiedCount,
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
        const eventSales = await database
          .collection<SaleRecord>("sales")
          .find(
            { wedding_id: { $in: events.map((event) => event.id) } },
            { projection: { _id: 0, wedding_id: 1, status: 1 } },
          )
          .toArray();
        const saleStatusByWedding = new Map(
          eventSales.map((sale) => [sale.wedding_id, sale.status]),
        );
        return json({
          items: events.map((w) => ({
            ...w,
            commercial_status:
              w.lifecycle_status !== "draft"
                ? "published"
                : saleStatusByWedding.get(w.id) === "paid"
                  ? "payment_verified"
                  : saleStatusByWedding.has(w.id)
                    ? "awaiting_payment"
                    : "not_ready",
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
        await ensureActivePartners([
          data.seller_partner_id,
          data.venue_partner_id,
          data.planner_partner_id,
        ]);
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
        const defaultPackage = await currentPackage(database, "plan-1");
        const w: Wedding = {
          ...data,
          id: randomUUID(),
          partner_id,
          lead_partner_id: data.lead_partner_id || partner_id,
          seller_partner_id: data.seller_partner_id || partner_id,
          venue_partner_id: data.venue_partner_id || null,
          planner_partner_id: data.planner_partner_id || null,
          participant_partner_ids: [
            ...new Set(
              [
                partner_id,
                data.seller_partner_id,
                data.venue_partner_id,
                data.planner_partner_id,
              ].filter((value): value is string => !!value),
            ),
          ],
          owner_id: null,
          package_code: "plan-1",
          package_snapshot: defaultPackage,
          add_on_selections: [],
          price_snapshot: priceSnapshotForPackage(defaultPackage, [], []),
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
      requirePermission(
        user,
        data.id ? "organization.update" : "organization.create",
      );
      if (data.id) {
        const existing = await eventFor(user, data.id);
        if (existing.lifecycle_status !== "draft")
          throw new HttpError(
            409,
            "Yalnızca taslak organizasyonlar bu akışta güncellenebilir.",
          );
        if (data.partner_id && data.partner_id !== existing.partner_id)
          throw new HttpError(400, "Organizasyonun işletmesi değiştirilemez.");
        if (
          user.role !== "platform" &&
          existing.approval_status === "submitted"
        )
          throw new HttpError(
            409,
            "Onay bekleyen organizasyon değiştirilemez.",
          );
        await ensureActivePartners([
          data.seller_partner_id,
          data.venue_partner_id,
          data.planner_partner_id,
        ]);
        const {
          id: _id,
          partner_id: _partner,
          package_code,
          add_on_selections,
          qr_quantity_selections,
          ...changes
        } = data;
        const effectivePackageCode =
          package_code || existing.package_code || "plan-1";
        const effectivePackage = package_code
          ? await currentPackage(database, package_code)
          : existing.package_snapshot ||
            (await currentPackage(database, effectivePackageCode));
        const addOnProducts = await database
          .collection<AddOnProduct>("add_on_products")
          .find({
            id: {
              $in: [
                ...new Set([
                  ...add_on_selections.map((item) => item.product_id),
                  ...qr_quantity_selections.map((item) => item.product_id),
                ]),
              ],
            },
            active: true,
          })
          .toArray();
        requireCompleteCustomDesignRequest(
          addOnProducts,
          data.custom_design_request || existing.custom_design_request,
          data.cover_images || existing.cover_images,
        );
        let pricing;
        let normalizedSelections;
        try {
          const normalized = selectionsWithExtraQr(
            effectivePackage as PackageConfiguration,
            add_on_selections,
            qr_quantity_selections,
            addOnProducts,
          );
          normalizedSelections = normalized.selections;
          pricing = priceSnapshotForPackage(
            effectivePackage as PackageConfiguration,
            normalizedSelections,
            addOnProducts,
          );
          pricing.qr_details = normalized.qr_details;
        } catch (reason) {
          throw new HttpError(
            409,
            reason instanceof Error
              ? reason.message
              : "Ek ürün seçimi geçersiz.",
          );
        }
        const packageChanges = package_code
          ? {
              package_code,
              package_snapshot: effectivePackage,
              upload_days:
                effectivePackage.uploadWindow === "event-day" ? 1 : 7,
            }
          : {};
        if (changes.cover_images)
          await validateCovers(changes.cover_images, existing.partner_id);
        await weddings.updateOne(
          { id: existing.id, ...weddingScope(user), lifecycle_status: "draft" },
          {
            $set: {
              ...changes,
              ...packageChanges,
              participant_partner_ids: [
                ...new Set(
                  [
                    existing.lead_partner_id || existing.partner_id,
                    changes.seller_partner_id ||
                      existing.seller_partner_id ||
                      existing.partner_id,
                    changes.venue_partner_id ?? existing.venue_partner_id,
                    changes.planner_partner_id ?? existing.planner_partner_id,
                  ].filter((value): value is string => !!value),
                ),
              ],
              add_on_selections: normalizedSelections,
              qr_quantity_selections,
              price_snapshot: pricing,
              updated_at: new Date().toISOString(),
            },
          },
        );
        await audit(req, "wedding.draft_saved", user, {
          wedding_id: existing.id,
          wizard_step: changes.wizard_step,
        });
        return json(
          await weddings.findOne(
            { id: existing.id },
            { projection: { _id: 0 } },
          ),
        );
      }
      const partner_id =
        user.role === "platform"
          ? data.partner_id || "platform"
          : user.partner_id!;
      const partner =
        partner_id === "platform"
          ? {
              id: "platform",
              name: "Platform organizasyonları",
              active: true,
              logo_url: "",
            }
          : await database
              .collection("partners")
              .findOne({ id: partner_id, active: true });
      if (!partner) throw new HttpError(400, "İşletme bulunamadı.");
      await ensureActivePartners([
        data.seller_partner_id,
        data.venue_partner_id,
        data.planner_partner_id,
      ]);
      const id = randomUUID();
      const now = new Date().toISOString();
      const packageCode = data.package_code || "plan-1";
      const selectedPackage = await currentPackage(database, packageCode);
      const selections = data.add_on_selections || [];
      const qrSelections = data.qr_quantity_selections || [];
      const addOnProducts = await database
        .collection<AddOnProduct>("add_on_products")
        .find({
          id: {
            $in: [
              ...new Set([
                ...selections.map((item) => item.product_id),
                ...qrSelections.map((item) => item.product_id),
              ]),
            ],
          },
          active: true,
        })
        .toArray();
      requireCompleteCustomDesignRequest(
        addOnProducts,
        data.custom_design_request,
        data.cover_images || [],
      );
      let pricing;
      let normalizedSelections;
      try {
        const normalized = selectionsWithExtraQr(
          selectedPackage,
          selections,
          qrSelections,
          addOnProducts,
        );
        normalizedSelections = normalized.selections;
        pricing = priceSnapshotForPackage(
          selectedPackage,
          normalizedSelections,
          addOnProducts,
        );
        pricing.qr_details = normalized.qr_details;
      } catch (reason) {
        throw new HttpError(
          409,
          reason instanceof Error ? reason.message : "Ek ürün seçimi geçersiz.",
        );
      }
      const draft: Wedding = {
        id,
        slug: data.slug || `taslak-${id}`,
        partner_id,
        lead_partner_id: partner_id,
        seller_partner_id: data.seller_partner_id || partner_id,
        venue_partner_id: data.venue_partner_id || null,
        planner_partner_id: data.planner_partner_id || null,
        participant_partner_ids: [
          ...new Set(
            [
              partner_id,
              data.seller_partner_id,
              data.venue_partner_id,
              data.planner_partner_id,
            ].filter((value): value is string => !!value),
          ),
        ],
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
        customer_phone: data.customer_phone || "",
        photographer_package_requested:
          data.photographer_package_requested || false,
        lifecycle_status: "draft",
        wizard_step: data.wizard_step,
        created_at: now,
        published_at: null,
        archived_at: null,
        package_code: packageCode,
        package_snapshot: selectedPackage,
        add_on_selections: normalizedSelections,
        qr_quantity_selections: qrSelections,
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
      if (draft.cover_images.length)
        await validateCovers(draft.cover_images, partner_id);
      await weddings.insertOne(draft);
      if (
        user.role === "partner" &&
        effectiveStaffRole(user) !== "partner_owner"
      ) {
        await database
          .collection("users")
          .updateOne(
            { id: user.id, partner_id },
            { $addToSet: { assigned_event_ids: id } },
          );
        await database.collection("organization_participants").updateOne(
          { wedding_id: id, account_id: user.id },
          {
            $set: { active: true },
            $setOnInsert: {
              id: randomUUID(),
              wedding_id: id,
              account_id: user.id,
              partner_id,
              participant_role: effectiveStaffRole(user),
              assigned_at: now,
              assigned_by: user.id,
            },
          },
          { upsert: true },
        );
        invalidateSessionCache();
      }
      await audit(req, "wedding.draft_created", user, { wedding_id: id });
      return json(draft, 201);
    }
    if (route === "admin/design-plans" && method === "GET" && user) {
      requirePlatform(user);
      requirePermission(user, "design.select");
      const plans = await database
        .collection<Wedding>("weddings")
        .find(
          { design_request: { $exists: true } },
          {
            projection: {
              _id: 0,
              id: 1,
              title: 1,
              customer_name: 1,
              customer_email: 1,
              customer_phone: 1,
              wedding_date: 1,
              package_snapshot: 1,
              add_on_selections: 1,
              design_request: 1,
            },
          },
        )
        .sort({ "design_request.updated_at": -1 })
        .limit(250)
        .toArray();
      return json(plans);
    }
    if (path[0] === "admin" && path[1] === "weddings" && path[2] && user) {
      const event = await eventFor(user, path[2]);
      const id = event.id;
      const surfaceIds = ["qr", "loading", "wedding"] as const;
      const surfaceSchema = z.object({
        mode: z.enum(["catalog", "custom"]),
        template_id: z.string().trim().max(100).optional(),
        color: z.string().trim().max(80).default(""),
        heading: z.string().trim().max(80).default(""),
        title: z.string().trim().max(120).default(""),
        description: z.string().trim().max(500).default(""),
        cta: z.string().trim().max(80).default(""),
        footer: z.string().trim().max(160).default(""),
        back_title: z.string().trim().max(120).default(""),
        back_description: z.string().trim().max(500).default(""),
        back_names: z.string().trim().max(120).default(""),
        back_date: z.string().trim().max(80).default(""),
        style: z.string().trim().max(100).default(""),
        format: z.string().trim().max(100).default(""),
        typography: z.string().trim().max(100).default(""),
        layout: z.string().trim().max(100).default(""),
        notes: z.string().trim().max(2000).default(""),
        reference_image_urls: z.array(z.string().max(500)).max(10).default([]),
      });
      if (
        path.length === 6 &&
        path[3] === "design-request" &&
        path[4] === "delivery" &&
        method === "GET"
      ) {
        const surface = z.enum(surfaceIds).parse(path[5]);
        const delivery = event.design_request?.surfaces[surface].delivery;
        if (!delivery)
          throw new HttpError(404, "Tamamlanan tasarım bulunamadı.");
        return coverAssetResponse(delivery.preview_url);
      }
      if (
        path.length === 4 &&
        path[3] === "design-request" &&
        method === "PUT"
      ) {
        requirePermission(user, "design.select");
        if (
          event.design_request &&
          !["draft", "revision_requested"].includes(event.design_request.status)
        )
          throw new HttpError(
            409,
            "Gönderilmiş tasarım talebi değiştirilemez.",
          );
        const input = z
          .object({
            action: z.enum(["save", "submit"]),
            surfaces: z.object({
              qr: surfaceSchema,
              loading: surfaceSchema,
              wedding: surfaceSchema,
            }),
          })
          .parse(await req.json());
        const knownPackageCode: PackageCode =
          event.package_code === "plan-2" || event.package_code === "plan-3"
            ? event.package_code
            : "plan-1";
        if (
          surfaceIds.some(
            (surface) => input.surfaces[surface].mode === "custom",
          ) &&
          !hasCustomDesignEntitlement(
            event.package_snapshot || packageSnapshot(knownPackageCode),
            event.price_snapshot,
          )
        )
          throw new HttpError(
            403,
            "Özel tasarım yalnızca Paket 3 veya Özel Tasarım ek ürünü ile kullanılabilir.",
          );
        if (input.action === "submit" && input.surfaces.qr.mode === "catalog") {
          const qrInput = input.surfaces.qr;
          const qrTemplate =
            qrTemplates[qrInput.template_id as keyof typeof qrTemplates];
          const variant = qrTemplate?.variants.find(
            (item) => item.id === qrInput.color,
          );
          const product = qrProducts.find((item) => item.id === qrInput.format);
          if (!qrTemplate || !variant)
            throw new HttpError(
              400,
              "QR koleksiyonu için geçerli bir renk varyasyonu seçin.",
            );
          if (!product || !product.compatibleTemplates.includes(qrTemplate.id))
            throw new HttpError(
              400,
              "QR koleksiyonuyla uyumlu fiziksel ürünü seçin.",
            );
          if (!qrProductEntitlement(product, event.package_snapshot).allowed)
            throw new HttpError(
              403,
              "Seçilen fiziksel QR ürünü organizasyon paketine dahil değil.",
            );
        }
        const surfaces = Object.fromEntries(
          surfaceIds.map((surface) => {
            const value = input.surfaces[surface];
            const template = value.template_id
              ? availableDesignRequestTemplates(surface).find(
                  (item) => item.id === value.template_id,
                )
              : undefined;
            if (value.mode === "catalog" && !template)
              throw new HttpError(
                400,
                `${surface} için geçerli bir tasarım seçin.`,
              );
            if (input.action === "submit" && (!value.title || !value.cta))
              throw new HttpError(
                400,
                "Her bölümde başlık ve CTA metni gereklidir.",
              );
            if (
              input.action === "submit" &&
              value.mode === "custom" &&
              (!value.style || !value.notes)
            )
              throw new HttpError(
                400,
                "Özel tasarım için stil ve tasarım açıklaması gereklidir.",
              );
            return [
              surface,
              {
                ...value,
                template_name: template?.name,
                template_asset: template?.asset,
                status: input.action === "submit" ? "submitted" : "draft",
              },
            ];
          }),
        );
        const now = new Date().toISOString();
        const request = {
          version: 1 as const,
          status:
            input.action === "submit"
              ? ("submitted" as const)
              : ("draft" as const),
          surfaces: surfaces as DesignRequest["surfaces"],
          updated_at: now,
          updated_by: user.id,
          ...(input.action === "submit"
            ? { submitted_at: now, submitted_by: user.id }
            : {}),
        };
        await validateCovers(
          surfaceIds.flatMap(
            (surface) => input.surfaces[surface].reference_image_urls,
          ),
          event.partner_id,
        );
        await weddings.updateOne(
          { id, ...weddingScope(user) },
          { $set: { design_request: request } },
        );
        await audit(
          req,
          input.action === "submit"
            ? "wedding.design_request_submitted"
            : "wedding.design_request_saved",
          user,
          { wedding_id: id },
        );
        return json(request);
      }
      if (
        path.length === 5 &&
        path[3] === "design-request" &&
        path[4] === "deliver" &&
        method === "POST"
      ) {
        requirePlatform(user);
        requirePermission(user, "design.select");
        if (!event.design_request)
          throw new HttpError(409, "Tasarım talebi bulunamadı.");
        const input = z
          .object({
            surface: z.enum(surfaceIds),
            preview_url: z.string().max(500),
            notes: z.string().trim().max(1000).default(""),
          })
          .parse(await req.json());
        await validateCovers([input.preview_url], event.partner_id);
        const now = new Date().toISOString();
        const version =
          (event.design_request.surfaces[input.surface].delivery?.version ||
            0) + 1;
        await weddings.updateOne(
          { id },
          {
            $set: {
              [`design_request.surfaces.${input.surface}.delivery`]: {
                ...input,
                version,
                uploaded_at: now,
                uploaded_by: user.id,
              },
              [`design_request.surfaces.${input.surface}.status`]: "in_design",
              "design_request.status": "in_design",
              "design_request.updated_at": now,
              "design_request.updated_by": user.id,
            },
          },
        );
        await audit(req, "wedding.design_delivery_uploaded", user, {
          wedding_id: id,
          surface: input.surface,
          version,
        });
        return json({ ok: true });
      }
      if (
        path.length === 5 &&
        path[3] === "design-request" &&
        path[4] === "send" &&
        method === "POST"
      ) {
        requirePlatform(user);
        requirePermission(user, "design.select");
        if (
          !event.design_request ||
          surfaceIds.some(
            (surface) => !event.design_request?.surfaces[surface].delivery,
          )
        )
          throw new HttpError(
            409,
            "Üç tasarımın da teslim dosyası yüklenmelidir.",
          );
        const now = new Date().toISOString();
        const set: Record<string, unknown> = {
          "design_request.status": "awaiting_approval",
          "design_request.sent_at": now,
          "design_request.sent_by": user.id,
          "design_request.updated_at": now,
          "design_request.updated_by": user.id,
        };
        surfaceIds.forEach((surface) => {
          set[`design_request.surfaces.${surface}.status`] =
            "awaiting_approval";
        });
        await weddings.updateOne({ id }, { $set: set });
        await audit(req, "wedding.design_delivery_sent", user, {
          wedding_id: id,
        });
        return json({ ok: true });
      }
      if (
        path.length === 5 &&
        path[3] === "design-request" &&
        path[4] === "respond" &&
        method === "POST"
      ) {
        requirePermission(user, "design.approve_for_print");
        if (user.role !== "owner")
          throw new HttpError(
            403,
            "Tasarım onayını organizasyon müşterisi vermelidir.",
          );
        if (
          !event.design_request ||
          event.design_request.status !== "awaiting_approval"
        )
          throw new HttpError(409, "Onay bekleyen tasarım bulunamadı.");
        const input = z
          .object({
            surface: z.enum(surfaceIds),
            decision: z.enum(["approve", "revision"]),
            reason: z.string().trim().max(1000).default(""),
          })
          .parse(await req.json());
        if (input.decision === "revision" && input.reason.length < 5)
          throw new HttpError(400, "Revizyon nedenini açıklayın.");
        const now = new Date().toISOString();
        const status =
          input.decision === "approve" ? "completed" : "revision_requested";
        const othersApproved = surfaceIds
          .filter((s) => s !== input.surface)
          .every(
            (s) => event.design_request?.surfaces[s].status === "completed",
          );
        const used = event.design_revisions_used || 0;
        const limit = (
          event.package_snapshot ||
          packageSnapshot(
            event.package_code === "plan-2" || event.package_code === "plan-3"
              ? event.package_code
              : "plan-1",
          )
        ).revisionLimit;
        if (input.decision === "revision" && limit !== null && used >= limit)
          throw new HttpError(
            409,
            `Bu paketin ${limit} revizyon hakkı kullanıldı.`,
          );
        const changed = await weddings.updateOne(
          {
            id,
            ...weddingScope(user),
            ...(input.decision === "revision"
              ? {
                  design_revisions_used:
                    event.design_revisions_used === undefined
                      ? { $exists: false }
                      : used,
                }
              : {}),
          },
          {
            $set: {
              [`design_request.surfaces.${input.surface}.status`]: status,
              [`design_request.surfaces.${input.surface}.revision_reason`]:
                input.decision === "revision" ? input.reason : null,
              [`design_request.surfaces.${input.surface}.approved_at`]:
                input.decision === "approve" ? now : null,
              [`design_request.surfaces.${input.surface}.approved_by`]:
                input.decision === "approve" ? user.id : null,
              "design_request.status":
                input.decision === "revision"
                  ? "revision_requested"
                  : othersApproved
                    ? "completed"
                    : "awaiting_approval",
              "design_request.updated_at": now,
              "design_request.updated_by": user.id,
            },
            ...(input.decision === "revision"
              ? { $inc: { design_revisions_used: 1 } }
              : {}),
          },
        );
        if (!changed.modifiedCount)
          throw new HttpError(
            409,
            "Tasarım başka bir oturumda güncellendi. Sayfayı yenileyin.",
          );
        await audit(req, `wedding.design_${input.decision}`, user, {
          wedding_id: id,
          surface: input.surface,
        });
        return json({ ok: true });
      }
      if (path.length >= 4 && path[3] === "digital-invitation") {
        const invitationEntitled = digitalInvitationAccessEnabled(event);
        if (!invitationEntitled)
          throw new HttpError(
            403,
            "Dijital davetiye yalnızca Premium v2 paket hakkıyla kullanılabilir.",
          );
        if (path.length === 4 && method === "GET")
          return json(event.digital_invitation || null);
        if (path.length === 4 && method === "PUT") {
          requirePermission(user, "organization.update");
          const input = z
            .object({
              theme_id: z.enum(["botanical", "bluebell-timeless"]).default("botanical"),
              bride_name: z.string().trim().min(1).max(80).optional(),
              groom_name: z.string().trim().min(1).max(80).optional(),
              event_type: z.string().trim().min(2).max(80).optional(),
              event_date: z.string().date(),
              event_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
              venue: z.string().trim().max(200),
              venue_address: z.string().trim().max(500).optional(),
              map_url: z
                .string()
                .trim()
                .refine((value) => !value || (z.string().url().safeParse(value).success && value.startsWith("https://")), {
                  message: "Harita bağlantısı HTTPS olmalı.",
                }),
              message: z.string().trim().max(500).default(""),
              bride_family: z.string().trim().max(240).optional(),
              groom_family: z.string().trim().max(240).optional(),
              timeline: z.array(z.object({
                time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
                title: z.string().trim().min(1).max(100),
                description: z.string().trim().max(200),
              }).strict()).max(12).optional(),
              menu: z.array(z.object({
                course: z.string().trim().min(1).max(100),
                items: z.array(z.string().trim().min(1).max(160)).max(12),
              }).strict()).max(10).optional(),
              dress_code_title: z.string().trim().max(100).optional(),
              dress_code_note: z.string().trim().max(300).optional(),
              special_note: z.string().trim().max(600).optional(),
              whatsapp_number: z.string().trim().regex(/^$|^[0-9]{10,15}$/).optional(),
              music_url: z.string().trim().refine((value) => !value || (z.string().url().safeParse(value).success && value.startsWith("https://")), { message: "Müzik bağlantısı HTTPS olmalı." }).optional(),
              ceremony_title: z.string().trim().max(80).optional(),
              ceremony_date: z.union([z.literal(""), z.string().date()]).optional(),
              ceremony_time: z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]).optional(),
              ceremony_venue: z.string().trim().max(200).optional(),
              ceremony_address: z.string().trim().max(500).optional(),
              ceremony_map_url: z.string().trim().refine((value) => !value || (z.string().url().safeParse(value).success && value.startsWith("https://")), { message: "Nikâh harita bağlantısı HTTPS olmalı." }).optional(),
              show_countdown: z.boolean().optional(),
              show_families: z.boolean().optional(),
              show_gallery: z.boolean().optional(),
              story_title: z.string().trim().max(120).optional(),
              story_text: z.string().trim().max(1200).optional(),
              show_story: z.boolean().optional(),
              gallery_images: z.array(z.string().trim().min(1).max(1000)).max(20).optional(),
              loading_style: z.enum(["theme", "minimal", "none"]).optional(),
              loading_message: z.string().trim().max(120).optional(),
              animation_intensity: z.enum(["reduced", "rich", "cinematic"]).optional(),
            })
            .strict()
            .parse(await req.json());
          if (input.gallery_images && !invitationGalleryBelongsToWedding(input.gallery_images, event.cover_images || []))
            throw new HttpError(
              403,
              "Galeri yalnızca bu organizasyona ait görselleri kullanabilir.",
            );
          const now = new Date().toISOString();
          const content = {
            ...defaultDigitalInvitationContent,
            bride_name: event.bride_name || defaultDigitalInvitationContent.bride_name,
            groom_name: event.groom_name || defaultDigitalInvitationContent.groom_name,
            event_type: event.event_type || defaultDigitalInvitationContent.event_type,
            ...event.digital_invitation?.content,
            ...input,
          };
          const legacyPublishedContent =
            event.digital_invitation?.status === "published" && !event.digital_invitation.published_content
              ? event.digital_invitation.content || {
                  ...defaultDigitalInvitationContent,
                  bride_name: event.bride_name || defaultDigitalInvitationContent.bride_name,
                  groom_name: event.groom_name || defaultDigitalInvitationContent.groom_name,
                  event_type: event.event_type || defaultDigitalInvitationContent.event_type,
                  event_date: event.digital_invitation.event_date,
                  event_time: event.digital_invitation.event_time,
                  venue: event.digital_invitation.venue,
                  map_url: event.digital_invitation.map_url,
                  message: event.digital_invitation.message,
                }
              : null;
          const publishedContent = event.digital_invitation?.published_content || legacyPublishedContent || null;
          const invitation: NonNullable<Wedding["digital_invitation"]> = {
            template_version: 1,
            status: publishedContent ? "published" : "draft",
            theme_id: content.theme_id,
            content,
            published_content: publishedContent,
            has_unpublished_changes: Boolean(publishedContent),
            event_date: content.event_date,
            event_time: content.event_time,
            venue: content.venue,
            map_url: content.map_url,
            message: content.message,
            updated_at: now,
            updated_by: user.id,
            published_at: event.digital_invitation?.published_at || null,
            published_by: event.digital_invitation?.published_by || null,
          };
          await weddings.updateOne(
            { id, ...weddingScope(user) },
            { $set: { digital_invitation: invitation } },
          );
          await audit(req, "digital_invitation.draft_saved", user, {
            wedding_id: id,
            template_version: 1,
          });
          return json(invitation);
        }
        if (path.length === 5 && path[4] === "publish" && method === "POST") {
          requirePermission(user, "organization.update");
          if (!event.digital_invitation)
            throw new HttpError(
              409,
              "Önce dijital davetiye taslağı oluşturun.",
            );
          const now = new Date().toISOString();
          const published = await weddings.findOneAndUpdate(
            {
              id,
              ...weddingScope(user),
              "digital_invitation.updated_at":
                event.digital_invitation.updated_at,
            },
            {
              $set: {
                "digital_invitation.status": "published",
                "digital_invitation.published_content": event.digital_invitation.content || {
                  ...defaultDigitalInvitationContent,
                  bride_name: event.bride_name || defaultDigitalInvitationContent.bride_name,
                  groom_name: event.groom_name || defaultDigitalInvitationContent.groom_name,
                  event_type: event.event_type || defaultDigitalInvitationContent.event_type,
                  event_date: event.digital_invitation.event_date,
                  event_time: event.digital_invitation.event_time,
                  venue: event.digital_invitation.venue,
                  map_url: event.digital_invitation.map_url,
                  message: event.digital_invitation.message,
                },
                "digital_invitation.has_unpublished_changes": false,
                "digital_invitation.published_at": now,
                "digital_invitation.published_by": user.id,
              },
            },
            { returnDocument: "after", projection: { _id: 0 } },
          );
          if (!published)
            throw new HttpError(
              409,
              "Davetiye başka bir oturumda değiştirildi.",
            );
          await audit(req, "digital_invitation.published", user, {
            wedding_id: id,
            template_version: event.digital_invitation.template_version,
          });
          return json(published.digital_invitation);
        }
      }
      if (
        path.length === 4 &&
        path[3] === "photographer-invitations" &&
        method === "POST"
      ) {
        requirePermission(user, "organization.update");
        if (
          await database.collection("organization_participants").findOne({
            wedding_id: id,
            participant_role: "photographer",
            active: true,
          })
        )
          throw new HttpError(
            409,
            "Bu organizasyonda zaten aktif bir fotoğrafçı bulunuyor.",
          );
        const input = z
          .object({
            email: z.string().trim().toLowerCase().email().max(254),
            business_name: z.string().trim().min(2).max(160),
            phone: z.string().regex(/^0[0-9]{10}$/),
            address: z.string().trim().min(5).max(500),
            expires_at: z.string().datetime(),
            delivery_due_at: z.string().datetime().nullable().optional(),
            expected_file_count: z
              .number()
              .int()
              .min(1)
              .max(100000)
              .nullable()
              .optional(),
          })
          .strict()
          .parse(await req.json());
        if (Date.parse(input.expires_at) <= Date.now())
          throw new HttpError(
            400,
            "Davet son kullanma tarihi gelecekte olmalı.",
          );
        if (await database.collection("users").findOne({ email: input.email }))
          throw new HttpError(
            409,
            "Bu e-posta adresiyle kayıtlı hesap zaten var.",
          );
        const token = randomBytes(32).toString("hex");
        const invitationId = randomUUID();
        await database.collection("photographer_invitations").insertOne({
          id: invitationId,
          wedding_id: id,
          email: input.email,
          business_name: input.business_name,
          phone: input.phone,
          address: input.address,
          expires_at: input.expires_at,
          delivery_due_at: input.delivery_due_at ?? null,
          expected_file_count: input.expected_file_count ?? null,
          token_hash: hash(token),
          accepted_at: null,
          created_at: new Date().toISOString(),
          created_by: user.id,
        });
        await audit(req, "photographer.invitation_created", user, {
          invitation_id: invitationId,
          wedding_id: id,
          email: input.email,
        });
        return json(
          {
            id: invitationId,
            invite_url: `/photographer-invite/${token}`,
            expires_at: input.expires_at,
          },
          201,
        );
      }
      if (path.length === 4 && path[3] === "photographers") {
        requirePermission(user, "organization.update");
        const input = z.object({
          account_id: z.string().uuid(),
          delivery_due_at: z.string().datetime().nullable().optional(),
          expected_file_count: z
            .number()
            .int()
            .min(1)
            .max(100000)
            .nullable()
            .optional(),
        });
        if (method === "POST") {
          const data = input.parse(await req.json());
          const activePhotographer = await database
            .collection("organization_participants")
            .findOne({
              wedding_id: id,
              participant_role: "photographer",
              active: true,
              account_id: { $ne: data.account_id },
            });
          if (activePhotographer)
            throw new HttpError(
              409,
              "Bir organizasyona yalnızca bir aktif fotoğrafçı atanabilir.",
            );
          const photographer = await database.collection("users").findOne({
            id: data.account_id,
            role: "partner",
            staff_role: "photographer",
            disabled: false,
          });
          if (!photographer) throw new HttpError(404, "Fotoğrafçı bulunamadı.");
          await database
            .collection("users")
            .updateOne(
              { id: photographer.id },
              { $addToSet: { assigned_event_ids: id } },
            );
          const assignedAt = new Date().toISOString();
          await database.collection("organization_participants").updateOne(
            { wedding_id: id, account_id: photographer.id },
            {
              $set: {
                active: true,
                delivery_due_at: data.delivery_due_at ?? null,
                expected_file_count: data.expected_file_count ?? null,
                delivery_status: "assigned",
                delivered_file_count: 0,
                completed_at: null,
                completed_by: null,
              },
              $setOnInsert: {
                id: randomUUID(),
                wedding_id: id,
                account_id: photographer.id,
                partner_id: photographer.partner_id,
                participant_role: "photographer",
                assigned_at: assignedAt,
                assigned_by: user.id,
              },
            },
            { upsert: true },
          );
          await weddings.updateOne(
            { id },
            { $addToSet: { participant_partner_ids: photographer.partner_id } },
          );
          invalidateSessionCache();
          await audit(req, "wedding.photographer_assigned", user, {
            wedding_id: id,
            user_id: photographer.id,
            partner_id: photographer.partner_id,
          });
          return json({ ok: true });
        }
        if (method === "DELETE") {
          const data = input.parse(await req.json());
          await database
            .collection<Account>("users")
            .updateOne(
              { id: data.account_id, staff_role: "photographer" },
              { $pull: { assigned_event_ids: id } },
            );
          await database.collection("organization_participants").updateOne(
            { wedding_id: id, account_id: data.account_id },
            {
              $set: {
                active: false,
                unassigned_at: new Date().toISOString(),
                unassigned_by: user.id,
              },
            },
          );
          invalidateSessionCache();
          await audit(req, "wedding.photographer_unassigned", user, {
            wedding_id: id,
            user_id: data.account_id,
          });
          return json({ ok: true });
        }
      }
      if (
        path.length === 4 &&
        path[3] === "photographer-delivery" &&
        method === "POST"
      ) {
        requirePermission(user, "media.upload_professional");
        const assignment = await database
          .collection("organization_participants")
          .findOne({
            wedding_id: id,
            account_id: user.id,
            participant_role: "photographer",
            active: true,
          });
        if (!assignment)
          throw new HttpError(404, "Fotoğrafçı ataması bulunamadı.");
        if (assignment.delivery_status === "completed")
          throw new HttpError(409, "Profesyonel teslimat zaten tamamlandı.");
        const deliveredFileCount = await media.countDocuments({
          wedding_id: id,
          source: "photographer",
          uploader_account_id: user.id,
          deleted_at: null,
        });
        if (!deliveredFileCount)
          throw new HttpError(
            409,
            "Teslimatı tamamlamak için en az bir dosya yükleyin.",
          );
        const now = new Date().toISOString();
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            const changed = await database
              .collection("organization_participants")
              .updateOne(
                {
                  _id: assignment._id,
                  active: true,
                  delivery_status: { $ne: "completed" },
                },
                {
                  $set: {
                    delivery_status: "completed",
                    delivered_file_count: deliveredFileCount,
                    completed_at: now,
                    completed_by: user.id,
                  },
                },
                { session: transaction },
              );
            if (!changed.modifiedCount)
              throw new HttpError(
                409,
                "Teslimat başka bir oturumda tamamlandı.",
              );
            const photographerSale = await database
              .collection<PhotographerSaleRecord>("photographer_sales")
              .findOne(
                {
                  wedding_id: id,
                  photographer_account_id: user.id,
                  status: "paid",
                },
                { session: transaction },
              );
            if (photographerSale) {
              await database
                .collection<PhotographerSaleRecord>("photographer_sales")
                .updateOne(
                  {
                    id: photographerSale.id,
                    $or: [
                      { customer_approval_status: "pending_delivery" },
                      { customer_approval_status: { $exists: false } },
                    ],
                  },
                  {
                    $set: {
                      delivery_completed_at: now,
                      customer_approval_status: "pending",
                    },
                  },
                  { session: transaction },
                );
              await database
                .collection<ServicePayoutLedgerEntry>("service_payout_ledger")
                .updateMany(
                  {
                    sale_id: photographerSale.id,
                    type: "accrual",
                    beneficiary_type: {
                      $in: ["photographer", "originating_partner"],
                    },
                    status: "pending_delivery",
                  },
                  { $set: { status: "pending_customer_approval" } },
                  { session: transaction },
                );
            }
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "photographer.delivery_completed", user, {
          wedding_id: id,
          delivered_file_count: deliveredFileCount,
          expected_file_count: assignment.expected_file_count,
          late:
            !!assignment.delivery_due_at &&
            Date.parse(assignment.delivery_due_at) < Date.parse(now),
        });
        return json({
          delivery_status: "completed",
          delivered_file_count: deliveredFileCount,
          expected_file_count: assignment.expected_file_count || null,
          completed_at: now,
        });
      }
      if (
        path.length === 4 &&
        path[3] === "storage-limit" &&
        method === "PATCH"
      ) {
        requirePlatform(user);
        const { additional_gib } = z
          .object({
            additional_gib: z.number().int().min(0).max(350),
          })
          .parse(await req.json());
        const code: PackageCode =
          event.package_code === "plan-2" || event.package_code === "plan-3"
            ? event.package_code
            : "plan-1";
        const policy = event.package_snapshot || packageSnapshot(code);
        const base = packageStorageLimit(policy) || 0;
        const effective = base + additional_gib * GIB;
        await weddings.updateOne(
          { id },
          additional_gib
            ? {
                $set: {
                  storage_limit_override_bytes: effective,
                  storage_limit_approved_at: new Date().toISOString(),
                  storage_limit_approved_by: user.id,
                },
              }
            : {
                $unset: {
                  storage_limit_override_bytes: "",
                  storage_limit_approved_at: "",
                  storage_limit_approved_by: "",
                },
              },
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
        if (
          event.lifecycle_status !== "draft" ||
          event.approval_status !== "submitted"
        )
          throw new HttpError(409, "Bu organizasyon onay beklemiyor.");
        const validated = eventInput.safeParse(event);
        if (!validated.success)
          throw new HttpError(
            400,
            validated.error.issues[0]?.message ||
              "Organizasyon bilgileri eksik.",
          );
        if (
          !event.customer_name?.trim() ||
          !event.customer_email?.trim() ||
          !/^0[0-9]{10}$/.test(event.customer_phone || "")
        )
          throw new HttpError(
            400,
            "Müşteri adı, e-posta adresi ve telefonu gerekli.",
          );
        const approval = await database
          .collection("organization_approval_requests")
          .findOne({ wedding_id: id });
        if (
          !approval?.owner_credentials?.salt ||
          !approval?.owner_credentials?.passwordHash
        )
          throw new HttpError(
            409,
            "Müşteri hesap bilgileri bulunamadı. Organizasyonu yeniden onaya gönderin.",
          );
        const slugOwner = await weddings.findOne({
          slug: validated.data.slug,
          id: { $ne: id },
          lifecycle_status: { $ne: "draft" },
        });
        if (slugOwner)
          throw new HttpError(
            409,
            "Bu sayfa adresi başka bir organizasyonda kullanılıyor.",
          );
        const now = new Date().toISOString();
        const ownerId = randomUUID();
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            const claimed = await weddings.updateOne(
              {
                id,
                lifecycle_status: "draft",
                approval_status: "submitted",
                owner_id: null,
              },
              {
                $set: {
                  owner_id: ownerId,
                  lifecycle_status: "draft",
                  approval_status: "approved",
                  approved_at: now,
                  approved_by: user.id,
                  wizard_step: 7,
                  published_at: null,
                  published_by: null,
                  upload_enabled: false,
                },
              },
              { session: transaction },
            );
            if (!claimed.modifiedCount)
              throw new HttpError(
                409,
                "Onay talebi başka bir işlem tarafından değiştirildi.",
              );
            await database.collection("users").insertOne(
              {
                id: ownerId,
                email: event.customer_email,
                display_name: event.customer_name,
                phone: event.customer_phone,
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
            await database
              .collection("organization_approval_requests")
              .deleteOne({ wedding_id: id }, { session: transaction });
            await ensureSaleDraft(database, event, user.id, transaction);
            await ensureRequestedPhotographerSale(
              database,
              event,
              user.id,
              transaction,
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "wedding.approved", user, {
          wedding_id: id,
          submitted_by: approval.submitted_by,
        });
        return json({
          ok: true,
          lifecycle_status: "draft",
          approval_status: "approved",
        });
      }
      if (
        path.length === 4 &&
        path[3] === "approval-decision" &&
        method === "POST"
      ) {
        requirePlatform(user);
        if (
          event.lifecycle_status !== "draft" ||
          event.approval_status !== "submitted"
        )
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
              throw new HttpError(
                409,
                "Onay talebi başka bir işlem tarafından değiştirildi.",
              );
            await database
              .collection("organization_approval_requests")
              .deleteOne({ wedding_id: id }, { session: transaction });
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
        requirePermission(
          user,
          user.role === "platform"
            ? "organization.approve"
            : "organization.submit",
        );
        if (event.lifecycle_status !== "draft")
          throw new HttpError(409, "Bu organizasyon zaten yayınlanmış.");
        const validated = eventInput.safeParse(event);
        if (!validated.success)
          throw new HttpError(
            400,
            validated.error.issues[0]?.message ||
              "Organizasyon bilgileri eksik.",
          );
        if (
          !event.customer_name?.trim() ||
          !event.customer_email?.trim() ||
          !/^0[0-9]{10}$/.test(event.customer_phone || "")
        )
          throw new HttpError(
            400,
            "Müşteri adı, e-posta adresi ve telefonu gerekli.",
          );
        const slugOwner = await weddings.findOne({
          slug: validated.data.slug,
          id: { $ne: id },
          lifecycle_status: { $ne: "draft" },
        });
        if (slugOwner)
          throw new HttpError(
            409,
            "Bu sayfa adresi başka bir organizasyonda kullanılıyor.",
          );
        const times = deadlines(
          validated.data.wedding_date,
          event.upload_days || 7,
          event.package_snapshot?.digitalRetentionMonths || 3,
        );
        const lifecycle_status =
          Date.parse(`${validated.data.wedding_date}T00:00:00+03:00`) >
          Date.now()
            ? "upcoming"
            : "active";
        const now = new Date().toISOString();
        if (user.role !== "platform") {
          const credentials = eventPublishInput.parse(await req.json());
          const password = await passwordFields(credentials.password);
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
                    {
                      approval_status: {
                        $in: ["draft", "changes_requested", "rejected"],
                      },
                    },
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
                throw new HttpError(
                  409,
                  "Organizasyon zaten onay bekliyor veya yayınlanmış.",
                );
              await database
                .collection("organization_approval_requests")
                .updateOne(
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
        if (event.owner_id && event.approval_status === "approved") {
          const paidSale = await database
            .collection<SaleRecord>("sales")
            .findOne({
              wedding_id: id,
              status: "paid",
            });
          if (!paidSale)
            throw new HttpError(
              409,
              "Organizasyon yayınlanmadan önce ödeme onaylanmalı.",
            );
          const published = await weddings.findOneAndUpdate(
            {
              id,
              lifecycle_status: "draft",
              approval_status: "approved",
              owner_id: event.owner_id,
            },
            {
              $set: {
                lifecycle_status,
                published_at: now,
                published_by: user.id,
                upload_enabled: true,
                uploads_open_at: now,
                ...times,
              },
            },
            { returnDocument: "after", projection: { _id: 0 } },
          );
          if (!published)
            throw new HttpError(
              409,
              "Organizasyon başka bir işlem tarafından değiştirildi.",
            );
          await audit(req, "wedding.published", user, {
            wedding_id: id,
            sale_id: paidSale.id,
          });
          return json({
            ok: true,
            lifecycle_status: published.lifecycle_status,
          });
        }
        const credentials = eventPublishInput.parse(await req.json());
        const password = await passwordFields(credentials.password);
        const ownerId = randomUUID();
        const transaction = (await mongoClient()).startSession();
        try {
          await transaction.withTransaction(async () => {
            const claimed = await weddings.updateOne(
              {
                id,
                ...weddingScope(user),
                lifecycle_status: "draft",
                owner_id: null,
              },
              {
                $set: {
                  owner_id: ownerId,
                  lifecycle_status: "draft",
                  approval_status: "approved",
                  approved_at: now,
                  approved_by: user.id,
                  wizard_step: 7,
                  published_at: null,
                  published_by: null,
                  upload_enabled: false,
                },
              },
              { session: transaction },
            );
            if (!claimed.modifiedCount)
              throw new HttpError(
                409,
                "Taslak başka bir işlem tarafından yayınlandı.",
              );
            await database.collection("users").insertOne(
              {
                id: ownerId,
                email: event.customer_email,
                display_name: event.customer_name,
                phone: event.customer_phone,
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
            await ensureSaleDraft(database, event, user.id, transaction);
            await ensureRequestedPhotographerSale(
              database,
              event,
              user.id,
              transaction,
            );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "wedding.approved", user, { wedding_id: id });
        return json(
          { ok: true, lifecycle_status: "draft", approval_status: "approved" },
          202,
        );
      }
      if (
        path.length === 5 &&
        path[3] === "design" &&
        path[4] === "request-revision" &&
        method === "POST"
      ) {
        requirePermission(user, "design.request_revision");
        if (!event.design || event.design_status !== "approved_for_print")
          throw new HttpError(
            409,
            "Yalnızca baskı için onaylanmış bir tasarımda revizyon istenebilir.",
          );
        const input = z
          .object({ reason: z.string().trim().min(5).max(1000) })
          .parse(await req.json());
        const knownCode: PackageCode =
          event.package_code === "plan-2" || event.package_code === "plan-3"
            ? event.package_code
            : "plan-1";
        const limit = (event.package_snapshot || packageSnapshot(knownCode))
          .revisionLimit;
        const used = event.design_revisions_used || 0;
        if (limit !== null && used >= limit)
          throw new HttpError(
            409,
            `Bu paketin ${limit} revizyon hakkı kullanıldı.`,
          );
        const now = new Date().toISOString();
        const changed = await weddings.updateOne(
          {
            id,
            ...weddingScope(user),
            design_status: "approved_for_print",
            design_revisions_used:
              event.design_revisions_used === undefined
                ? { $exists: false }
                : used,
          },
          {
            $set: {
              design_status: "revision_requested",
              design_revisions_used: used + 1,
              design_revision_reason: input.reason,
              design_revision_requested_at: now,
              design_revision_requested_by: user.id,
            },
          },
        );
        if (!changed.modifiedCount)
          throw new HttpError(
            409,
            "Revizyon durumu başka bir oturumda değiştirildi.",
          );
        await audit(req, "wedding.design_revision_requested", user, {
          wedding_id: id,
          revision_used: used + 1,
          revision_limit: limit,
          reason: input.reason,
        });
        return json({
          design_status: "revision_requested",
          design_revisions_used: used + 1,
          design_revision_limit: limit,
        });
      }
      if (
        path.length === 5 &&
        path[3] === "design" &&
        path[4] === "approve" &&
        method === "POST"
      ) {
        requirePermission(user, "design.approve_for_print");
        if (!event.design)
          throw new HttpError(
            409,
            "Onaylanacak kayıtlı bir tasarım bulunamadı.",
          );
        if (event.design_status === "approved_for_print")
          throw new HttpError(409, "Tasarım zaten baskı için onaylı.");
        const now = new Date().toISOString();
        const changed = await weddings.updateOne(
          {
            id,
            ...weddingScope(user),
            design_snapshot_id: event.design_snapshot_id,
            design_status: event.design_status || { $exists: false },
          },
          {
            $set: {
              design_status: "approved_for_print",
              design_approved_at: now,
              design_approved_by: user.id,
              design_revision_reason: null,
            },
          },
        );
        if (!changed.modifiedCount)
          throw new HttpError(409, "Tasarım başka bir oturumda değiştirildi.");
        await audit(req, "wedding.design_approved_for_print", user, {
          wedding_id: id,
          snapshot_id: event.design_snapshot_id,
          revisions_used: event.design_revisions_used || 0,
        });
        return json({
          design_status: "approved_for_print",
          design_revisions_used: event.design_revisions_used || 0,
        });
      }
      if (path.length === 4 && path[3] === "design" && method === "PUT") {
        requirePermission(user, "design.select");
        if (user.role !== "platform" && event.approval_status === "submitted")
          throw new HttpError(
            409,
            "Onay bekleyen organizasyonun tasarımı değiştirilemez.",
          );
        if (event.design_status === "approved_for_print")
          throw new HttpError(
            409,
            "Baskı için onaylanan tasarım kilitlidir. Önce revizyon talebi oluşturun.",
          );
        const body: unknown = await req.json();
        const designEnvelope = z
          .object({
            design: z.unknown(),
            add_on_selections: z
              .array(
                z.object({
                  product_id: z.string().uuid(),
                  quantity: z.number().int().min(1).max(100),
                }),
              )
              .max(20)
              .optional(),
          })
          .strict()
          .safeParse(body);
        const design = designSchema.parse(
          designEnvelope.success ? designEnvelope.data.design : body,
        );
        if (
          !weddingImageBelongsToEvent(
            design.weddingImage,
            event.cover_images || [],
          )
        )
          throw new HttpError(
            400,
            "Seçilen Wedding fotoğrafı bu organizasyona ait değil.",
          );
        const addOnSelections = designEnvelope.success
          ? designEnvelope.data.add_on_selections
          : undefined;
        let pricing = event.price_snapshot;
        if (addOnSelections) {
          requirePermission(user, "organization.update");
          const uniqueProductIds = new Set(
            addOnSelections.map((selection) => selection.product_id),
          );
          if (uniqueProductIds.size !== addOnSelections.length)
            throw new HttpError(
              400,
              "Aynı ek ürün birden fazla kez seçilemez.",
            );
          const addOnProducts = await database
            .collection<AddOnProduct>("add_on_products")
            .find({
              id: { $in: [...uniqueProductIds] },
              active: true,
            })
            .toArray();
          const knownCode: PackageCode =
            event.package_code === "plan-2" || event.package_code === "plan-3"
              ? event.package_code
              : "plan-1";
          try {
            const packageForPricing = (event.package_snapshot ||
              (await currentPackage(
                database,
                knownCode,
              ))) as PackageConfiguration;
            pricing = priceSnapshotForPackage(
              packageForPricing,
              addOnSelections,
              addOnProducts,
            );
          } catch (reason) {
            throw new HttpError(
              400,
              reason instanceof Error
                ? reason.message
                : "Ek ürün seçimi doğrulanamadı.",
            );
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
              add_on_selections:
                addOnSelections ?? event.add_on_selections ?? [],
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
            await database
              .collection("design_snapshots")
              .insertOne(snapshot, { session: transaction });
            const result = await weddings.updateOne(
              {
                id,
                ...weddingScope(user),
                ...(event.design_revision === undefined
                  ? { design_revision: { $exists: false } }
                  : { design_revision: event.design_revision }),
              },
              {
                $set: {
                  design,
                  design_revision: revision,
                  design_snapshot_id: snapshotId,
                  design_status: event.design_status || "draft",
                  design_revisions_used: event.design_revisions_used || 0,
                  ...(addOnSelections
                    ? {
                        add_on_selections: addOnSelections,
                        price_snapshot: pricing,
                      }
                    : {}),
                },
              },
              { session: transaction },
            );
            if (!result.matchedCount)
              throw new HttpError(
                409,
                "Tasarım başka bir oturumda değiştirildi. Sayfayı yenileyin.",
              );
          });
        } finally {
          await transaction.endSession();
        }
        await audit(req, "wedding.design_saved", user, {
          wedding_id: id,
          snapshot_id: snapshotId,
          revision,
          add_on_selection_count: addOnSelections?.length,
        });
        return json({
          design,
          snapshot_id: snapshotId,
          revision,
          design_status: event.design_status || "draft",
          design_revisions_used: event.design_revisions_used || 0,
          add_on_selections: addOnSelections ?? event.add_on_selections ?? [],
          price_snapshot: pricing,
        });
      }
      if (path.length === 3) {
        if (method === "GET") {
          const assignments = await database
            .collection("organization_participants")
            .find({
              wedding_id: event.id,
              participant_role: "photographer",
              active: true,
            })
            .toArray();
          const assignedPhotographers = await database
            .collection("users")
            .find(
              {
                id: { $in: assignments.map((row) => row.account_id) },
              },
              {
                projection: {
                  _id: 0,
                  id: 1,
                  display_name: 1,
                  email: 1,
                  disabled: 1,
                },
              },
            )
            .sort({ display_name: 1 })
            .toArray();
          const eventSale = await database
            .collection<SaleRecord>("sales")
            .findOne(
              { wedding_id: event.id },
              { projection: { _id: 0, status: 1 } },
            );
          return json({
            ...event,
            commercial_status:
              event.lifecycle_status !== "draft"
                ? "published"
                : eventSale?.status === "paid"
                  ? "payment_verified"
                  : eventSale
                    ? "awaiting_payment"
                    : "not_ready",
            assigned_photographers: assignedPhotographers.map(
              (photographer) => ({
                ...assignments.find(
                  (assignment) => assignment.account_id === photographer.id,
                ),
                _id: undefined,
                account_id: undefined,
                id: photographer.id,
                display_name: photographer.display_name,
                ...(user.role !== "owner" ? { email: photographer.email } : {}),
                disabled: !!photographer.disabled,
              }),
            ),
          });
        }
        if (method === "PATCH") {
          requirePermission(user, "organization.update");
          if (user.role !== "platform" && event.approval_status === "submitted")
            throw new HttpError(
              409,
              "Onay bekleyen organizasyon değiştirilemez.",
            );
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
        requireMediaPermission(
          user,
          path.length === 4 && method !== "GET" ? "manage" : "view",
        );
        if (expired(event))
          throw new HttpError(410, "Bu organizasyonun saklama süresi doldu.");
        if (path.length === 4 && method === "GET") {
          const trash = req.nextUrl.searchParams.get("trash") === "1";
          const limit = Math.min(
            60,
            Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 24),
          );
          const kind = req.nextUrl.searchParams.get("type");
          const source = req.nextUrl.searchParams.get("source");
          const sort = req.nextUrl.searchParams.get("sort") || "new";
          const search = (req.nextUrl.searchParams.get("search") || "")
            .trim()
            .slice(0, 100);
          if (kind && !["photo", "video"].includes(kind))
            throw new HttpError(400, "Geçersiz medya türü.");
          if (source && !["guest", "photographer"].includes(source))
            throw new HttpError(400, "Geçersiz medya kaynağı.");
          if (!["new", "old", "size"].includes(sort))
            throw new HttpError(400, "Geçersiz sıralama.");
          const baseFilter: Record<string, unknown> = {
            wedding_id: id,
            deleted_at: trash ? { $ne: null } : null,
            purging: { $ne: true },
            ...(trash ? { purge_at: { $gt: new Date().toISOString() } } : {}),
            ...(kind ? { type: kind } : {}),
            ...(source ? { source } : {}),
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
              : kind || source || search
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
      if (!uploadsOpenForRuntime(event))
        throw new HttpError(410, "Bu organizasyon için yükleme kapalı.");
      const professionalUpload =
        !!user && effectiveStaffRole(user) === "photographer";
      if (
        professionalUpload &&
        (!accountHasPermission(user, "media.upload_professional") ||
          !canAccess(user, event))
      )
        throw new HttpError(
          403,
          "Bu organizasyona profesyonel çekim yükleme yetkiniz yok.",
        );
      if (
        professionalUpload &&
        !(await database
          .collection<PhotographerSaleRecord>("photographer_sales")
          .findOne({
            wedding_id: event.id,
            photographer_account_id: user.id,
            status: "paid",
          }))
      )
        throw new HttpError(
          402,
          "Profesyonel yükleme için müşteri tarafından onaylanmış fotoğrafçı paketi gerekli.",
        );
      const mediaType = data.mime_type.startsWith("image/") ? "photo" : "video";
      const fileLimit =
        mediaType === "photo"
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
      const uploadDeadline = uploadWindowDeadline(event);
      const seconds = Math.max(
        1,
        Math.min(900, Math.floor((uploadDeadline - Date.now()) / 1000)),
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
      const policy = (event.package_snapshot ||
        packageSnapshot(knownCode)) as PackagePolicy;
      const configuredLimit = packageStorageLimit(policy);
      const storageLimit = Math.max(
        configuredLimit || 0,
        event.storage_limit_override_bytes || 0,
      );
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
          await tickets.insertOne(
            {
              ...data,
              source: professionalUpload ? "photographer" : "guest",
              uploader_account_id: professionalUpload ? user!.id : null,
              photographer_partner_id: professionalUpload
                ? user!.partner_id
                : null,
              token: hash(ticket),
              storage_path: key,
              reserved_bytes: data.size_bytes,
              reservation_released: false,
              storage_limit_bytes: storageLimit,
              createdAt: new Date(),
              expiresAt: new Date(
                Math.min(Date.now() + 3600000, uploadDeadline),
              ),
              completed: false,
            },
            { session: transaction },
          );
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
      if (
        event &&
        t.source === "photographer" &&
        (!t.uploader_account_id ||
          !(await database
            .collection<PhotographerSaleRecord>("photographer_sales")
            .findOne({
              wedding_id: event.id,
              photographer_account_id: t.uploader_account_id,
              status: "paid",
            })))
      ) {
        await deleteObject(t.storage_path);
        throw new HttpError(
          402,
          "Fotoğrafçı paketi aktif olmadığı için yükleme tamamlanamadı.",
        );
      }
      if (!event || !uploadsOpenForRuntime(event))
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
            const released = await database
              .collection("upload_tickets")
              .updateOne(
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
                source: t.source === "photographer" ? "photographer" : "guest",
                uploader_account_id: t.uploader_account_id || null,
                photographer_partner_id: t.photographer_partner_id || null,
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
                photo_count:
                  inserted.upsertedCount && mediaType === "photo" ? 1 : 0,
                video_count:
                  inserted.upsertedCount && mediaType === "video" ? 1 : 0,
                media_bytes: inserted.upsertedCount ? t.size_bytes : 0,
              },
            },
            { session: transaction },
          );
          if (
            inserted.upsertedCount &&
            t.source === "photographer" &&
            t.uploader_account_id
          )
            await database.collection("organization_participants").updateOne(
              {
                wedding_id: event.id,
                account_id: t.uploader_account_id,
                active: true,
                delivery_status: { $ne: "completed" },
              },
              {
                $set: { delivery_status: "uploading" },
                $inc: { delivered_file_count: 1 },
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
