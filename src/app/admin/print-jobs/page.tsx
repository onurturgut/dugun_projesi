"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleCheck,
  Clock3,
  Download,
  PackageCheck,
  Printer,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { api, type Account } from "@/lib/api";
import type { PrintJob, PrintJobStatus } from "@/lib/models";
import {
  allowedPrintJobTransitions,
  PRINT_JOB_STATUS_LABELS,
} from "@/lib/print-jobs";

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));

export default function PrintJobsPage() {
  const queryClient = useQueryClient();
  const [jobNotes, setJobNotes] = useState<Record<string, string>>({});
  const [carriers, setCarriers] = useState<Record<string, string>>({});
  const [trackingCodes, setTrackingCodes] = useState<Record<string, string>>(
    {},
  );
  const [preflightChecks, setPreflightChecks] = useState<
    Record<string, string[]>
  >({});
  const [recipients, setRecipients] = useState<Record<string, string>>({});
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const jobs = useQuery({
    queryKey: ["print-jobs"],
    queryFn: () => api<PrintJob[]>("/admin/print-jobs"),
  });
  const updateStatus = useMutation({
    mutationFn: ({
      job,
      status,
      note,
      carrier,
      trackingCode,
    }: {
      job: PrintJob;
      status: PrintJobStatus;
      note: string;
      carrier?: string;
      trackingCode?: string;
    }) =>
      api<PrintJob>(`/admin/print-jobs/${job.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          version: job.status_version,
          note,
          carrier: carrier || undefined,
          tracking_code: trackingCode || undefined,
        }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] }),
    onError: (reason) =>
      toast.error(
        reason instanceof Error ? reason.message : "Durum güncellenemedi.",
      ),
  });
  const confirmPrinterPreflight = useMutation({
    mutationFn: ({ job, note }: { job: PrintJob; note: string }) =>
      api<PrintJob>(`/admin/print-jobs/${job.id}/printer-preflight`, {
        method: "POST",
        body: JSON.stringify({
          color_profile_confirmed: true,
          fonts_confirmed: true,
          resolution_confirmed: true,
          bleed_and_trim_confirmed: true,
          note,
          version: job.status_version,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.success("Matbaa kontrolü kaydedildi.");
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Matbaa kontrolü kaydedilemedi.",
      ),
  });
  const uploadDeliveryProof = useMutation({
    mutationFn: async ({ job, file }: { job: PrintJob; file: File }) => {
      const form = new FormData();
      form.set("file", file);
      form.set("recipient_name", recipients[job.id] || "");
      const response = await fetch(
        `/api/admin/print-jobs/${job.id}/delivery-proof`,
        {
          method: "POST",
          body: form,
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Teslim kanıtı yüklenemedi.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.success("Teslim alan kişi ve kanıt dosyası kaydedildi.");
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error ? reason.message : "Teslim kanıtı yüklenemedi.",
      ),
  });

  const actor = me.data?.role === "platform" ? "platform" : "printer";
  const printJobs = jobs.data || [];
  const operationSummary = [
    {
      label: "Aktif işler",
      value: printJobs.filter(
        (job) => !["delivered_to_partner", "cancelled"].includes(job.status),
      ).length,
      icon: Clock3,
    },
    {
      label: "Baskıda",
      value: printJobs.filter((job) =>
        ["downloaded", "printing"].includes(job.status),
      ).length,
      icon: Printer,
    },
    {
      label: "Teslim süreci",
      value: printJobs.filter((job) =>
        ["ready", "received_by_shineqr", "quality_checked"].includes(
          job.status,
        ),
      ).length,
      icon: Truck,
    },
    {
      label: "Tamamlanan",
      value: printJobs.filter((job) => job.status === "delivered_to_partner")
        .length,
      icon: CircleCheck,
    },
  ];
  return (
    <AdminShell>
      <div className="admin-heading print-operations-heading">
        <div>
          <p className="admin-kicker">BASKI VE TESLİMAT</p>
          <h1>Baskı operasyonu</h1>
          <p className="admin-subtitle">
            Onaylı tasarımı baskıcıya atayın ve teslimata kadar izleyin.
          </p>
        </div>
      </div>
      <section
        className="print-operation-summary"
        aria-label="Baskı operasyonu özeti"
      >
        {operationSummary.map(({ label, value, icon: Icon }) => (
          <article key={label}>
            <span>
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          </article>
        ))}
      </section>
      {jobs.error ? <Notice>{jobs.error.message}</Notice> : null}
      <section className="admin-panel detail-list print-jobs-panel">
        <header>
          <PackageCheck />
          <div>
            <span>İŞ TAKİBİ</span>
            <h2>
              {actor === "printer" ? "Bana atanan işler" : "Tüm baskı işleri"}
            </h2>
          </div>
          <strong className="print-job-count">{printJobs.length} iş</strong>
        </header>
        {jobs.data?.map((job) => {
          const next = allowedPrintJobTransitions(job.status, actor);
          const checked = preflightChecks[job.id] || [];
          const manualChecks = [
            ["color", "CMYK / matbaa ICC profili uygun"],
            ["fonts", "Fontlar gömülü veya kontura çevrilmiş"],
            ["resolution", "Görsellerin efektif DPI değeri uygun"],
            ["bleed", "Taşma, kesim ve güvenli alan kontrol edildi"],
          ] as const;
          return (
            <article className="detail-static-row print-job-card" key={job.id}>
              <div className="print-job-main">
                <div className="print-job-title-row">
                  <div>
                    <strong>{job.wedding_title}</strong>
                    <small>
                      {job.product_description} · {job.quantity} adet
                    </small>
                  </div>
                  <span className={`print-job-status status-${job.status}`}>
                    {PRINT_JOB_STATUS_LABELS[job.status]}
                  </span>
                </div>
                <div className="print-job-meta">
                  <span>{job.printer_name}</span>
                  <span>Tasarım v{job.design_revision}</span>
                  {job.due_date ? <span>Hedef {job.due_date}</span> : null}
                </div>
                {job.production_notes ? (
                  <p className="print-job-note">{job.production_notes}</p>
                ) : null}
                <details className="print-job-timeline">
                  <summary>Operasyon zaman çizelgesi</summary>
                  <ol>
                    {job.status_history
                      .slice()
                      .reverse()
                      .map((entry, index) => {
                        const record = job.fulfillment_records?.find(
                          (item) =>
                            item.status === entry.status &&
                            item.at === entry.at,
                        );
                        return (
                          <li key={`${entry.at}-${entry.status}-${index}`}>
                            <strong>
                              {PRINT_JOB_STATUS_LABELS[entry.status]}
                            </strong>
                            <time>{dateTime(entry.at)}</time>
                            {record?.note ? <span>{record.note}</span> : null}
                            {record?.carrier || record?.tracking_code ? (
                              <span>
                                {[record.carrier, record.tracking_code]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                  </ol>
                </details>
              </div>
              <div className="account-actions print-job-actions">
                {job.production_pdf ? (
                  <a
                    className="admin-button"
                    href={`/api/admin/print-jobs/${job.id}/production-pdf`}
                  >
                    <Download size={14} /> Baskı PDF'ini indir
                  </a>
                ) : (
                  <span>PDF bekleniyor</span>
                )}
                {actor === "printer" &&
                job.status === "downloaded" &&
                !job.printer_preflight ? (
                  <div className="admin-preflight-confirmation">
                    {manualChecks.map(([id, label]) => (
                      <label key={id}>
                        <input
                          type="checkbox"
                          checked={checked.includes(id)}
                          onChange={(event) =>
                            setPreflightChecks((current) => ({
                              ...current,
                              [job.id]: event.target.checked
                                ? [...checked, id]
                                : checked.filter((item) => item !== id),
                            }))
                          }
                        />{" "}
                        {label}
                      </label>
                    ))}
                    <button
                      className="admin-button primary"
                      disabled={
                        checked.length !== manualChecks.length ||
                        confirmPrinterPreflight.isPending
                      }
                      onClick={() =>
                        confirmPrinterPreflight.mutate({
                          job,
                          note: jobNotes[job.id] || "",
                        })
                      }
                    >
                      Matbaa kontrolünü onayla
                    </button>
                  </div>
                ) : null}
                {next.some((status) =>
                  [
                    "ready",
                    "received_by_shineqr",
                    "quality_checked",
                    "delivered_to_partner",
                  ].includes(status),
                ) ? (
                  <input
                    aria-label="Teslimat veya kalite kontrol notu"
                    placeholder="Teslimat / kalite kontrol notu"
                    maxLength={1000}
                    value={jobNotes[job.id] || ""}
                    onChange={(event) =>
                      setJobNotes((current) => ({
                        ...current,
                        [job.id]: event.target.value,
                      }))
                    }
                  />
                ) : null}
                {next.includes("delivered_to_partner") ? (
                  <>
                    <input
                      aria-label="Taşıyıcı veya teslim yöntemi"
                      placeholder="Taşıyıcı / elden teslim"
                      maxLength={120}
                      value={carriers[job.id] || ""}
                      onChange={(event) =>
                        setCarriers((current) => ({
                          ...current,
                          [job.id]: event.target.value,
                        }))
                      }
                    />
                    <input
                      aria-label="Takip veya teslim kodu"
                      placeholder="Takip / teslim kodu"
                      maxLength={120}
                      value={trackingCodes[job.id] || ""}
                      onChange={(event) =>
                        setTrackingCodes((current) => ({
                          ...current,
                          [job.id]: event.target.value,
                        }))
                      }
                    />
                  </>
                ) : null}
                {actor === "platform" &&
                job.status === "delivered_to_partner" ? (
                  <>
                    <input
                      aria-label="Teslim alan kişi"
                      placeholder="Teslim alan kişinin adı"
                      maxLength={120}
                      value={recipients[job.id] || ""}
                      onChange={(event) =>
                        setRecipients((current) => ({
                          ...current,
                          [job.id]: event.target.value,
                        }))
                      }
                    />
                    <label className="admin-button">
                      Teslim kanıtı yükle
                      <input
                        className="sr-only"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                        disabled={
                          uploadDeliveryProof.isPending ||
                          (recipients[job.id] || "").trim().length < 2
                        }
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadDeliveryProof.mutate({ job, file });
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {job.delivery_proof ? (
                      <a
                        className="admin-button"
                        href={`/api/admin/print-jobs/${job.id}/delivery-proof`}
                      >
                        <Download size={14} /> Teslim kanıtı
                      </a>
                    ) : null}
                  </>
                ) : null}
                {next.map((status) => (
                  <button
                    className="admin-button primary"
                    key={status}
                    onClick={() =>
                      updateStatus.mutate({
                        job,
                        status,
                        note: jobNotes[job.id] || "",
                        carrier: carriers[job.id],
                        trackingCode: trackingCodes[job.id],
                      })
                    }
                    disabled={updateStatus.isPending}
                  >
                    {PRINT_JOB_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
        {jobs.data?.length === 0 ? (
          <div className="admin-empty">
            <p>Henüz baskı işi yok.</p>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
