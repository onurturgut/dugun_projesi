import "server-only";
import type { NextRequest } from "next/server";
import type { Account } from "@/lib/models";
import { db } from "./db";

export async function audit(
  req: NextRequest,
  action: string,
  actor: Pick<Account, "id" | "role" | "partner_id"> | null,
  target?: Record<string, unknown>,
  outcome: "success" | "failure" = "success",
) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  await (await db()).collection("audit_logs").insertOne({
    at: new Date(),
    action,
    outcome,
    actor_id: actor?.id || null,
    actor_role: actor?.role || null,
    partner_id: actor?.partner_id || null,
    target: target || {},
    ip: forwarded || req.headers.get("x-real-ip") || null,
    user_agent: req.headers.get("user-agent")?.slice(0, 500) || null,
  });
}
