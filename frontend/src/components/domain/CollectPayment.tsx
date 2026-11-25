import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Banknote, CheckCircle2, CreditCard, Info, Smartphone, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import type { ID, PaymentMethod } from "@/api/types";
import { invoiceStatus } from "@/api/labels";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Segmented } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/primitives";
import { fireConfetti } from "@/components/fx";
import { useApiMutation, fieldError } from "@/lib/query";
import { cn, money, uid } from "@/lib/format";
import { fmtDate, periodLabel } from "@/lib/date";
import { useUI } from "@/stores/ui";

const methods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "BANK_TRANSFER", label: "Chuyển khoản", icon: CreditCard },
  { value: "CASH", label: "Tiền mặt", icon: Banknote },
  { value: "E_WALLET", label: "Ví điện tử", icon: Smartphone },
];

export function CollectPaymentModal({ open, onClose, contractId: fixedContract, invoiceId }: { open: boolean; onClose: () => void; contractId?: ID; invoiceId?: ID }) {
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [contractId, setContractId] = useState<ID | undefined>(fixedContract);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manual, setManual] = useState<Record<ID, number>>({});
  const [key, setKey] = useState(() => uid("pay-"));

  useEffect(() => {
    if (open) {
      setContractId(fixedContract);
      setAmount(0);
      setReference("");
      setMode(invoiceId ? "manual" : "auto");
      setManual({});
      setKey(uid("pay-"));
    }
  }, [open, fixedContract, invoiceId]);

  const { data: contracts = [] } = useQuery({ queryKey: ["contracts", "ACTIVE", propertyId], queryFn: () => api.contracts.list({ status: "ACTIVE", propertyId }), enabled: open && !fixedContract });
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", "unpaid", contractId],
    queryFn: () => api.invoices.list({ contractId, status: "UNPAID" }),
    enabled: open && !!contractId,
  });
  const open_ = useMemo(() => [...invoices].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")), [invoices]);
  const debt = open_.reduce((s, i) => s + i.balance, 0);

  useEffect(() => {
    if (!open || !open_.length) return;
    if (invoiceId) {
      const inv = open_.find((i) => i.id === invoiceId);
      if (inv) {
        setManual({ [inv.id]: inv.balance });
        setAmount(inv.balance);
      }
    } else setAmount((a) => a || debt);
  }, [open, open_, invoiceId, debt]);

  const preview = useMemo(() => {
    if (mode === "manual") return open_.map((i) => ({ inv: i, take: Math.min(manual[i.id] ?? 0, i.balance) }));
    let left = amount;
    return open_.map((i) => {
      const take = Math.max(0, Math.min(left, i.balance));
      left -= take;
      return { inv: i, take };
    });
  }, [mode, open_, manual, amount]);
  const allocated = preview.reduce((s, p) => s + p.take, 0);
  const leftover = amount - allocated;

  const m = useApiMutation(api.payments.create, {
    onSuccess: (r) => {
      if (r.duplicated) {
        toast.info(`Giao dịch ${r.payment.code} đã được ghi trước đó — không ghi lần hai (AC-011-02).`);
      } else if (r.paidInvoiceNos.length) {
        fireConfetti();
        toast.success(`Đã thu ${money(r.payment.amount)} — ${r.paidInvoiceNos.join(", ")} đã thu đủ! 🎉`);
      } else toast.success(`Đã ghi phiếu thu ${r.payment.code}: ${money(r.payment.amount)}`);
      onClose();
    },
  });

  const submit = () => {
    if (!contractId) return;
    m.mutate({
      contractId,
      amount,
      method,
      reference,
      idempotencyKey: key,
      allocations: mode === "manual" ? preview.filter((p) => p.take > 0).map((p) => ({ invoiceId: p.inv.id, amount: p.take })) : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Wallet className="size-5" />}
      title="Ghi phiếu thu"
      description="Tiền được phân bổ vào hóa đơn cũ nhất trước. Phần dư được giữ riêng, không tự cộng vào kỳ sau."
      footer={
        <>
          <div className="mr-auto hidden text-xs text-slate-500 sm:block">
            Khóa chống lặp: <span className="font-mono">{key.slice(0, 14)}…</span>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="success" loading={m.isPending} disabled={!contractId || amount <= 0 || (mode === "manual" && allocated === 0)} onClick={submit} icon={<CheckCircle2 className="size-4" />}>
            Xác nhận thu {amount > 0 ? money(amount) : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!fixedContract && (
          <Field label="Phòng / hợp đồng" required>
            <Select value={contractId ?? ""} onChange={(e) => setContractId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">— Chọn phòng —</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.room.code} · {c.propertyName.replace("BoardingHub ", "")} · {c.representative.fullName} {c.balance > 0 ? `· nợ ${money(c.balance)}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {contractId && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Số tiền thu" required error={fieldError(m.error, "amount")} hint={debt ? `Tổng còn nợ: ${money(debt)}` : "Hợp đồng không còn nợ — tiền sẽ ghi là tiền dư."}>
                <MoneyInput value={amount} onChange={setAmount} autoFocus className="text-lg" />
              </Field>
              <Field label="Mã giao dịch / ghi chú" hint="Ví dụ mã chuyển khoản ngân hàng">
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="FT2611…" />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {debt > 0 &&
                [debt, Math.round(debt / 2 / 10000) * 10000, 1_000_000, 500_000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                  <button key={v} onClick={() => setAmount(v)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", amount === v ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300")}>
                    {v === debt ? `Toàn bộ ${money(v)}` : money(v)}
                  </button>
                ))}
            </div>
            <Field label="Hình thức">
              <div className="grid grid-cols-3 gap-2">
                {methods.map((x) => (
                  <button
                    key={x.value}
                    type="button"
                    onClick={() => setMethod(x.value)}
                    className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition", method === x.value ? "border-brand-500 bg-brand-500/5 text-brand-700 ring-2 ring-brand-500/20 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-400")}
                  >
                    <x.icon className="size-5" />
                    {x.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Phân bổ vào hóa đơn</div>
                <Segmented
                  layoutId="alloc-mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "auto", label: "Tự động (cũ trước)" },
                    { value: "manual", label: "Chọn tay" },
                  ]}
                />
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {isLoading && <div className="p-4 text-sm text-slate-500">Đang tải hóa đơn…</div>}
                {!isLoading && open_.length === 0 && <div className="p-4 text-sm text-slate-500">Không có hóa đơn còn nợ.</div>}
                {preview.map(({ inv, take }) => (
                  <div key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                        {inv.invoiceNo}
                        <StatusBadge map={invoiceStatus} value={inv.status} />
                        {inv.overdue && <Badge tone="red">Quá hạn</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {inv.period ? periodLabel(inv.period) : "Hóa đơn trả phòng"} · hạn {fmtDate(inv.dueDate)} · còn nợ <b>{money(inv.balance)}</b>
                      </div>
                    </div>
                    {mode === "manual" ? (
                      <div className="w-40">
                        <MoneyInput value={manual[inv.id] ?? 0} onChange={(v) => setManual((s) => ({ ...s, [inv.id]: Math.min(v, inv.balance) }))} className="h-9" />
                      </div>
                    ) : (
                      <div className={cn("num text-sm font-semibold", take > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>{take > 0 ? `+ ${money(take)}` : "—"}</div>
                    )}
                  </div>
                ))}
              </div>
              <AnimatePresence>
                {amount > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-white/[0.03]">
                      <span className="text-slate-600 dark:text-slate-400">
                        Phân bổ <b className="text-slate-900 dark:text-white">{money(allocated)}</b>
                      </span>
                      {leftover > 0 ? (
                        <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                          <Info className="size-4" /> Tiền dư {money(leftover)} — giữ riêng để hoàn hoặc trừ sau (AC-011-03)
                        </span>
                      ) : leftover < 0 ? (
                        <span className="font-medium text-rose-600">Tổng phân bổ lớn hơn số tiền thu</span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="size-4" /> Khớp hoàn toàn
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
