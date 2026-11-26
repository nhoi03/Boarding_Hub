import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Ban, Banknote, CalendarDays, CreditCard, Plus, Search, Smartphone, Undo2, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/api";
import type { PaymentMethod, PaymentView } from "@/api/types";
import { paymentMethod } from "@/api/labels";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { Field, Input, MoneyInput, Segmented } from "@/components/ui/form";
import { TableSkeleton } from "@/components/PageLoader";
import { CollectPaymentModal } from "@/components/domain/CollectPayment";
import { CountUp, SpotlightCard, rise, stagger } from "@/components/fx";
import { fieldError, useApiMutation } from "@/lib/query";
import { cn, compactMoney, money } from "@/lib/format";
import { currentPeriod, fmtDateTime, localDate, periodOf, today } from "@/lib/date";

const methodIcon: Record<PaymentMethod, typeof Banknote> = { CASH: Banknote, BANK_TRANSFER: CreditCard, E_WALLET: Smartphone, OTHER: Wallet };
const methodColor: Record<PaymentMethod, string> = { CASH: "#10b981", BANK_TRANSFER: "#6366f1", E_WALLET: "#06b6d4", OTHER: "#94a3b8" };

function RefundModal({ p, onClose }: { p: PaymentView | null; onClose: () => void }) {
  const [amount, setAmount] = useState(0);
  const m = useApiMutation((v: number) => api.payments.refund(p!.id, v), {
    success: "Đã ghi hoàn tiền dư",
    onSuccess: () => {
      setAmount(0);
      onClose();
    },
  });
  return (
    <Modal
      open={!!p}
      onClose={onClose}
      size="sm"
      icon={<Undo2 className="size-5" />}
      title="Hoàn tiền dư"
      description={p ? `Phiếu ${p.code} còn ${money(p.unallocated)} chưa phân bổ (US-011, BR-012).` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={m.isPending} disabled={!amount} onClick={() => m.mutate(amount)}>
            Xác nhận hoàn
          </Button>
        </>
      }
    >
      <Field label="Số tiền hoàn" error={fieldError(m.error, "amount")}>
        <MoneyInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      {p && (
        <button className="mt-2 text-xs font-medium text-brand-600 hover:underline" onClick={() => setAmount(p.unallocated)}>
          Hoàn toàn bộ {money(p.unallocated)}
        </button>
      )}
    </Modal>
  );
}

export default function Payments() {
  const [params, setParams] = useSearchParams();
  const [method, setMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [voiding, setVoiding] = useState<PaymentView | null>(null);
  const [refund, setRefund] = useState<PaymentView | null>(null);
  const { data: all = [], isLoading } = useQuery({ queryKey: ["payments"], queryFn: () => api.payments.list() });
  const voidM = useApiMutation(({ id, reason }: { id: number; reason: string }) => api.payments.void(id, reason), {
    success: "Đã hủy phiếu thu — các hóa đơn liên quan được tính lại",
    onSuccess: () => setVoiding(null),
  });
  const newOpen = params.get("new") === "1";
  const closeNew = () => {
    const p = new URLSearchParams(params);
    p.delete("new");
    setParams(p, { replace: true });
  };

  const ok = all.filter((p) => p.status === "CONFIRMED");
  const stats = useMemo(() => {
    const t = today();
    const per = currentPeriod();
    return {
      today: ok.filter((p) => localDate(p.receivedAt) === t).reduce((s, p) => s + p.amount, 0),
      month: ok.filter((p) => periodOf(localDate(p.receivedAt)) === per).reduce((s, p) => s + p.amount, 0),
      count: ok.filter((p) => periodOf(localDate(p.receivedAt)) === per).length,
      unallocated: ok.reduce((s, p) => s + p.unallocated, 0),
      byMethod: (["BANK_TRANSFER", "CASH", "E_WALLET", "OTHER"] as PaymentMethod[])
        .map((m) => ({ method: m, name: paymentMethod[m], value: ok.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0) }))
        .filter((x) => x.value > 0),
    };
  }, [ok]);

  const shown = all.filter((p) => (method === "ALL" || p.method === method) && (!q || `${p.code} ${p.roomCode} ${p.payerName} ${p.reference ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  const kpis = [
    { label: "Thu hôm nay", value: stats.today, icon: CalendarDays, tone: "from-emerald-800 to-emerald-600" },
    { label: "Thu tháng này", value: stats.month, icon: Wallet, tone: "from-brand-700 to-brand-500", sub: `${stats.count} phiếu` },
    { label: "Tiền dư chưa phân bổ", value: stats.unallocated, icon: Undo2, tone: "from-amber-500 to-orange-500", sub: "Có thể hoàn hoặc trừ kỳ sau" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="EP07 · US-011"
        title="Phiếu thu"
        description="Không sửa hay xóa phiếu đã ghi — chỉ hủy kèm lý do để bảo toàn lịch sử tiền (BR-011)."
        actions={
          <Button variant="glow" icon={<Plus className="size-4" />} onClick={() => setParams({ new: "1" })}>
            Ghi phiếu thu
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
          {kpis.map((k) => (
            <motion.div key={k.label} variants={rise}>
              <SpotlightCard className="h-full p-5">
                <div className={cn("mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", k.tone)}>
                  <k.icon className="size-5" />
                </div>
                <div className="text-xs font-medium text-slate-500">{k.label}</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                  <CountUp value={k.value} format={(n) => compactMoney(n)} />
                </div>
                {k.sub && <div className="mt-0.5 text-xs text-slate-400">{k.sub}</div>}
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
        <Card className="flex items-center gap-3 p-4">
          <div className="size-28 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.byMethod} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50} paddingAngle={3} stroke="none">
                  {stats.byMethod.map((m) => (
                    <Cell key={m.method} fill={methodColor[m.method]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="min-w-0 space-y-1.5 text-xs">
            {stats.byMethod.map((m) => (
              <div key={m.method} className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: methodColor[m.method] }} />
                <span className="truncate text-slate-600 dark:text-slate-400">{m.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Sổ phiếu thu" subtitle={`${shown.length} phiếu`} />
        <div className="flex flex-col gap-3 px-3 pb-3 sm:flex-row sm:items-center">
          <Segmented
            layoutId="pay-method"
            value={method}
            onChange={setMethod}
            options={[
              { value: "ALL", label: "Tất cả" },
              { value: "BANK_TRANSFER", label: "Chuyển khoản" },
              { value: "CASH", label: "Tiền mặt" },
              { value: "E_WALLET", label: "Ví" },
            ]}
          />
          <div className="sm:ml-auto sm:w-72">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mã phiếu, phòng, người nộp, mã GD…" icon={<Search className="size-4" />} />
          </div>
        </div>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : shown.length === 0 ? (
          <EmptyState icon={<Wallet className="size-6" />} title="Chưa có phiếu thu" action={<Button onClick={() => setParams({ new: "1" })}>Ghi phiếu thu đầu tiên</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Phiếu</th>
                  <th>Phòng / Người nộp</th>
                  <th>Phương thức</th>
                  <th className="text-right">Số tiền</th>
                  <th>Phân bổ</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((p, i) => {
                  const Icon = methodIcon[p.method];
                  const voided = p.status === "VOIDED";
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.02 }} className={cn(voided && "opacity-60")}>
                      <td>
                        <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{p.code}</div>
                        <div className="text-xs text-slate-500">{fmtDateTime(p.receivedAt)}</div>
                      </td>
                      <td>
                        <Link to={`/app/contracts/${p.contractId}`} className="font-semibold text-slate-900 hover:text-brand-600 dark:text-white">
                          {p.roomCode}
                        </Link>
                        <div className="text-xs text-slate-500">{p.payerName}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg" style={{ background: `${methodColor[p.method]}1f`, color: methodColor[p.method] }}>
                            <Icon className="size-3.5" />
                          </span>
                          <div>
                            <div className="text-sm">{paymentMethod[p.method]}</div>
                            {p.reference && <div className="font-mono text-[11px] text-slate-400">{p.reference}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={cn("num text-right font-bold", voided ? "text-slate-400 line-through" : "text-emerald-600")}>{money(p.amount)}</td>
                      <td>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{p.allocations.filter((a) => a.status === "ACTIVE").length} hóa đơn</div>
                        {!voided && p.unallocated > 0 && <Badge tone="amber">Dư {money(p.unallocated)}</Badge>}
                        {p.refundedAmount > 0 && <Badge tone="violet">Đã hoàn {money(p.refundedAmount)}</Badge>}
                      </td>
                      <td>
                        {voided ? (
                          <div>
                            <Badge tone="red" dot>
                              Đã hủy
                            </Badge>
                            <div className="mt-1 max-w-[180px] truncate text-[11px] text-slate-500" title={p.voidReason}>
                              {p.voidReason}
                            </div>
                          </div>
                        ) : (
                          <Badge tone="green" dot>
                            Hợp lệ
                          </Badge>
                        )}
                      </td>
                      <td>
                        {!voided && (
                          <div className="flex justify-end gap-1">
                            {p.unallocated > 0 && (
                              <Button size="xs" variant="secondary" icon={<Undo2 className="size-3.5" />} onClick={() => setRefund(p)}>
                                Hoàn dư
                              </Button>
                            )}
                            <Button size="xs" variant="ghost" className="text-rose-600" icon={<Ban className="size-3.5" />} onClick={() => setVoiding(p)}>
                              Hủy
                            </Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CollectPaymentModal open={newOpen} onClose={closeNew} />
      <RefundModal p={refund} onClose={() => setRefund(null)} />
      <ConfirmDialog
        open={!!voiding}
        onClose={() => setVoiding(null)}
        onConfirm={(reason) => voiding && voidM.mutate({ id: voiding.id, reason })}
        loading={voidM.isPending}
        danger
        requireReason
        title={`Hủy phiếu ${voiding?.code ?? ""}?`}
        description={voiding ? `${money(voiding.amount)} sẽ được đảo khỏi các hóa đơn đã phân bổ. Phiếu vẫn còn trong sổ để đối soát.` : undefined}
        confirmLabel="Hủy phiếu thu"
      />
    </div>
  );
}
