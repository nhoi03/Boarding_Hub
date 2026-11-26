import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AlertTriangle, Camera, CheckCheck, ChevronLeft, ChevronRight, Droplets, Gauge, Loader2, Lock, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import type { PeriodReadingRow } from "@/api/types";
import { ApiError } from "@/api/types";
import { useUI } from "@/stores/ui";
import { Badge, Card, EmptyState, PageHeader, ProgressRing } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/form";
import { TableSkeleton } from "@/components/PageLoader";
import { OcrModal } from "@/components/domain/OcrModal";
import { CountUp } from "@/components/fx";
import { useApiMutation, errorMessage } from "@/lib/query";
import { cn, matches, num } from "@/lib/format";
import { addPeriods, currentPeriod, periodLabel, relativeTime } from "@/lib/date";

function ReadingInput({ row, idx, period, locked, onOcr }: { row: PeriodReadingRow; idx: number; period: string; locked: boolean; onOcr: () => void }) {
  const qc = useQueryClient();
  const initial = row.reading ? String(row.reading.currentValue) : "";
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => setV(initial), [initial]);
  const n = Number(v);
  const cons = v !== "" && Number.isFinite(n) ? n - row.previousValue : null;

  const save = async () => {
    if (v === "" || Number(v) === row.reading?.currentValue) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await api.readings.save({ meterId: row.meter.id, period, currentValue: Number(v), source: "MANUAL" });
      if (r.isAnomaly) toast.warning(`Phòng ${row.room.code}: lượng ${row.service.name.toLowerCase()} bất thường so với 3 kỳ trước — hãy kiểm tra lại.`);
      await qc.invalidateQueries({ queryKey: ["readings"] });
      qc.invalidateQueries({ queryKey: ["reminders"] });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <td className="w-56 min-w-[200px]">
        <div className="flex items-center gap-1.5">
          <div className="relative min-w-[120px] flex-1">
            <input
              value={v}
              disabled={locked}
              inputMode="numeric"
              onChange={(e) => {
                setV(e.target.value.replace(/[^\d.]/g, ""));
                setErr(null);
              }}
              onBlur={() => save()}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const next = document.querySelector<HTMLInputElement>(`[data-reading-idx="${idx + 1}"]`);
                if (next) next.focus();
                else e.currentTarget.blur();
              }}
              data-reading-idx={idx}
              placeholder={num(row.previousValue)}
              className={cn(
                "num h-9 w-full rounded-lg border bg-white px-3 text-sm font-semibold outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:bg-white/[0.04] dark:disabled:bg-white/[0.02]",
                err ? "border-rose-400 focus:ring-rose-500/15" : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/15 dark:border-white/10",
              )}
            />
            {saving && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-brand-500" />}
            {locked && <Lock className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-400" />}
          </div>
          {!locked && (
            <button onClick={onOcr} title="Đọc bằng ảnh (OCR)" className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-600 dark:border-white/10 dark:hover:bg-cyan-500/10">
              <Camera className="size-4" />
            </button>
          )}
        </div>
        {err && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 max-w-[260px] text-xs font-medium whitespace-normal text-rose-600 dark:text-rose-400">
            {err}
          </motion.div>
        )}
      </td>
      <td className="num w-36 text-right">
        {cons == null ? (
          <span className="text-slate-300">—</span>
        ) : cons < 0 ? (
          <span className="font-semibold text-rose-600">{num(cons)}</span>
        ) : (
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{num(cons)}</span> <span className="text-xs text-slate-500">{row.service.unit}</span>
            <div className="mt-1 ml-auto h-1 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (cons / (row.service.code === "ELECTRIC" ? 250 : 12)) * 100)}%` }} className={cn("h-full rounded-full", row.service.code === "ELECTRIC" ? "bg-amber-400" : "bg-sky-400")} />
            </div>
          </div>
        )}
      </td>
    </>
  );
}

export default function Meters() {
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [params, setParams] = useSearchParams();
  const period = params.get("period") ?? currentPeriod();
  const [filter, setFilter] = useState<"ALL" | "MISSING" | "DRAFT" | "CONFIRMED">("ALL");
  const [q, setQ] = useState("");
  const [ocr, setOcr] = useState<PeriodReadingRow | null>(null);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["readings", period, propertyId], queryFn: () => api.readings.listPeriod(period, propertyId) });
  const isPast = period < currentPeriod();

  const stats = useMemo(() => {
    const total = rows.length;
    const entered = rows.filter((r) => r.reading).length;
    const confirmed = rows.filter((r) => r.reading?.status === "CONFIRMED").length;
    const drafts = rows.filter((r) => r.reading?.status === "DRAFT");
    const anomalies = rows.filter((r) => r.reading?.isAnomaly).length;
    return { total, entered, confirmed, drafts, anomalies };
  }, [rows]);

  const confirm = useApiMutation(() => api.readings.confirm(stats.drafts.map((r) => r.reading!.id)), { success: (n) => `Đã xác nhận ${n} chỉ số — sẵn sàng lập hóa đơn` });

  const shown = rows
    .filter((r) => (filter === "ALL" ? true : filter === "MISSING" ? !r.reading : r.reading?.status === filter))
    .filter((r) => !q || matches(`${r.room.code} ${r.propertyName}`, q));

  const applyOcr = async (row: PeriodReadingRow, value: number) => {
    try {
      const r = await api.readings.save({ meterId: row.meter.id, period, currentValue: value, source: "OCR" });
      toast.success(`Đã điền ${num(value)} ${row.service.unit} từ OCR cho phòng ${row.room.code} (nháp)`);
      if (r.isAnomaly) toast.warning("Lượng tiêu thụ bất thường — hãy kiểm tra ảnh.");
      qc.invalidateQueries({ queryKey: ["readings"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="EP06 · US-008 · US-009"
        title="Chỉ số điện nước"
        description="Nhập số mới, Enter để sang dòng kế. Chỉ chỉ số đã xác nhận mới được dùng lập hóa đơn (BR-008)."
        actions={
          <Card className="flex items-center gap-1 p-1">
            <Button variant="ghost" size="sm" onClick={() => setParams({ period: addPeriods(period, -1) })} aria-label="Kỳ trước">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[130px] text-center text-sm font-bold text-slate-900 dark:text-white">{periodLabel(period)}</div>
            <Button variant="ghost" size="sm" disabled={period >= currentPeriod()} onClick={() => setParams({ period: addPeriods(period, 1) })} aria-label="Kỳ sau">
              <ChevronRight className="size-4" />
            </Button>
          </Card>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[auto_1fr]">
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={stats.total ? stats.confirmed / stats.total : 0} size={96} stroke={9}>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.total ? Math.round((stats.confirmed / stats.total) * 100) : 0}%</div>
          </ProgressRing>
          <div className="space-y-1 text-sm">
            <div className="font-semibold text-slate-900 dark:text-white">Tiến độ kỳ</div>
            <div className="text-slate-500">
              Đã nhập <b className="text-slate-800 dark:text-slate-200"><CountUp value={stats.entered} /></b>/{stats.total}
            </div>
            <div className="text-slate-500">
              Đã xác nhận <b className="text-emerald-600"><CountUp value={stats.confirmed} /></b>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col justify-center gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap gap-2">
            {stats.anomalies > 0 && (
              <Badge tone="amber">
                <AlertTriangle className="size-3" /> {stats.anomalies} chỉ số bất thường
              </Badge>
            )}
            <Badge tone="blue">{stats.drafts.length} nháp chờ xác nhận</Badge>
            <Badge tone="gray">{stats.total - stats.entered} chưa nhập</Badge>
          </div>
          <Button variant="success" icon={<CheckCheck className="size-4" />} disabled={!stats.drafts.length} loading={confirm.isPending} onClick={() => confirm.mutate()}>
            Xác nhận {stats.drafts.length} chỉ số nháp
          </Button>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center dark:border-white/[0.06]">
          <Segmented
            layoutId="meter-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: "Tất cả", count: stats.total },
              { value: "MISSING", label: "Chưa nhập", count: stats.total - stats.entered },
              { value: "DRAFT", label: "Nháp", count: stats.drafts.length },
              { value: "CONFIRMED", label: "Đã xác nhận", count: stats.confirmed },
            ]}
          />
          <div className="sm:ml-auto sm:w-64">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm phòng…" icon={<Search className="size-4" />} />
          </div>
        </div>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Gauge className="size-6" />} title="Không có đồng hồ phù hợp" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Dịch vụ</th>
                  <th className="text-right">Chỉ số cũ</th>
                  <th>Chỉ số mới</th>
                  <th className="text-right">Tiêu thụ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const locked = isPast && r.reading?.status === "CONFIRMED";
                  const elec = r.service.code === "ELECTRIC";
                  return (
                    <tr key={r.meter.id} className={cn(r.reading?.isAnomaly && "bg-amber-50/60 dark:bg-amber-500/5")}>
                      <td>
                        <div className="font-bold text-slate-900 dark:text-white">{r.room.code}</div>
                        <div className="text-xs text-slate-500">{r.propertyName.replace("BoardingHub ", "")}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={cn("flex size-8 items-center justify-center rounded-lg", elec ? "bg-amber-400/15 text-amber-600" : "bg-sky-400/15 text-sky-600")}>{elec ? <Zap className="size-4" /> : <Droplets className="size-4" />}</div>
                          <div>
                            <div className="font-medium">{r.service.name}</div>
                            <div className="font-mono text-[11px] text-slate-400">{r.meter.serial}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num text-right text-slate-500">{num(r.previousValue)}</td>
                      <ReadingInput row={r} idx={i} period={period} locked={locked} onOcr={() => setOcr(r)} />
                      <td>
                        {!r.reading ? (
                          <Badge>Chưa nhập</Badge>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex flex-wrap gap-1">
                              {r.reading.status === "CONFIRMED" ? <Badge tone="green" dot>Đã xác nhận</Badge> : <Badge tone="blue" dot>Nháp</Badge>}
                              {r.reading.source === "OCR" && <Badge tone="cyan">OCR</Badge>}
                              {r.reading.isAnomaly && <Badge tone="amber">Bất thường</Badge>}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {r.reading.recordedBy} · {relativeTime(r.reading.readAt)}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OcrModal open={!!ocr} onClose={() => setOcr(null)} meterId={ocr?.meter.id} period={period} label={ocr ? `Phòng ${ocr.room.code} · ${ocr.service.name}` : ""} onUse={(v) => ocr && applyOcr(ocr, v)} />
    </div>
  );
}
