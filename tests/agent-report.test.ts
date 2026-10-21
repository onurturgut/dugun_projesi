import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { agentReportInput, agentReportReviewInput } from "../src/lib/server/validation";

const validReport = {
  run_id: randomUUID(),
  agent_name: "code-reviewer",
  task_title: "Aşama 12 raporlama servisi incelemesi",
  status: "needs-review",
  scope: ["src/lib/server/handler.ts"],
  findings: [{ severity: "warning", title: "İnsan onayı gerekli", evidence: "Rapor beklemede." }],
  verification: [{ check: "npm test", result: "passed", evidence: "Tüm testler geçti." }],
  risks: ["Yönetim ekranı Aşama 13 kapsamındadır."],
  recommendation: "revise",
  handoff: { role: "human-owner", action: "Raporu inceleyip karar verin." },
};

test("agent report contract accepts a complete structured report", () => {
  assert.equal(agentReportInput.parse(validReport).agent_name, "code-reviewer");
});

test("agent report contract rejects unknown agents and unstructured evidence", () => {
  assert.equal(agentReportInput.safeParse({ ...validReport, agent_name: "unknown-agent" }).success, false);
  assert.equal(agentReportInput.safeParse({ ...validReport, scope: [] }).success, false);
  assert.equal(agentReportInput.safeParse({ ...validReport, findings: [{ severity: "low", title: "x", evidence: "" }] }).success, false);
});

test("agent report review requires an explicit decision and note", () => {
  assert.equal(agentReportReviewInput.safeParse({ decision: "approved", note: "İnsan incelemesi tamamlandı." }).success, true);
  assert.equal(agentReportReviewInput.safeParse({ decision: "pending", note: "Bekliyor" }).success, false);
});
