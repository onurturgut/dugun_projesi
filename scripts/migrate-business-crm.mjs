import "./configure-dns.mjs";
import { MongoClient } from "mongodb";
import {
  BUSINESS_CRM_INDEXES,
  BUSINESS_CRM_MIGRATION,
  classifyLegacyOwnerCandidates,
  duplicateLeadGroups,
} from "./business-crm-migration-lib.mjs";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI gerekli.");

const apply = process.argv.includes("--apply");
const rollback = process.argv.includes("--rollback");
if (apply && rollback)
  throw new Error("--apply ve --rollback aynı anda kullanılamaz.");

const mode = rollback ? "rollback" : apply ? "apply" : "dry-run";
const databaseName = process.env.MONGODB_DB || "wedding_memories";
const backupCollectionName = "business_crm_migration_backups";
const client = new MongoClient(uri);

async function duplicateReport(database) {
  const leadRows = await database
    .collection("business_leads")
    .aggregate([
      {
        $group: {
          _id: {
            partner_id: "$partner_id",
            idempotency_key: "$idempotency_key",
          },
          count: { $sum: 1 },
          ids: { $push: "$id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ])
    .toArray();
  const idRows = await database
    .collection("business_leads")
    .aggregate([
      { $group: { _id: "$id", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 },
    ])
    .toArray();
  const slugRows = await database
    .collection("partners")
    .aggregate([
      { $match: { "storefront.slug": { $type: "string" } } },
      {
        $group: {
          _id: "$storefront.slug",
          count: { $sum: 1 },
          partner_ids: { $push: "$id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 },
    ])
    .toArray();
  const quoteIdRows = await database
    .collection("crm_quotes")
    .aggregate([
      { $group: { _id: "$id", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 },
    ])
    .toArray();
  const quoteVersionRows = await database
    .collection("crm_quotes")
    .aggregate([
      {
        $group: {
          _id: {
            partner_id: "$partner_id",
            lead_id: "$lead_id",
            version: "$version",
          },
          count: { $sum: 1 },
          ids: { $push: "$id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 },
    ])
    .toArray();
  const customerIdentityRows = await database
    .collection("customer_accounts")
    .aggregate([
      {
        $group: {
          _id: { partner_id: "$partner_id", identity_key: "$identity_key" },
          count: { $sum: 1 },
          ids: { $push: "$id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 },
    ])
    .toArray();
  const conversionRows = await database
    .collection("crm_quote_conversions")
    .aggregate([
      {
        $group: { _id: "$quote_id", count: { $sum: 1 }, ids: { $push: "$id" } },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 100 },
    ])
    .toArray();
  return {
    lead_idempotency: duplicateLeadGroups(leadRows),
    lead_ids: idRows.map((row) => ({ id: row._id, count: row.count })),
    storefront_slugs: slugRows.map((row) => ({
      slug: row._id,
      count: row.count,
      partner_ids: row.partner_ids,
    })),
    quote_ids: quoteIdRows.map((row) => ({
      id: row._id,
      count: row.count,
    })),
    quote_versions: quoteVersionRows.map((row) => ({
      partner_id: row._id.partner_id,
      lead_id: row._id.lead_id,
      version: row._id.version,
      count: row.count,
      ids: row.ids,
    })),
    customer_identities: customerIdentityRows.map((row) => ({
      partner_id: row._id.partner_id,
      identity_key: row._id.identity_key,
      count: row.count,
      ids: row.ids,
    })),
    quote_conversions: conversionRows.map((row) => ({
      quote_id: row._id,
      count: row.count,
      ids: row.ids,
    })),
  };
}

async function currentIndexState(database) {
  const result = [];
  for (const definition of BUSINESS_CRM_INDEXES) {
    const indexes = await database
      .collection(definition.collection)
      .indexes()
      .catch(() => []);
    result.push({
      collection: definition.collection,
      name: definition.options.name,
      exists: indexes.some((item) => item.name === definition.options.name),
    });
  }
  return result;
}

try {
  await client.connect();
  const database = client.db(databaseName);
  const users = await database
    .collection("users")
    .find(
      { role: "partner" },
      {
        projection: {
          _id: 0,
          id: 1,
          partner_id: 1,
          role: 1,
          staff_role: 1,
          disabled: 1,
        },
      },
    )
    .toArray();
  const candidates = classifyLegacyOwnerCandidates(users);
  const duplicates = await duplicateReport(database);
  const indexState = await currentIndexState(database);

  if (rollback) {
    const backups = await database
      .collection(backupCollectionName)
      .find({ migration: BUSINESS_CRM_MIGRATION, kind: "staff_role" })
      .toArray();
    let restoredRoles = 0;
    for (const backup of backups) {
      const result = await database.collection("users").updateOne(
        {
          id: backup.user_id,
          partner_id: backup.partner_id,
          staff_role: "partner_owner",
        },
        {
          $set: { staff_role: backup.previous_staff_role },
          $unset: { business_owner_role_migration: "" },
        },
      );
      restoredRoles += result.modifiedCount;
    }
    const droppedIndexes = [];
    for (const definition of BUSINESS_CRM_INDEXES) {
      const existedBefore = await database
        .collection(backupCollectionName)
        .findOne({
          migration: BUSINESS_CRM_MIGRATION,
          kind: "index",
          collection: definition.collection,
          index_name: definition.options.name,
          existed_before: true,
        });
      if (existedBefore) continue;
      const dropped = await database
        .collection(definition.collection)
        .dropIndex(definition.options.name)
        .then(() => true)
        .catch((error) => {
          if (error?.codeName === "IndexNotFound") return false;
          throw error;
        });
      if (dropped)
        droppedIndexes.push(
          `${definition.collection}.${definition.options.name}`,
        );
    }
    await database
      .collection(backupCollectionName)
      .deleteMany({ migration: BUSINESS_CRM_MIGRATION });
    console.log(
      JSON.stringify(
        {
          migration: BUSINESS_CRM_MIGRATION,
          mode,
          restored_roles: restoredRoles,
          skipped_role_restores: backups.length - restoredRoles,
          dropped_indexes: droppedIndexes,
        },
        null,
        2,
      ),
    );
  } else {
    const report = {
      migration: BUSINESS_CRM_MIGRATION,
      database: databaseName,
      mode,
      duplicate_conflicts: duplicates,
      role_candidates: candidates,
      indexes: indexState,
      blocked:
        duplicates.lead_idempotency.length > 0 ||
        duplicates.lead_ids.length > 0 ||
        duplicates.storefront_slugs.length > 0 ||
        duplicates.quote_ids.length > 0 ||
        duplicates.quote_versions.length > 0 ||
        duplicates.customer_identities.length > 0 ||
        duplicates.quote_conversions.length > 0,
    };
    console.log(JSON.stringify(report, null, 2));
    if (apply) {
      if (report.blocked)
        throw new Error(
          "Unique indekslerden önce çözülmesi gereken mükerrer kayıtlar var. Dry-run raporunu inceleyin.",
        );
      const now = new Date().toISOString();
      for (const index of indexState) {
        await database.collection(backupCollectionName).updateOne(
          {
            migration: BUSINESS_CRM_MIGRATION,
            kind: "index",
            collection: index.collection,
            index_name: index.name,
          },
          {
            $setOnInsert: {
              migration: BUSINESS_CRM_MIGRATION,
              kind: "index",
              collection: index.collection,
              index_name: index.name,
              existed_before: index.exists,
              created_at: now,
            },
          },
          { upsert: true },
        );
      }
      for (const definition of BUSINESS_CRM_INDEXES)
        await database
          .collection(definition.collection)
          .createIndex(definition.keys, definition.options);

      let migratedRoles = 0;
      for (const candidate of candidates.eligible) {
        const backupResult = await database
          .collection(backupCollectionName)
          .updateOne(
            {
              migration: BUSINESS_CRM_MIGRATION,
              kind: "staff_role",
              user_id: candidate.user_id,
            },
            {
              $setOnInsert: {
                migration: BUSINESS_CRM_MIGRATION,
                kind: "staff_role",
                ...candidate,
                created_at: now,
              },
            },
            { upsert: true },
          );
        if (!backupResult.upsertedCount) continue;
        const updated = await database.collection("users").updateOne(
          {
            id: candidate.user_id,
            partner_id: candidate.partner_id,
            role: "partner",
            disabled: { $ne: true },
            staff_role: candidate.previous_staff_role,
          },
          {
            $set: {
              staff_role: "partner_owner",
              business_owner_role_migration: {
                id: BUSINESS_CRM_MIGRATION,
                migrated_at: now,
                previous_staff_role: candidate.previous_staff_role,
              },
            },
          },
        );
        if (!updated.modifiedCount) {
          await database.collection(backupCollectionName).deleteOne({
            migration: BUSINESS_CRM_MIGRATION,
            kind: "staff_role",
            user_id: candidate.user_id,
          });
          continue;
        }
        migratedRoles += 1;
      }
      console.log(
        JSON.stringify(
          {
            migration: BUSINESS_CRM_MIGRATION,
            mode: "apply-result",
            created_or_verified_indexes: BUSINESS_CRM_INDEXES.length,
            migrated_roles: migratedRoles,
            ambiguous_tenants_skipped: candidates.ambiguous.length,
          },
          null,
          2,
        ),
      );
    }
  }
} finally {
  await client.close();
}
