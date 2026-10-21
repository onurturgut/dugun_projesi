import "./configure-dns.mjs";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { MongoClient } from "mongodb";

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error("MONGODB_URI gerekli.");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true")
  throw new Error("Üretim ortamında demo hesabı oluşturma kapalıdır.");

const password = process.env.DEMO_PASSWORD || `Demo!${randomBytes(9).toString("base64url")}9a`;
if (password.length < 12) throw new Error("DEMO_PASSWORD en az 12 karakter olmalı.");
const client = new MongoClient(MONGODB_URI);
const passwordFields = () => {
  const salt = randomBytes(16).toString("hex");
  return { salt, passwordHash: scryptSync(password, salt, 64).toString("hex") };
};

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "wedding_memories");
  const partnerId = "demo-partner";
  const now = new Date().toISOString();
  await db.collection("partners").updateOne(
    { id: partnerId },
    { $set: { name: "Demo Partner", active: true, logo_url: "", updated_at: now }, $setOnInsert: { id: partnerId, created_at: now } },
    { upsert: true },
  );
  const accounts = [
    { email: "demo.partner@shineqr.local", display_name: "Demo Partner Yetkilisi", role: "partner", staff_role: "partner_owner", partner_id: partnerId },
    { email: "demo.sales@shineqr.local", display_name: "Demo Satış Yetkilisi", role: "partner", staff_role: "partner_sales", partner_id: partnerId },
  ];
  for (const account of accounts) {
    await db.collection("users").updateOne(
      { email: account.email },
      { $set: { ...account, ...passwordFields(), disabled: false, must_change_password: true }, $setOnInsert: { id: randomUUID() } },
      { upsert: true },
    );
  }
  console.log("Demo hesapları hazır:");
  for (const account of accounts) console.log(`- ${account.email}`);
  console.log(`Geçici demo parolası: ${password}`);
} finally {
  await client.close();
}
