import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Calculator, CheckCircle2, Equal, Loader2, LogOut, Minus, PartyPopper, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@/api";
import type { Deduction } from "@/api/types";
import { checkoutStatus } from "@/api/labels";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Field, Input, MoneyInput } from "@/components/ui/form";
import { PageLoader } from "@/components/PageLoader";
import { CountUp, fireConfetti, GradientBorder } from "@/components/fx";
import { useApiMutation } from "@/lib/query";
import { cn, money } from "@/lib/format";
import { fmtDate, fmtDateTime, today } from "@/lib/date";

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function Line({ icon: Icon, label, value, tone, sub, delay = 0, big }: { icon: typeof Plus; label: string; value: number; tone: string; sub?: string; delay?: number; big?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3", big ? "bg-slate-900 text-white dark:bg-white/10" : "bg-slate-50 dark:bg-white/[0.03]")}>
      <div className={cn("flex size-8 items-center justify-center rounded-full", tone)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium", big ? "text-white" : "text-slate-700 dark:text-slate-300")}>{label}</div>
        {sub && <div className={cn("text-xs", big ? "text-white/60" : "text-slate-500")}>{sub}</div>}
      </div>
      <div className={cn("num font-bold", big ? "text-xl" : "text-base text-slate-900 dark:text-white")}>
        <CountUp value={value} format={(n) => money(n)} duration={0.6} />
      </div>
    </motion.div>
  );
}

export default function Checkout() {
  const id = Number(useParams().id);
  const { data: c, isLoading } = useQuery({ queryKey: ["contract", id], queryFn: () => api.contracts.get(id) });
  const [date, setDate] = useState(today());
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [confirm, setConfirm] = useState(false);
  const dDed = useDebounced(deductions);
  const dDate = useDebounced(date);
  const live = c && (c.status === "ACTIVE" || c.status === "EXPIRED");
  const { data: p, isFetching } = useQuery({
    queryKey: ["checkout-preview", id, dDate, dDed],
    queryFn: () => api.checkouts.preview(id, { checkoutDate: dDate, deductions: dDed }),
    enabled: !!live,
    placeholderData: keepPreviousData,
  });
  const m = useApiMutation(() => api.checkouts.confirm(id, { checkoutDate: date, deductions }), {
    onSuccess: (r) => {
      setConfirm(false);
      if (!r.duplicated) fireConfetti();
    },
    success: (r) => (r.duplicated ? "Quyết toán đã được xác nhận trước đó — không hoàn cọc lần hai (AC-012-04)." : "Đã quyết toán trả phòng thành công"),
  });

  if (isLoading || !c) return <PageLoader />;
  const done = c.checkout?.status === "CONFIRMED" ? c.checkout : m.data?.checkout;

  if (done) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link to={`/app/contracts/${c.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="size-4" /> Hợp đồng {c.code}
        </Link>
        <GradientBorder className="shadow-2xl shadow-brand-500/10">
          <div className="p-8 text-center">
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-800 text-white">
              <PartyPopper className="size-10" />
            </motion.div>
            <h1 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">Đã quyết toán phòng {c.room.code}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ngày trả {fmtDate(done.checkoutDate)} · xác nhận {fmtDateTime(done.confirmedAt)} · <StatusBadge map={checkoutStatus} value={done.status} />
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-500/10 p-5 ring-1 ring-emerald-500/20">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  <ArrowUpFromLine className="size-4" /> Hoàn lại người thuê
                </div>
                <div className="mt-2 text-3xl font-extrabold text-emerald-600">
                  <CountUp value={done.refundAmount} format={(n) => money(n)} />
                </div>
              </div>
              <div className="rounded-2xl bg-rose-500/10 p-5 ring-1 ring-rose-500/20">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                  <ArrowDownToLine className="size-4" /> Phải thu thêm
                </div>
                <div className="mt-2 text-3xl font-extrabold text-rose-600">
                  <CountUp value={done.extraCharge} format={(n) => money(n)} />
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left text-sm sm:grid-cols-4">
              {[
                ["Nợ còn lại", done.outstandingDebt],
                ["Khấu trừ", done.extraDeductions],
                ["Cọc khả dụng", done.depositAvailable],
                ["Cọc đã cấn", done.depositUsed],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                  <div className="text-xs text-slate-500">{l}</div>
                  <div className="num font-bold text-slate-900 dark:text-white">{money(v as number)}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="secondary" to={`/app/contracts/${c.id}`}>
                Về hợp đồng
              </Button>
              <Button to="/app/rooms">Về sơ đồ phòng</Button>
            </div>
          </div>
        </GradientBorder>
      </div>
    );
  }

  if (!live) return <EmptyState title="Hợp đồng không còn hiệu lực" description="Chỉ trả phòng được hợp đồng đang hiệu lực hoặc vừa hết hạn." action={<Button to={`/app/contracts/${c.id}`}>Về hợp đồng</Button>} />;

  const refund = p?.refundAmount ?? 0;
  const extra = p?.extraCharge ?? 0;

  return (
    <div>
      <Link to={`/app/contracts/${c.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <ArrowLeft className="size-4" /> Hợp đồng {c.code}
      </Link>
      <PageHeader eyebrow="EP08 · US-012" title={`Trả phòng ${c.room.code}`} description={`${c.representative.fullName} · ${c.propertyName}`} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="p-5">
            <Field label="Ngày trả phòng" hint="Nên chốt chỉ số cuối và lập hóa đơn kỳ cuối trước khi quyết toán">
              <Input type="date" value={date} min={c.startDate} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </Card>
          <Card>
            <CardHeader title="Khấu trừ đã được duyệt" subtitle="Hư hỏng chưa duyệt không được tự trừ cọc (AC-006-03)" action={<Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setDeductions((d) => [...d, { description: "", amount: 0 }])}>Thêm</Button>} />
            <div className="space-y-2 px-5 pb-5">
              {deductions.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10">Không có khấu trừ — tài sản bàn giao đầy đủ.</p>}
              <AnimatePresence>
                {deductions.map((d, i) => (
                  <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2">
                    <Input className="flex-1" placeholder="Ví dụ: Vỡ kính cửa sổ" value={d.description} onChange={(e) => setDeductions((s) => s.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                    <div className="w-36">
                      <MoneyInput value={d.amount} onChange={(v) => setDeductions((s) => s.map((x, j) => (j === i ? { ...x, amount: v } : x)))} />
                    </div>
                    <button onClick={() => setDeductions((s) => s.filter((_, j) => j !== i))} className="mt-2 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Xóa">
                      <Trash2 className="size-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Vệ sinh phòng", "Thay bóng đèn", "Sơn lại tường", "Mất chìa khóa"].map((s) => (
                  <button key={s} onClick={() => setDeductions((d) => [...d, { description: s, amount: s === "Sơn lại tường" ? 500_000 : s === "Vệ sinh phòng" ? 200_000 : 100_000 }])} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:text-slate-400">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="sticky top-24 overflow-hidden">
            <CardHeader title="Bảng quyết toán" subtitle="Tính trực tiếp từ công nợ và sổ cọc" icon={<Calculator className="size-5" />} action={isFetching && <Loader2 className="size-4 animate-spin text-brand-500" />} />
            <div className="space-y-2 px-5">
              <Line icon={Plus} label="Công nợ chưa thanh toán" sub="Tổng hóa đơn còn nợ sau phân bổ" value={p?.outstandingDebt ?? 0} tone="bg-rose-500/15 text-rose-600" />
              <Line icon={Plus} label="Khấu trừ được duyệt" sub={`${deductions.filter((d) => d.amount > 0).length} khoản`} value={p?.extraDeductions ?? 0} tone="bg-orange-500/15 text-orange-600" delay={0.05} />
              <Line icon={Equal} label="Tổng nghĩa vụ" value={p?.totalObligation ?? 0} tone="bg-white/15 text-white" big delay={0.1} />
              <Line icon={ShieldCheck} label="Cọc khả dụng" sub="Nhận − cấn trừ − đã hoàn" value={p?.depositAvailable ?? 0} tone="bg-amber-500/15 text-amber-600" delay={0.15} />
              <Line icon={Minus} label="Dùng cọc để cấn nợ" sub="= min(cọc khả dụng, tổng nghĩa vụ)" value={p?.depositUsed ?? 0} tone="bg-sky-500/15 text-sky-600" delay={0.2} />
            </div>
            <div className="mt-4 grid gap-3 p-5 sm:grid-cols-2">
              <motion.div animate={{ opacity: refund > 0 ? 1 : 0.55 }} className="rounded-2xl bg-emerald-800 p-5 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <ArrowUpFromLine className="size-4" /> Hoàn cọc cho người thuê
                </div>
                <div className="mt-2 text-3xl font-extrabold">
                  <CountUp value={refund} format={(n) => money(n)} duration={0.6} />
                </div>
              </motion.div>
              <motion.div animate={{ opacity: extra > 0 ? 1 : 0.55 }} className="rounded-2xl bg-brand-700 p-5 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <ArrowDownToLine className="size-4" /> Phải thu thêm
                </div>
                <div className="mt-2 text-3xl font-extrabold">
                  <CountUp value={extra} format={(n) => money(n)} duration={0.6} />
                </div>
              </motion.div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="mb-3 flex items-start gap-2 text-xs text-slate-500">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                Cọc không bao giờ âm. Xác nhận lặp lại cũng không hoàn cọc lần hai. Phòng chỉ về Trống khi không còn yêu cầu bảo trì đang khóa.
              </div>
              <Button variant="glow" size="lg" className="w-full" icon={<LogOut className="size-5" />} onClick={() => setConfirm(true)}>
                Xác nhận quyết toán & trả phòng
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => m.mutate()}
        loading={m.isPending}
        title="Xác nhận trả phòng?"
        description={
          <span>
            Hợp đồng sẽ kết thúc, người ở được ghi ngày ra {fmtDate(date)}. {refund > 0 && <Badge tone="green">Hoàn {money(refund)}</Badge>} {extra > 0 && <Badge tone="red">Thu thêm {money(extra)}</Badge>}
          </span>
        }
        confirmLabel="Quyết toán"
      />
    </div>
  );
}
