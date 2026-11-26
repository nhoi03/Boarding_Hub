import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, FileText, Gauge, History, Home, Receipt, ScrollText, Search, ShieldCheck, Wallet, Wrench } from "lucide-react";
import { api } from "@/api";
import type { AuditLog } from "@/api/types";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Input, Segmented } from "@/components/ui/form";
import { TableSkeleton } from "@/components/PageLoader";
import { cn } from "@/lib/format";
import { fmtDate, fmtDateTime, localDate, relativeTime } from "@/lib/date";

const entityMeta: Record<string, { label: string; icon: typeof Home; tone: string }> = {
  room: { label: "Phòng", icon: Home, tone: "bg-brand-500/10 text-brand-700" },
  contract: { label: "Hợp đồng", icon: FileText, tone: "bg-amber-500/10 text-amber-800" },
  reading: { label: "Chỉ số", icon: Gauge, tone: "bg-amber-500/10 text-amber-600" },
  invoice: { label: "Hóa đơn", icon: Receipt, tone: "bg-sky-500/10 text-sky-600" },
  payment: { label: "Phiếu thu", icon: Wallet, tone: "bg-emerald-500/10 text-emerald-600" },
  maintenance: { label: "Bảo trì", icon: Wrench, tone: "bg-orange-500/10 text-orange-600" },
};
const meta = (t: string) => entityMeta[t] ?? { label: t, icon: ScrollText, tone: "bg-slate-500/10 text-slate-600" };

function Diff({ log }: { log: AuditLog }) {
  const keys = Array.from(new Set([...Object.keys(log.before ?? {}), ...Object.keys(log.after ?? {})]));
  if (!keys.length) return <p className="text-xs text-slate-500">Không có dữ liệu trước/sau.</p>;
  const show = (v: unknown) => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 text-xs dark:border-white/10">
      <div className="grid grid-cols-3 bg-slate-50 px-3 py-1.5 font-semibold text-slate-500 dark:bg-white/[0.03]">
        <span>Trường</span>
        <span>Trước</span>
        <span>Sau</span>
      </div>
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-3 border-t border-slate-100 px-3 py-1.5 font-mono dark:border-white/[0.05]">
          <span className="text-slate-500">{k}</span>
          <span className="text-rose-600 line-through decoration-rose-300">{show(log.before?.[k])}</span>
          <span className="text-emerald-600">{show(log.after?.[k])}</span>
        </div>
      ))}
    </div>
  );
}

export default function Audit() {
  const [entity, setEntity] = useState("ALL");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ["audit", entity, q], queryFn: () => api.audit.list({ entityType: entity === "ALL" ? undefined : entity, search: q || undefined }) });

  const groups = data.reduce<Record<string, AuditLog[]>>((acc, l) => {
    (acc[localDate(l.at)] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader eyebrow="EP09 · BR-016" title="Nhật ký nghiệp vụ" description="Mọi thao tác ghi dữ liệu đều để lại dấu vết: ai, lúc nào, trước và sau. Không ai sửa hay xóa được nhật ký." />
      <Card className="mb-5 flex items-center gap-3 bg-brand-500/10 p-4">
        <ShieldCheck className="size-6 shrink-0 text-brand-600" />
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Nhật ký là bằng chứng khi đối soát tiền với người thuê. Có <b>{data.length}</b> sự kiện khớp bộ lọc.
        </p>
      </Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          layoutId="audit-entity"
          value={entity}
          onChange={setEntity}
          options={[{ value: "ALL", label: "Tất cả" }, ...Object.entries(entityMeta).map(([k, v]) => ({ value: k, label: v.label }))]}
        />
        <div className="sm:ml-auto sm:w-72">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo nội dung, người làm…" icon={<Search className="size-4" />} />
        </div>
      </div>

      {isLoading ? (
        <Card>
          <TableSkeleton rows={8} />
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState icon={<History className="size-6" />} title="Chưa có sự kiện" />
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([day, logs]) => (
            <div key={day}>
              <div className="sticky top-16 z-10 mb-2 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm backdrop-blur dark:bg-ink-900/80">{fmtDate(day)}</div>
              <Card className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {logs.map((l, i) => {
                  const m = meta(l.entityType);
                  const expanded = open === l.id;
                  return (
                    <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.02 }}>
                      <button onClick={() => setOpen(expanded ? null : l.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                        <div className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", m.tone)}>
                          <m.icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{l.summary}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Avatar name={l.actor} size={16} className="ring-0" /> {l.actor}
                            </span>
                            <span title={fmtDateTime(l.at)}>{relativeTime(l.at)}</span>
                            <Badge className="font-mono">{l.action}</Badge>
                          </div>
                        </div>
                        <ChevronDown className={cn("mt-2 size-4 shrink-0 text-slate-400 transition", expanded && "rotate-180")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 pl-16">
                              <Diff log={l} />
                              <div className="mt-2 text-[11px] text-slate-400">
                                {m.label} #{String(l.entityId)} · {fmtDateTime(l.at)}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
