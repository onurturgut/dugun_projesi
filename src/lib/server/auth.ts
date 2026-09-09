import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "./db";
import type { Account } from "@/lib/models";
export const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function session() {
  const token = (await cookies()).get("wm_session")?.value;
  if (!token) return null;
  const database = await db();
  const current = await database
    .collection("sessions")
    .findOne({ token: hash(token), expiresAt: { $gt: new Date() } });
  if (!current) return null;
  const user = await database
    .collection<Account>("users")
    .findOne(
      { id: current.userId, disabled: { $ne: true } },
      {
        projection: {
          _id: 0,
          id: 1,
          email: 1,
          role: 1,
          partner_id: 1,
          display_name: 1,
          must_change_password: 1,
          disabled: 1,
        },
      },
    );
  if (!user || !["platform", "partner", "owner"].includes(user.role))
    return null;
  if (
    user.role !== "platform" &&
    !(await database
      .collection("partners")
      .findOne({ id: user.partner_id, active: true }))
  )
    return null;
  return user;
}
