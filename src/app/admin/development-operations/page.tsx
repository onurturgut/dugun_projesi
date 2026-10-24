"use client";

import { FormEvent, useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, CheckCircle2, ChevronLeft, ChevronRight, CircleDot, RefreshCw, Search, ShieldAlert, TestTube2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { SelectField } from "@/components/admin/SelectField";
import { api } from "@/lib/api";
import type { AgentName, AgentReport, AgentReportReviewStatus } from "@/lib/models";

const agentLabels: Record<AgentName, string> = {
  "accounting-analyst": "Muhasebe analisti", "architecture-guardian": "Mimari koruyucu",
  "business-analyst": "İş analisti", "code-reviewer": "Kod inceleyici",
  "frontend-developer": "Frontend geliştirici", "marketing-strategist": "Pazarlama stratejisti",
  orchestrator: "Orkestratör", "qa-engineer": "QA mühendisi",
  "security-reviewer": "Güvenlik inceleyici", "senior-backend": "Senior backend",
  "system-operator": "Sistem operatörü", "ui-ux-designer": "UI/UX tasarımcısı",
};
const reviewLabels: Record<AgentReportReviewStatus, string> = { pending: "İnceleme bekliyor", approved: "Onaylandı", changes_requested: "Değişiklik istendi", rejected: "Reddedildi" };
type Response = { items: AgentReport[]; total: number; page: number; pages: number; summary: { total: number; pending: number; blocked: number; critical: number; failed_checks: number } };

export default function DevelopmentOperationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("all");
  const [status, setStatus] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [decision, setDecision] = useState<Exclude<AgentReportReviewStatus, "pending">>("approved");
  const [note, setNote] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const reports = useQuery({
    queryKey: ["agent-reports", page, deferredSearch, agent, status, reviewStatus],
    queryFn: () => { const params = new URLSearchParams({ page: String(page), limit: "25" }); if (deferredSearch) params.set("search", deferredSearch); if (agent !== "all") params.set("agent_name", agent); if (status !== "all") params.set("status", status); if (reviewStatus !== "all") params.set("review_status", reviewStatus); return api<Response>(`/admin/agent-reports?${params}`); },
  });
  const review = useMutation({
    mutationFn: ({ id, decision: nextDecision, note: nextNote }: { id: string; decision: Exclude<AgentReportReviewStatus, "pending">; note: string }) => api<AgentReport>(`/admin/agent-reports/${id}/review`, { method: "POST", body: JSON.stringify({ decision: nextDecision, note: nextNote }) }),
    onSuccess: () => { setNote(""); queryClient.invalidateQueries({ queryKey: ["agent-reports"] }); },
  });
  function submitReview(event: FormEvent, id: string) { event.preventDefault(); if (note.trim().length < 3) return; review.mutate({ id, decision, note: note.trim() }); }
  const changeFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  return <AdminShell>
    <div className="admin-heading devops-heading"><div><p className="admin-kicker">GELİŞTİRME OPERASYONLARI</p><h1>Agent raporları</h1><p className="admin-subtitle">Uzman agent bulgularını, doğrulama kanıtlarını ve insan onaylarını tek merkezden yönetin.</p></div><button className="admin-button icon-only" aria-label="Agent raporlarını yenile" title="Yenile" onClick={() => reports.refetch()} disabled={reports.isFetching}><RefreshCw size={17} className={reports.isFetching ? "animate-spin" : ""} /></button></div>
    <section className="partner-stat-grid devops-kpis" aria-label="Agent raporu özeti">
      <article><Bot size={18} /><span>Toplam rapor</span><strong>{reports.data?.summary.total ?? "—"}</strong></article>
      <article><CircleDot size={18} /><span>İnceleme bekleyen</span><strong>{reports.data?.summary.pending ?? "—"}</strong></article>
      <article><AlertTriangle size={18} /><span>Engellenen çalışma</span><strong>{reports.data?.summary.blocked ?? "—"}</strong></article>
      <article><ShieldAlert size={18} /><span>Kritik bulgulu</span><strong>{reports.data?.summary.critical ?? "—"}</strong></article>
      <article><TestTube2 size={18} /><span>Başarısız kontrol</span><strong>{reports.data?.summary.failed_checks ?? "—"}</strong></article>
    </section>
    <section className="admin-filter-bar devops-filters" aria-label="Agent raporu filtreleri">
      <label className="admin-search"><Search size={17} /><span className="sr-only">Raporlarda ara</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Görev, çalışma veya değişiklik ara" /></label>
      <SelectField value={agent} onValueChange={(value) => changeFilter(setAgent, value)} aria-label="Agent"><option value="all">Tüm agentlar</option>{Object.entries(agentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
      <SelectField value={status} onValueChange={(value) => changeFilter(setStatus, value)} aria-label="Rapor durumu"><option value="all">Tüm durumlar</option><option value="complete">Tamamlandı</option><option value="needs-review">İnceleme gerekli</option><option value="blocked">Engellendi</option></SelectField>
      <SelectField value={reviewStatus} onValueChange={(value) => changeFilter(setReviewStatus, value)} aria-label="İnceleme kararı"><option value="all">Tüm kararlar</option><option value="pending">Bekleyen</option><option value="approved">Onaylanan</option><option value="changes_requested">Değişiklik istenen</option><option value="rejected">Reddedilen</option></SelectField>
    </section>
    {reports.error ? <Notice>{reports.error.message}</Notice> : null}
    <section className="devops-report-list" aria-busy={reports.isLoading}>
      {reports.isLoading ? <div className="admin-empty">Agent raporları yükleniyor…</div> : null}
      {!reports.isLoading && !reports.data?.items.length ? <div className="admin-empty"><Bot size={28} /><h2>Rapor bulunamadı</h2><p>Filtreleri temizleyin veya agent servisinin ilk raporu göndermesini bekleyin.</p></div> : null}
      {reports.data?.items.map((report) => { const open = expanded === report.id; const criticalCount = report.findings.filter((item) => item.severity === "critical").length; return <article className="devops-report" key={report.id} data-review={report.review_status}>
        <button className="devops-report-summary" type="button" aria-expanded={open} onClick={() => { setExpanded(open ? null : report.id); setNote(""); }}><span className="devops-agent-icon"><Bot size={18} /></span><span className="devops-report-title"><small>{agentLabels[report.agent_name]}</small><strong>{report.task_title}</strong><em>{new Date(report.created_at).toLocaleString("tr-TR")} · {report.change_ref || report.run_id.slice(0, 8)}</em></span><span className={`devops-status ${report.status}`}>{report.status === "complete" ? "Tamamlandı" : report.status === "blocked" ? "Engellendi" : "İnceleme gerekli"}</span>{criticalCount ? <span className="devops-critical"><AlertTriangle size={13} /> {criticalCount} kritik</span> : null}<span className={`devops-review ${report.review_status}`}>{reviewLabels[report.review_status]}</span></button>
        {open ? <div className="devops-report-detail">
          <div className="devops-detail-grid"><section><h3>Kapsam</h3><ul>{report.scope.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Riskler</h3>{report.risks.length ? <ul>{report.risks.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Bildirilmiş risk yok.</p>}</section></div>
          <section><h3>Bulgular</h3><div className="devops-findings">{report.findings.length ? report.findings.map((finding, index) => <article key={`${finding.title}-${index}`} data-severity={finding.severity}><strong>{finding.title}</strong><span>{finding.severity === "critical" ? "Kritik" : finding.severity === "warning" ? "Uyarı" : "Bilgi"}</span><p>{finding.evidence}</p></article>) : <p>Bulgu bildirilmedi.</p>}</div></section>
          <section><h3>Doğrulama</h3><div className="devops-checks">{report.verification.map((check, index) => <div key={`${check.check}-${index}`} data-result={check.result}>{check.result === "passed" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}<span><strong>{check.check}</strong><small>{check.evidence || "Kanıt belirtilmedi."}</small></span></div>)}</div></section>
          <div className="devops-handoff"><div><small>ÖNERİ</small><strong>{report.recommendation === "approve" ? "Onayla" : report.recommendation === "revise" ? "Düzelt" : "Reddet"}</strong></div><div><small>DEVİR</small><strong>{report.handoff.role === "human-owner" ? "İnsan onayı" : agentLabels[report.handoff.role]}</strong><p>{report.handoff.action}</p></div></div>
          {report.reviews.length ? <section><h3>İnceleme geçmişi</h3><ol className="devops-history">{report.reviews.map((item) => <li key={item.id}><strong>{reviewLabels[item.decision]}</strong><p>{item.note}</p><small>{new Date(item.reviewed_at).toLocaleString("tr-TR")}</small></li>)}</ol></section> : null}
          <form className="devops-review-form" onSubmit={(event) => submitReview(event, report.id)}><SelectField value={decision} onValueChange={(value) => setDecision(value as Exclude<AgentReportReviewStatus, "pending">)} aria-label="İnceleme kararı"><option value="approved">Onayla</option><option value="changes_requested">Değişiklik iste</option><option value="rejected">Reddet</option></SelectField><label><span className="sr-only">Karar notu</span><textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={3} maxLength={2000} required placeholder="Kararın gerekçesini yazın…" /></label><button className="admin-button primary" disabled={review.isPending}>{review.isPending ? "Kaydediliyor…" : "Kararı kaydet"}</button></form>{review.error ? <Notice>{review.error.message}</Notice> : null}
        </div> : null}
      </article>; })}
    </section>
    {reports.data && reports.data.pages > 1 ? <nav className="admin-pagination" aria-label="Agent raporu sayfaları"><button className="admin-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> Önceki</button><span><strong>{page}</strong> / {reports.data.pages}</span><button className="admin-button" disabled={page >= reports.data.pages} onClick={() => setPage((value) => value + 1)}>Sonraki <ChevronRight size={16} /></button></nav> : null}
  </AdminShell>;
}
