"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { api } from "@/lib/api";

type AuditRow = {
  at: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  ip: string | null;
  target: Record<string, unknown>;
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const logs = useQuery({
    queryKey: ["audit", page],
    queryFn: () =>
      api<{ items: AuditRow[]; total: number; pages: number }>(
        `/admin/audit?page=${page}`,
      ),
  });
  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">GÜVENLİK</p>
          <h1>İşlem kayıtları</h1>
          <p className="admin-subtitle">
            Kritik hesap ve yönetim hareketlerinin zaman çizelgesi.
          </p>
        </div>
      </div>
      {logs.error ? <Notice>{logs.error.message}</Notice> : null}
      <div className="space-y-3">
        {logs.data?.items.map((row, index) => (
          <article
            key={`${row.at}-${index}`}
            className="admin-panel rounded-xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-cream">{row.action}</strong>
              <time className="admin-hint">
                {new Date(row.at).toLocaleString("tr-TR")}
              </time>
            </div>
            <p className="admin-hint mt-2">
              {row.actor_role || "anonim"} · {row.actor_id || "—"} ·{" "}
              {row.ip || "IP yok"}
            </p>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
              {JSON.stringify(row.target)}
            </pre>
          </article>
        ))}
      </div>
      {logs.data && logs.data.pages > 1 ? (
        <div className="mt-6 flex justify-center gap-3">
          <button
            className="admin-button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Önceki
          </button>
          <span className="admin-hint">
            {page} / {logs.data.pages}
          </span>
          <button
            className="admin-button"
            disabled={page >= logs.data.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Sonraki
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
