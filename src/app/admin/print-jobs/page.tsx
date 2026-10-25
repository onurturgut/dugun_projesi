"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, Notice, TextField } from "@/components/admin/Fields";
import { api, type Account, type Wedding } from "@/lib/api";
import type { PrintJob, PrintJobStatus } from "@/lib/models";
import {
  allowedPrintJobTransitions,
  PRINT_JOB_STATUS_LABELS,
} from "@/lib/print-jobs";

type PrinterAccount = {
  id: string;
  display_name: string;
  partner_id: string;
};
type WeddingsResponse = { items: Wedding[] };
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));

export default function PrintJobsPage() {
  const queryClient = useQueryClient();
  const [weddingId, setWeddingId] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
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
  const weddings = useQuery({
    queryKey: ["weddings", "print-jobs"],
    queryFn: () => api<WeddingsResponse>("/admin/weddings?limit=250"),
    enabled: me.data?.role === "platform",
  });
  const printers = useQuery({
    queryKey: ["print-vendors"],
    queryFn: () => api<PrinterAccount[]>("/admin/print-vendors"),
    enabled: me.data?.role === "platform",
  });
  const createJob = useMutation({
    mutationFn: (payload: object) =>
      api<PrintJob>("/admin/print-jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setDescription("");
      setQuantity("1");
      setDueDate("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.success("Baskı işi oluşturuldu ve baskıcıya atandı.");
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error ? reason.message : "Baskı işi oluşturulamadı.",
      ),
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
  const uploadPdf = useMutation({
    mutationFn: async ({ job, file }: { job: PrintJob; file: File }) => {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(
        `/api/admin/print-jobs/${job.id}/production-pdf`,
        {
          method: "POST",
          body: form,
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "PDF yüklenemedi.");
      return data as PrintJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.success("Baskıya hazır PDF güvenli olarak yüklendi.");
    },
    onError: (reason) => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.error(
        reason instanceof Error ? reason.message : "PDF yüklenemedi.",
      );
    },
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

  function submit(event: FormEvent) {
    event.preventDefault();
    createJob.mutate({
      wedding_id: weddingId,
      printer_account_id: printerId,
      product_description: description,
      quantity: Number(quantity),
      due_date: dueDate || null,
      production_notes: notes,
    });
  }

  const actor = me.data?.role === "platform" ? "platform" : "printer";
  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">BASKI VE TESLİMAT</p>
          <h1>Baskı operasyonu</h1>
          <p className="admin-subtitle">
            Onaylı tasarımı baskıcıya atayın ve teslimata kadar izleyin.
          </p>
        </div>
      </div>
      {jobs.error ? <Notice>{jobs.error.message}</Notice> : null}
      {me.data?.role === "platform" ? (
        <section className="admin-panel detail-list">
          <header>
            <Printer />
            <div>
              <span>YENİ ÜRETİM</span>
              <h2>Baskı işi oluştur</h2>
            </div>
          </header>
          <form className="finance-add-on-form" onSubmit={submit}>
            <label className="form-field">
              <span>Baskı onaylı organizasyon</span>
              <select
                value={weddingId}
                onChange={(event) => setWeddingId(event.target.value)}
                required
              >
                <option value="">Seçin</option>
                {weddings.data?.items
                  .filter((item) => item.design_status === "approved_for_print")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="form-field">
              <span>Baskıcı</span>
              <select
                value={printerId}
                onChange={(event) => setPrinterId(event.target.value)}
                required
              >
                <option value="">Seçin</option>
                {printers.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Ürün / uygulama tanımı"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              minLength={3}
              maxLength={240}
              required
            />
            <Field
              label="Adet"
              type="number"
              min={1}
              max={100000}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
            <Field
              label="Hedef teslim tarihi"
              type="date"
              value={dueDate}
              onValueChange={setDueDate}
            />
            <TextField
              label="Üretim notu"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
            />
            <button
              className="admin-button primary"
              disabled={createJob.isPending}
            >
              Baskıcıya ata
            </button>
          </form>
        </section>
      ) : null}
      <section className="admin-panel detail-list">
        <header>
          <Printer />
          <div>
            <span>İŞ TAKİBİ</span>
            <h2>
              {actor === "printer" ? "Bana atanan işler" : "Tüm baskı işleri"}
            </h2>
          </div>
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
            <div className="detail-static-row" key={job.id}>
              <div>
                <strong>
                  {job.wedding_title} · {job.product_description} ·{" "}
                  {job.quantity} adet
                </strong>
                <small>
                  {job.printer_name} · Tasarım sürümü {job.design_revision}
                  {job.due_date ? ` · Hedef ${job.due_date}` : ""}
                </small>
                {job.production_notes ? (
                  <small>{job.production_notes}</small>
                ) : null}
                {job.pdf_preflight ? (
                  <small>
                    PDF ön kontrolü:{" "}
                    {job.pdf_preflight.passed
                      ? "otomatik kontroller geçti"
                      : "düzeltme gerekli"}
                    .{" "}
                    {job.pdf_preflight.checks
                      .map(
                        (check) =>
                          `${check.label}: ${
                            check.status === "passed"
                              ? "geçti"
                              : check.status === "failed"
                                ? "başarısız"
                                : "matbaa kontrolü"
                          }`,
                      )
                      .join(" · ")}
                  </small>
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
              <div className="account-actions">
                <span>{PRINT_JOB_STATUS_LABELS[job.status]}</span>
                {me.data?.role === "platform" ? (
                  <label className="admin-button">
                    PDF yükle / değiştir
                    <input
                      className="sr-only"
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={uploadPdf.isPending}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadPdf.mutate({ job, file });
                        event.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
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
            </div>
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
