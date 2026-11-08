"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  FilePenLine,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { api, type Wedding } from "@/lib/api";
import type { DesignRequestStatus, DesignRequestSurfaceId } from "@/lib/models";
import styles from "./design-plans.module.css";

const surfaceOrder: DesignRequestSurfaceId[] = ["qr", "loading", "wedding"];
const surfaceLabels: Record<DesignRequestSurfaceId, string> = {
  qr: "QR tasarımı",
  loading: "Loading Page",
  wedding: "Wedding",
};
const statusLabels: Record<DesignRequestStatus, string> = {
  draft: "Taslak",
  submitted: "Talep alındı",
  in_design: "Tasarımda",
  awaiting_approval: "Onay bekliyor",
  revision_requested: "Revizyon istendi",
  completed: "Tamamlandı",
};
type FilterId = "all" | "active" | "approval" | "revision" | "completed";

function statusTone(status?: DesignRequestStatus) {
  if (status === "completed") return "complete";
  if (status === "revision_requested") return "revision";
  if (status === "awaiting_approval") return "approval";
  if (status === "in_design" || status === "submitted") return "active";
  return "draft";
}

function matchesFilter(plan: Wedding, filter: FilterId) {
  const status = plan.design_request?.status;
  const surfaceStatuses = Object.values(
    plan.design_request?.surfaces || {},
  ).map((surface) => surface.status);
  if (filter === "all") return true;
  if (filter === "completed") return status === "completed";
  if (filter === "revision")
    return (
      status === "revision_requested" ||
      surfaceStatuses.includes("revision_requested")
    );
  if (filter === "approval")
    return (
      status === "awaiting_approval" ||
      surfaceStatuses.includes("awaiting_approval")
    );
  return status !== "completed";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function updatedText(value?: string | null) {
  if (!value) return "Henüz güncellenmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DesignPlansPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const plans = useQuery({
    queryKey: ["design-plans"],
    queryFn: () => api<Wedding[]>("/admin/design-plans"),
  });
  const source = useMemo(() => plans.data || [], [plans.data]);
  const counts = useMemo(
    () => ({
      total: source.length,
      active: source.filter(
        (plan) => plan.design_request?.status !== "completed",
      ).length,
      approval: source.filter((plan) => matchesFilter(plan, "approval")).length,
      revision: source.filter((plan) => matchesFilter(plan, "revision")).length,
      completed: source.filter(
        (plan) => plan.design_request?.status === "completed",
      ).length,
    }),
    [source],
  );
  const visiblePlans = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    const priority = (plan: Wedding) =>
      matchesFilter(plan, "revision")
        ? 0
        : matchesFilter(plan, "approval")
          ? 1
          : plan.design_request?.status === "completed"
            ? 3
            : 2;
    return source
      .filter((plan) => matchesFilter(plan, filter))
      .filter(
        (plan) =>
          !needle ||
          [
            plan.title,
            plan.customer_name,
            plan.customer_phone,
            plan.customer_email,
            plan.package_snapshot?.name,
            plan.package_code,
          ].some((value) => value?.toLocaleLowerCase("tr-TR").includes(needle)),
      )
      .sort(
        (left, right) =>
          priority(left) - priority(right) ||
          Date.parse(right.design_request?.updated_at || "") -
            Date.parse(left.design_request?.updated_at || ""),
      );
  }, [filter, query, source]);

  return (
    <AdminShell>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>TASARIM OPERASYONU</p>
            <h1>Tasarım planları</h1>
            <p className={styles.lead}>
              Müşteri brieflerini, üretim dosyalarını, revizyonları ve onayları
              tek bir operasyon kuyruğunda yönetin.
            </p>
          </div>
          <div className={styles.heroMeta}>
            <span>Canlı operasyon</span>
            <strong>{counts.active} aktif plan</strong>
          </div>
        </header>

        <section className={styles.metrics} aria-label="Tasarım planı özeti">
          <article>
            <ClipboardList aria-hidden="true" />
            <div>
              <span>Toplam plan</span>
              <strong>{counts.total}</strong>
            </div>
          </article>
          <article>
            <FilePenLine aria-hidden="true" />
            <div>
              <span>Aktif çalışma</span>
              <strong>{counts.active}</strong>
            </div>
          </article>
          <article className={styles.metricAttention}>
            <Clock3 aria-hidden="true" />
            <div>
              <span>Onay bekliyor</span>
              <strong>{counts.approval}</strong>
            </div>
          </article>
          <article className={styles.metricDanger}>
            <CircleAlert aria-hidden="true" />
            <div>
              <span>Revizyon</span>
              <strong>{counts.revision}</strong>
            </div>
          </article>
          <article>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <span>Tamamlanan</span>
              <strong>{counts.completed}</strong>
            </div>
          </article>
        </section>

        <section className={styles.workspace} aria-labelledby="plans-heading">
          <div className={styles.toolbar}>
            <div>
              <p className={styles.eyebrow}>OPERASYON KUYRUĞU</p>
              <h2 id="plans-heading">Planlar</h2>
              <span>{visiblePlans.length} kayıt gösteriliyor</span>
            </div>
            <label className={styles.search}>
              <Search aria-hidden="true" size={18} />
              <span className={styles.srOnly}>Tasarım planlarında ara</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Organizasyon, müşteri veya paket ara"
              />
            </label>
          </div>
          <div className={styles.filters} aria-label="Plan durumunu filtrele">
            <SlidersHorizontal aria-hidden="true" size={16} />
            {(
              [
                ["all", "Tümü", counts.total],
                ["active", "Aktif", counts.active],
                ["approval", "Onay bekleyen", counts.approval],
                ["revision", "Revizyon", counts.revision],
                ["completed", "Tamamlanan", counts.completed],
              ] as const
            ).map(([id, label, count]) => (
              <button
                type="button"
                key={id}
                className={filter === id ? styles.filterActive : undefined}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>

          {plans.isLoading ? (
            <div className={styles.state} role="status">
              <LoaderCircle className="animate-spin" />
              <strong>Planlar yükleniyor</strong>
              <span>Operasyon kuyruğu hazırlanıyor…</span>
            </div>
          ) : plans.error ? (
            <div className={styles.state} role="alert">
              <CircleAlert />
              <strong>Planlar yüklenemedi</strong>
              <span>{plans.error.message}</span>
            </div>
          ) : visiblePlans.length === 0 ? (
            <div className={styles.state}>
              <ClipboardList />
              <strong>
                {source.length
                  ? "Eşleşen plan bulunamadı"
                  : "Henüz tasarım talebi yok"}
              </strong>
              <span>
                {source.length
                  ? "Arama veya filtre seçiminizi değiştirin."
                  : "Yeni talepler gönderildiğinde burada görünecek."}
              </span>
            </div>
          ) : (
            <div className={styles.planGrid}>
              {visiblePlans.map((plan) => {
                const request = plan.design_request;
                const status = request?.status || "draft";
                const surfaces = request?.surfaces;
                const completed = surfaceOrder.filter(
                  (surface) => surfaces?.[surface]?.status === "completed",
                ).length;
                const progress = Math.round(
                  (completed / surfaceOrder.length) * 100,
                );
                const targetSurface =
                  surfaceOrder.find(
                    (surface) => surfaces?.[surface]?.status !== "completed",
                  ) || "qr";
                return (
                  <article className={styles.planCard} key={plan.id}>
                    <div className={styles.cardTop}>
                      <span
                        className={`${styles.status} ${styles[statusTone(status)]}`}
                      >
                        <i aria-hidden="true" />
                        {statusLabels[status]}
                      </span>
                      <span className={styles.updated}>
                        Son işlem {updatedText(request?.updated_at)}
                      </span>
                    </div>
                    <div className={styles.cardIdentity}>
                      <div className={styles.avatar} aria-hidden="true">
                        {(plan.title || "TP")
                          .slice(0, 2)
                          .toLocaleUpperCase("tr-TR")}
                      </div>
                      <div>
                        <h3>{plan.title}</h3>
                        <p>
                          {plan.customer_name || "Müşteri bilgisi bekleniyor"}
                        </p>
                      </div>
                    </div>
                    <dl className={styles.meta}>
                      <div>
                        <dt>Paket</dt>
                        <dd>
                          {plan.package_snapshot?.name ||
                            plan.package_code ||
                            "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Organizasyon</dt>
                        <dd>{formatDate(plan.wedding_date)}</dd>
                      </div>
                      <div>
                        <dt>İletişim</dt>
                        <dd>
                          {plan.customer_phone || plan.customer_email || "—"}
                        </dd>
                      </div>
                    </dl>
                    <div className={styles.progressHead}>
                      <div>
                        <span>Genel ilerleme</span>
                        <strong>
                          {completed}/{surfaceOrder.length} alan tamamlandı
                        </strong>
                      </div>
                      <b>{progress}%</b>
                    </div>
                    <div
                      className={styles.progressTrack}
                      aria-label={`İlerleme yüzde ${progress}`}
                    >
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <div className={styles.surfaceList}>
                      {surfaceOrder.map((surface) => {
                        const surfaceStatus =
                          surfaces?.[surface]?.status || "draft";
                        return (
                          <div key={surface}>
                            <span
                              className={`${styles.surfaceIcon} ${styles[statusTone(surfaceStatus)]}`}
                            >
                              {surfaceStatus === "completed" ? (
                                <Check size={13} />
                              ) : null}
                            </span>
                            <span>
                              <strong>{surfaceLabels[surface]}</strong>
                              <small>{statusLabels[surfaceStatus]}</small>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <footer>
                      <span>
                        {request?.submitted_at
                          ? `Talep ${updatedText(request.submitted_at)}`
                          : "Taslak çalışma"}
                      </span>
                      <Link href={`/admin/${plan.id}/design/${targetSurface}`}>
                        Planı aç <ArrowRight size={16} />
                      </Link>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AdminShell>
  );
}
