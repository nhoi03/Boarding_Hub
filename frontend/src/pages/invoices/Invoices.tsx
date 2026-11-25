import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AlertCircle, Banknote, FileStack, FileText, Receipt, Search, Wallet } from "lucide-react";
import { api } from "@/api";
import { invoiceStatus } from "@/api/labels";
import { useUI } from "@/stores/ui";
import { Card, EmptyState, PageHeader, StatusBadge, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/Tabs";
import { TableSkeleton } from "@/components/PageLoader";
import { CollectPaymentModal } from "@/components/domain/CollectPayment";
import { CountUp, SpotlightCard, rise, stagger } from "@/components/fx";
import { cn, compactMoney, money } from "@/lib/format";
import { addPeriods, currentPeriod, fmtDate, periodLabel } from "@/lib/date";

type Tab = "ALL" | "UNPAID" | "OVERDUE" | "DRAFT" | "PAID";

export default function Invoices() {
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("status") as Tab) ?? "ALL";
  const period = params.get("period") ?? "";
  const [q, setQ] = useState("");
  const [collect, setCollect] = useState<{ contractId: number; invoiceId: number } | null>(null);
  const nav = useNavigate();
  const { data: all = [], isLoading } = useQuery({ queryKey: ["invoices", { propertyId, period }], queryFn: () => api.invoices.list({ propertyId, period: period || undefined }) });

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v && v !== "ALL") p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  const counts = useMemo(
    () => ({
      ALL: all.length,
      UNPAID: all.filter((i) => i.balance > 0 && i.status !== "DRAFT" && i.status !== "CANCELLED").length,
      OVERDUE: all.filter((i) => i.overdue).length,
      DRAFT: all.filter((i) => i.status === "DRAFT").length,
      PAID: all.filter((i) => i.status === "PAID").length,
    }),
    [all],
  );
  const live = all.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED");
  const totals = { billed: live.reduce((s, i) => s + i.total, 0), paid: live.reduce((s, i) => s + i.paid, 0), debt: live.reduce((s, i) => s + i.balance, 0), overdue: all.filter((i) => i.overdue).reduce((s, i) => s + i.balance, 0) };

  const shown = all
    .filter((i) => {
      if (tab === "UNPAID") return i.balance > 0 && i.status !== "DRAFT" && i.status !== "CANCELLED";
      if (tab === "OVERDUE") return i.overdue;
      if (tab === "ALL") return true;
      return i.status === tab;
    })
    .filter((i) => !q || `${i.invoiceNo} ${i.roomCode} ${i.representativeName}`.toLowerCase().includes(q.toLowerCase()));

  const periods = Array.from({ length: 8 }, (_, k) => addPeriods(currentPeriod(), -k));

  const kpis = [
    { label: "Đã phát hành", value: totals.billed, icon: FileText, tone: "from-stone-600 to-stone-400" },
    { label: "Đã thu", value: totals.paid, icon: Wallet, tone: "from-emerald-800 to-emerald-600" },
    { label: "Còn phải thu", value: totals.debt, icon: Banknote, tone: "from-amber-500 to-orange-500" },
    { label: "Quá hạn", value: totals.overdue, icon: AlertCircle, tone: "from-brand-700 to-brand-500" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="EP07 · US-010"
        title="Hóa đơn"
        description="Số đã thu và còn nợ tính từ phân bổ thực tế, không lưu cứng (BR-013)."
        actions={
          <Button icon={<FileStack className="size-4" />} to={`/app/invoices/billing${period ? `?period=${period}` : ""}`} variant="glow">
            Lập hóa đơn theo kỳ
          </Button>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={rise}>
            <SpotlightCard className="p-5">
              <div className={cn("mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", k.tone)}>
                <k.icon className="size-5" />
              </div>
              <div className="text-xs font-medium text-slate-500">{k.label}</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-white">
                <CountUp value={k.value} format={(n) => compactMoney(n)} />
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </motion.div>

      <Card className="overflow-hidden">
        <div className="px-3">
          <Tabs
            layoutId="invoice-tab"
            value={tab}
            onChange={(v) => set("status", v)}
            tabs={[
              { value: "ALL", label: "Tất cả", count: counts.ALL },
              { value: "UNPAID", label: "Còn nợ", count: counts.UNPAID },
              { value: "OVERDUE", label: "Quá hạn", count: counts.OVERDUE },
              { value: "DRAFT", label: "Nháp", count: counts.DRAFT },
              { value: "PAID", label: "Đã thu đủ", count: counts.PAID },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 p-3 sm:flex-row">
          <div className="flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm số hóa đơn, phòng, người thuê…" icon={<Search className="size-4" />} />
          </div>
          <div className="sm:w-56">
            <Select value={period} onChange={(e) => set("period", e.target.value)}>
              <option value="">Mọi kỳ</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {periodLabel(p)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Receipt className="size-6" />} title="Không có hóa đơn phù hợp" description="Thử đổi bộ lọc hoặc lập hóa đơn cho kỳ mới." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Hóa đơn</th>
                  <th>Phòng / Người thuê</th>
                  <th>Kỳ</th>
                  <th className="text-right">Tổng</th>
                  <th className="text-right">Còn nợ</th>
                  <th>Hạn đóng</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((i, idx) => (
                  <motion.tr key={i.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 15) * 0.02 }} className="cursor-pointer" onClick={() => nav(`/app/invoices/${i.id}`)}>
                    <td>
                      <Link to={`/app/invoices/${i.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                        {i.invoiceNo}
                      </Link>
                    </td>
                    <td>
                      <div className="font-semibold text-slate-900 dark:text-white">{i.roomCode}</div>
                      <div className="text-xs text-slate-500">{i.representativeName}</div>
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{i.period ? periodLabel(i.period, true) : "—"}</td>
                    <td className="num text-right font-semibold">{money(i.total)}</td>
                    <td className={cn("num text-right font-bold", i.balance > 0 ? "text-rose-600" : "text-emerald-600")}>{i.status === "DRAFT" || i.status === "CANCELLED" ? "—" : money(i.balance)}</td>
                    <td>
                      {i.dueDate ? (
                        <span className={cn(i.overdue && "font-semibold text-rose-600")}>{fmtDate(i.dueDate)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge map={invoiceStatus} value={i.status} />
                        {i.overdue && <Badge tone="red">Quá hạn</Badge>}
                      </div>
                    </td>
                    <td className="text-right">
                      {i.balance > 0 && i.status !== "DRAFT" && i.status !== "CANCELLED" && (
                        <Button
                          size="xs"
                          variant="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollect({ contractId: i.contractId, invoiceId: i.id });
                          }}
                        >
                          Thu tiền
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <CollectPaymentModal open={!!collect} onClose={() => setCollect(null)} contractId={collect?.contractId} invoiceId={collect?.invoiceId} />
    </div>
  );
}
