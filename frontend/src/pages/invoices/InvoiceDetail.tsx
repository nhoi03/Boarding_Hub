import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, Ban, Building2, Calculator, Droplets, Home, Printer, QrCode, Send, SlidersHorizontal, Wallet, Wifi, Wrench, Zap } from "lucide-react";
import { api } from "@/api";
import type { InvoiceItemKind } from "@/api/types";
import { invoiceStatus, paymentMethod } from "@/api/labels";
import { Badge, Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { Field, MoneyInput, Segmented, Textarea } from "@/components/ui/form";
import { PageLoader } from "@/components/PageLoader";
import { CollectPaymentModal } from "@/components/domain/CollectPayment";
import { CountUp } from "@/components/fx";
import { FakeQR } from "@/components/domain/FakeQR";
import { fieldError, useApiMutation } from "@/lib/query";
import { cn, money, num } from "@/lib/format";
import { fmtDate, fmtDateTime, periodLabel } from "@/lib/date";

const kindIcon: Record<InvoiceItemKind, typeof Home> = { RENT: Home, ELECTRIC: Zap, WATER: Droplets, SERVICE: Wifi, DAMAGE: Wrench, OTHER: Calculator };
const kindTone: Record<InvoiceItemKind, string> = {
  RENT: "bg-indigo-500/10 text-indigo-600",
  ELECTRIC: "bg-amber-400/15 text-amber-600",
  WATER: "bg-sky-400/15 text-sky-600",
  SERVICE: "bg-violet-500/10 text-violet-600",
  DAMAGE: "bg-rose-500/10 text-rose-600",
  OTHER: "bg-slate-500/10 text-slate-600",
};

function AdjustModal({ open, onClose, invoiceId }: { open: boolean; onClose: () => void; invoiceId: number }) {
  const [sign, setSign] = useState<"plus" | "minus">("minus");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const m = useApiMutation(() => api.invoices.addAdjustment(invoiceId, { amount: sign === "minus" ? -amount : amount, reason }), {
    success: "Đã ghi điều chỉnh — hóa đơn gốc vẫn được giữ nguyên",
    onSuccess: () => {
      setAmount(0);
      setReason("");
      onClose();
    },
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<SlidersHorizontal className="size-5" />}
      title="Điều chỉnh hóa đơn"
      description="Không sửa đè hóa đơn đã phát hành; mọi thay đổi là một dòng điều chỉnh có lý do (AC-010-03)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={m.isPending} disabled={!amount || !reason.trim()} onClick={() => m.mutate(undefined)}>
            Ghi điều chỉnh
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          layoutId="adj-sign"
          value={sign}
          onChange={setSign}
          options={[
            { value: "minus", label: "Giảm trừ" },
            { value: "plus", label: "Thu thêm" },
          ]}
        />
        <Field label="Số tiền" required error={fieldError(m.error, "amount")}>
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        <Field label="Lý do" required error={fieldError(m.error, "reason")}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Giảm 50.000đ do mất nước 2 ngày" />
        </Field>
      </div>
    </Modal>
  );
}

export default function InvoiceDetail() {
  const id = Number(useParams().id);
  const { data: inv, isLoading, error } = useQuery({ queryKey: ["invoice", id], queryFn: () => api.invoices.get(id) });
  const [collect, setCollect] = useState(false);
  const [adjust, setAdjust] = useState(false);
  const [cancel, setCancel] = useState(false);
  const issue = useApiMutation(() => api.invoices.issue(id), { success: (i) => `Đã phát hành ${i.invoiceNo}, hạn đóng ${fmtDate(i.dueDate)}` });
  const cancelM = useApiMutation((reason: string) => api.invoices.cancel(id, reason), { success: "Đã hủy hóa đơn", onSuccess: () => setCancel(false) });

  if (isLoading) return <PageLoader />;
  if (!inv) return <EmptyState title="Không tìm thấy hóa đơn" description={error ? String((error as Error).message) : undefined} action={<Button to="/app/invoices">Về danh sách</Button>} />;

  const live = inv.status !== "DRAFT" && inv.status !== "CANCELLED";
  const adjTotal = inv.adjustments.reduce((s, a) => s + a.amount, 0);
  const pct = inv.total ? inv.paid / inv.total : 0;
  const transferNote = `${inv.invoiceNo} ${inv.roomCode}`;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/invoices" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="size-4" /> Hóa đơn
        </Link>
        <div className="flex flex-wrap gap-2">
          {inv.status === "DRAFT" && (
            <Button variant="glow" icon={<Send className="size-4" />} loading={issue.isPending} onClick={() => issue.mutate(undefined)}>
              Phát hành
            </Button>
          )}
          {live && inv.balance > 0 && (
            <Button variant="success" icon={<Wallet className="size-4" />} onClick={() => setCollect(true)}>
              Thu tiền
            </Button>
          )}
          {live && (
            <Button variant="secondary" icon={<SlidersHorizontal className="size-4" />} onClick={() => setAdjust(true)}>
              Điều chỉnh
            </Button>
          )}
          <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
            In
          </Button>
          {inv.status !== "CANCELLED" && (
            <Button variant="ghost" className="text-rose-600" icon={<Ban className="size-4" />} onClick={() => setCancel(true)}>
              Hủy
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 lg:col-span-2">
          <Card className="print-area overflow-hidden">
            <div className="relative overflow-hidden bg-brand-700 p-6 text-white">
              <div className="absolute -top-10 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Building2 className="size-4" /> BoardingHub
                  </div>
                  <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Hóa đơn {inv.period ? periodLabel(inv.period) : ""}</h1>
                  <div className="mt-1 font-mono text-sm text-white/80">{inv.invoiceNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/70">Tổng phải trả</div>
                  <div className="text-3xl font-extrabold">
                    <CountUp value={inv.total} format={(n) => money(n)} />
                  </div>
                  <div className="mt-1">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{invoiceStatus[inv.status].label}</span>
                  </div>
                </div>
              </div>
              <div className="relative mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {[
                  ["Phòng", inv.roomCode],
                  ["Người thuê", inv.representativeName],
                  ["Phát hành", inv.issuedAt ? fmtDate(inv.issuedAt) : "Chưa"],
                  ["Hạn đóng", inv.dueDate ? fmtDate(inv.dueDate) : "—"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-xs text-white/60">{l}</div>
                    <div className="font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto p-2 sm:p-4">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Khoản</th>
                    <th className="text-right">SL</th>
                    <th className="text-right">Đơn giá</th>
                    <th className="text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((it, i) => {
                    const Icon = kindIcon[it.kind] ?? Calculator;
                    return (
                      <motion.tr key={it.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                        <td className="min-w-[240px] whitespace-normal">
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", kindTone[it.kind])}>
                              <Icon className="size-4" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{it.description}</div>
                              {it.formula && <div className="mt-0.5 font-mono text-[11px] text-slate-500">{it.formula}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="num text-right">
                          {num(it.quantity)} <span className="text-xs text-slate-400">{it.unit}</span>
                        </td>
                        <td className="num text-right">{money(it.unitPrice)}</td>
                        <td className="num text-right font-semibold">{money(it.amount)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-2 ml-auto max-w-sm space-y-1.5 px-4 pb-4 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Tạm tính</span>
                  <span className="num">{money(inv.subtotal)}</span>
                </div>
                {inv.adjustments.map((a) => (
                  <div key={a.id} className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Điều chỉnh: <i>{a.reason}</i>
                    </span>
                    <span className={cn("num shrink-0", a.amount < 0 ? "text-emerald-600" : "text-rose-600")}>
                      {a.amount > 0 ? "+" : ""}
                      {money(a.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-white/10 dark:text-white">
                  <span>Tổng cộng</span>
                  <span className="num">{money(inv.total)}</span>
                </div>
                {live && (
                  <>
                    <div className="flex justify-between text-emerald-600">
                      <span>Đã thanh toán</span>
                      <span className="num">− {money(inv.paid)}</span>
                    </div>
                    <div className={cn("flex justify-between text-lg font-extrabold", inv.balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                      <span>Còn phải trả</span>
                      <span className="num">{money(inv.balance)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="no-print space-y-6">
          {live && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Tiến độ thanh toán</span>
                <span className="num text-sm font-bold text-brand-600">{Math.round(pct * 100)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
              </div>
              {inv.overdue && (
                <Badge tone="red" className="mt-3">
                  Quá hạn từ {fmtDate(inv.dueDate)}
                </Badge>
              )}
            </Card>
          )}

          {live && inv.balance > 0 && (
            <Card className="p-5 text-center">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <QrCode className="size-4 text-brand-500" /> Quét để chuyển khoản
              </div>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10">
                <FakeQR text={`${transferNote}|${inv.balance}`} />
              </motion.div>
              <div className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">{money(inv.balance)}</div>
              <div className="mt-1 font-mono text-xs text-slate-500">Nội dung: {transferNote}</div>
              <p className="mt-2 text-[11px] text-slate-400">Minh họa — add-on VietQR sẽ tự đối soát giao dịch.</p>
            </Card>
          )}

          <Card>
            <CardHeader title="Lịch sử phân bổ" subtitle={`${inv.allocations.length} lần`} />
            <div className="px-5 pb-5">
              {inv.allocations.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có khoản thu nào được phân bổ.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-white/10">
                  {inv.allocations.map((a, i) => (
                    <motion.li key={`${a.paymentId}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                      <span className={cn("absolute top-1 -left-[26px] size-3 rounded-full ring-4 ring-white dark:ring-ink-900", a.status === "REVERSED" ? "bg-slate-400" : "bg-emerald-500")} />
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("num font-bold", a.status === "REVERSED" ? "text-slate-400 line-through" : "text-emerald-600")}>{money(a.amount)}</span>
                        {a.status === "REVERSED" && <Badge>Đã đảo</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">{a.paymentCode}</span> · {paymentMethod[a.method]} · {fmtDateTime(a.receivedAt)}
                      </div>
                    </motion.li>
                  ))}
                </ol>
              )}
            </div>
          </Card>

          <Card className="p-5 text-sm">
            <div className="mb-2 font-semibold text-slate-900 dark:text-white">Thông tin khác</div>
            <div className="space-y-1 text-slate-500">
              <div>
                Hợp đồng:{" "}
                <Link className="font-medium text-brand-600 hover:underline" to={`/app/contracts/${inv.contractId}`}>
                  {inv.contract.code}
                </Link>
              </div>
              <div>Loại: {inv.type === "PERIODIC" ? "Định kỳ" : inv.type === "CHECKOUT" ? "Trả phòng" : "Phát sinh"}</div>
              <div>
                Khóa chống trùng: <span className="font-mono text-xs">{inv.generationKey}</span>
              </div>
              {adjTotal !== 0 && <div>Tổng điều chỉnh: {money(adjTotal)}</div>}
              <div>
                Trạng thái: <StatusBadge map={invoiceStatus} value={inv.status} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <CollectPaymentModal open={collect} onClose={() => setCollect(false)} contractId={inv.contractId} invoiceId={inv.id} />
      <AdjustModal open={adjust} onClose={() => setAdjust(false)} invoiceId={inv.id} />
      <ConfirmDialog
        open={cancel}
        onClose={() => setCancel(false)}
        onConfirm={(r) => cancelM.mutate(r)}
        loading={cancelM.isPending}
        danger
        requireReason
        title={`Hủy hóa đơn ${inv.invoiceNo}?`}
        description="Hóa đơn đã có tiền phân bổ không thể hủy — hãy hủy phiếu thu hoặc lập điều chỉnh."
        confirmLabel="Hủy hóa đơn"
      />
    </div>
  );
}
