import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, FilePlus2, Gauge, Rocket, Send, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import type { PeriodBillingRow } from "@/api/types";
import { invoiceStatus } from "@/api/labels";
import { useUI } from "@/stores/ui";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/PageLoader";
import { CountUp, fireConfetti, GradientBorder } from "@/components/fx";
import { errorMessage } from "@/lib/query";
import { cn, money } from "@/lib/format";
import { addPeriods, currentPeriod, periodLabel } from "@/lib/date";

type Run = { kind: "generate" | "issue"; done: number; total: number; ok: number; errors: { room: string; message: string }[]; finished: boolean };

export default function BillingRun() {
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [params, setParams] = useSearchParams();
  const period = params.get("period") ?? addPeriods(currentPeriod(), -1);
  const qc = useQueryClient();
  const [run, setRun] = useState<Run | null>(null);
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["billing-run", period, propertyId], queryFn: () => api.invoices.billingRun(period, propertyId) });

  const groups = useMemo(() => {
    const ready = rows.filter((r) => !r.invoice && r.missing.length === 0);
    const blocked = rows.filter((r) => !r.invoice && r.missing.length > 0);
    const drafts = rows.filter((r) => r.invoice?.status === "DRAFT");
    const issued = rows.filter((r) => r.invoice && r.invoice.status !== "DRAFT");
    return { ready, blocked, drafts, issued };
  }, [rows]);

  const execute = async (kind: Run["kind"], list: PeriodBillingRow[]) => {
    const state: Run = { kind, done: 0, total: list.length, ok: 0, errors: [], finished: false };
    setRun({ ...state });
    for (const r of list) {
      try {
        if (kind === "generate") await api.invoices.generate(r.contract.id, period);
        else await api.invoices.issue(r.invoice!.id);
        state.ok++;
      } catch (e) {
        state.errors.push({ room: r.room.code, message: errorMessage(e) });
      }
      state.done++;
      setRun({ ...state });
    }
    state.finished = true;
    setRun({ ...state });
    await qc.invalidateQueries();
    if (state.ok && !state.errors.length) {
      fireConfetti();
      toast.success(kind === "generate" ? `Đã lập ${state.ok} hóa đơn nháp — kiểm tra rồi phát hành` : `Đã phát hành ${state.ok} hóa đơn cho ${periodLabel(period)}`);
    } else if (state.errors.length) toast.warning(`${state.errors.length} hóa đơn chưa xử lý được`);
  };

  const busy = run && !run.finished;
  const sumEstimate = groups.ready.reduce((s, r) => s + r.estimate, 0);
  const sumDraft = groups.drafts.reduce((s, r) => s + (r.invoice?.total ?? 0), 0);

  const steps = [
    { n: 1, title: "Chốt chỉ số", desc: `${groups.blocked.length} hợp đồng thiếu dữ liệu`, done: groups.blocked.length === 0, icon: Gauge },
    { n: 2, title: "Lập hóa đơn nháp", desc: `${groups.ready.length} sẵn sàng · ≈ ${money(sumEstimate)}`, done: groups.ready.length === 0 && groups.blocked.length === 0, icon: FilePlus2 },
    { n: 3, title: "Phát hành", desc: `${groups.drafts.length} nháp · ${money(sumDraft)}`, done: groups.drafts.length === 0 && groups.ready.length === 0 && groups.blocked.length === 0, icon: Send },
  ];

  return (
    <div>
      <Link to="/app/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <ArrowLeft className="size-4" /> Hóa đơn
      </Link>
      <PageHeader
        eyebrow="EP07 · US-010 · BR-009"
        title="Lập hóa đơn theo kỳ"
        description="Mỗi hợp đồng chỉ có một hóa đơn định kỳ mỗi kỳ — bấm lại không tạo trùng (AC-010-02)."
        actions={
          <Card className="flex items-center gap-1 p-1">
            <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => setParams({ period: addPeriods(period, -1) })} aria-label="Kỳ trước">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[130px] text-center text-sm font-bold text-slate-900 dark:text-white">{periodLabel(period)}</div>
            <Button variant="ghost" size="sm" disabled={!!busy || period >= currentPeriod()} onClick={() => setParams({ period: addPeriods(period, 1) })} aria-label="Kỳ sau">
              <ChevronRight className="size-4" />
            </Button>
          </Card>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div key={s.n} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className={cn("relative flex items-center gap-4 overflow-hidden p-4", s.done && "ring-1 ring-emerald-500/30")}>
              <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", s.done ? "bg-emerald-500 text-white" : "bg-brand-500/10 text-brand-600 dark:text-brand-300")}>{s.done ? <CheckCircle2 className="size-5" /> : <s.icon className="size-5" />}</div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-400">BƯỚC {s.n}</div>
                <div className="font-bold text-slate-900 dark:text-white">{s.title}</div>
                <div className="truncate text-xs text-slate-500">{s.desc}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {run && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6">
            <GradientBorder>
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    {run.finished ? <Sparkles className="size-5 text-emerald-500" /> : <Rocket className="size-5 animate-bounce text-brand-500" />}
                    {run.kind === "generate" ? "Đang lập hóa đơn nháp" : "Đang phát hành hóa đơn"} {run.finished && "— hoàn tất"}
                  </div>
                  <div className="num text-sm font-bold text-slate-700 dark:text-slate-300">
                    {run.done}/{run.total}
                  </div>
                </div>
                <ProgressBar value={run.total ? run.done / run.total : 1} tone={run.errors.length ? "amber" : "brand"} className="h-3" />
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Badge tone="green">Thành công {run.ok}</Badge>
                  {run.errors.length > 0 && <Badge tone="red">Lỗi {run.errors.length}</Badge>}
                  {run.finished && (
                    <button onClick={() => setRun(null)} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">
                      Đóng
                    </button>
                  )}
                </div>
                {run.errors.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-rose-600 dark:text-rose-400">
                    {run.errors.map((e, i) => (
                      <li key={i} className="flex gap-1.5">
                        <XCircle className="mt-0.5 size-3.5 shrink-0" /> <b>{e.room}:</b> {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </GradientBorder>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="glow" icon={<FilePlus2 className="size-4" />} disabled={!groups.ready.length || !!busy} onClick={() => execute("generate", groups.ready)}>
          Lập {groups.ready.length} hóa đơn nháp
        </Button>
        <Button variant="success" icon={<Send className="size-4" />} disabled={!groups.drafts.length || !!busy} onClick={() => execute("issue", groups.drafts)}>
          Phát hành {groups.drafts.length} hóa đơn
        </Button>
        {groups.blocked.length > 0 && (
          <Button variant="secondary" icon={<Gauge className="size-4" />} to={`/app/meters?period=${period}`}>
            Đi chốt chỉ số
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <EmptyState title="Không có hợp đồng nào trong kỳ này" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Người đại diện</th>
                  <th className="text-right">Tạm tính / Tổng</th>
                  <th>Tình trạng</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.contract.id} className={cn(r.missing.length > 0 && "bg-amber-50/50 dark:bg-amber-500/[0.04]")}>
                    <td className="font-bold text-slate-900 dark:text-white">{r.room.code}</td>
                    <td>
                      <Link to={`/app/contracts/${r.contract.id}`} className="hover:text-brand-600">
                        {r.representativeName}
                      </Link>
                      <div className="font-mono text-[11px] text-slate-400">{r.contract.code}</div>
                    </td>
                    <td className="num text-right font-semibold">{r.invoice ? money(r.invoice.total) : r.missing.length ? <span className="text-slate-400">—</span> : <span className="text-slate-500">≈ {money(r.estimate)}</span>}</td>
                    <td>
                      {r.invoice ? (
                        <StatusBadge map={invoiceStatus} value={r.invoice.status} />
                      ) : r.missing.length ? (
                        <div className="max-w-md space-y-1 whitespace-normal">
                          {r.missing.map((m) => (
                            <div key={m} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                              {m}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Badge tone="cyan" dot>
                          Sẵn sàng lập
                        </Badge>
                      )}
                    </td>
                    <td className="text-right">
                      {r.invoice && (
                        <Button size="xs" variant="secondary" to={`/app/invoices/${r.invoice.id}`}>
                          Xem
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Đã phát hành: <CountUp value={groups.issued.length} /> / {rows.length} hợp đồng.
      </p>
    </div>
  );
}
