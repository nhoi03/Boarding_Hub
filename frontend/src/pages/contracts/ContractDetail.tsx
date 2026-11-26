import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  History,
  LogOut,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { api } from "@/api";
import type { ContractView, PaymentMethod } from "@/api/types";
import type { PersonInput } from "@/api/contract";
import { contractStatus, depositType, invoiceStatus, paymentMethod } from "@/api/labels";
import { useAuth } from "@/stores/auth";
import { Avatar, Badge, Card, CardHeader, EmptyState, InfoRow, PageHeader, ProgressBar, ProgressRing, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/form";
import { PageLoader } from "@/components/PageLoader";
import { CollectPaymentModal } from "@/components/domain/CollectPayment";
import { CountUp } from "@/components/fx";
import { useApiMutation, fieldError } from "@/lib/query";
import { cn, money, uid } from "@/lib/format";
import { addMonths, addDays, daysBetween, fmtDate, fmtDateTime, periodLabel, today, periodStart, addPeriods, currentPeriod } from "@/lib/date";

type Tab = "overview" | "money" | "deposit" | "history";

export default function ContractDetail() {
  const id = Number(useParams().id);
  const isOwner = useAuth((s) => s.user?.role === "OWNER");
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<null | "extend" | "rent" | "deposit" | "occupant" | "collect" | "activate">(null);
  const [ending, setEnding] = useState<number | null>(null);
  const { data: c, isLoading, error } = useQuery({ queryKey: ["contract", id], queryFn: () => api.contracts.get(id) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices", { contractId: id }], queryFn: () => api.invoices.list({ contractId: id }) });
  const { data: payments = [] } = useQuery({ queryKey: ["payments", { contractId: id }], queryFn: () => api.payments.list({ contractId: id }) });
  const activate = useApiMutation(() => api.contracts.activate(id), { success: "Hợp đồng đã có hiệu lực", onSuccess: () => setModal(null) });
  const endOcc = useApiMutation((occId: number) => api.contracts.endOccupancy(occId, today()), { success: "Đã ghi nhận chuyển ra", onSuccess: () => setEnding(null) });

  if (error) return <EmptyState title="Không mở được hợp đồng" description={(error as Error).message} action={<Button to="/app/contracts">Về danh sách</Button>} />;
  if (isLoading || !c) return <PageLoader />;

  const live = c.status === "ACTIVE" || c.status === "EXPIRED";
  const total = Math.max(1, daysBetween(c.startDate, c.endDate));
  const elapsed = Math.min(total, Math.max(0, daysBetween(c.startDate, today())));
  const left = daysBetween(today(), c.endDate);
  const activeOcc = c.occupants.filter((o) => o.status === "ACTIVE" || o.status === "PLANNED");

  return (
    <div>
      <Link to="/app/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <ArrowLeft className="size-4" /> Hợp đồng
      </Link>
      <PageHeader
        eyebrow={`${c.propertyName} · ${c.code}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Phòng {c.room.code} <StatusBadge map={contractStatus} value={c.status} />
          </span>
        }
        description={`Đại diện: ${c.representative.fullName} · ${c.representative.phone}`}
        actions={
          <>
            {c.status === "DRAFT" && (
              <Button variant="glow" icon={<Zap className="size-4" />} onClick={() => setModal("activate")}>
                Kích hoạt
              </Button>
            )}
            {live && (
              <Button variant="success" icon={<Wallet className="size-4" />} onClick={() => setModal("collect")}>
                Thu tiền
              </Button>
            )}
            {live && isOwner && (
              <Button variant="secondary" icon={<CalendarPlus className="size-4" />} onClick={() => setModal("extend")}>
                Gia hạn
              </Button>
            )}
            {live && isOwner && (
              <Button variant="secondary" icon={<TrendingUp className="size-4" />} onClick={() => setModal("rent")}>
                Đổi giá
              </Button>
            )}
            {live && (
              <Button variant="outline" icon={<LogOut className="size-4" />} to={`/app/contracts/${c.id}/checkout`}>
                Trả phòng
              </Button>
            )}
            {c.status === "TERMINATED" && c.checkout && (
              <Button variant="secondary" to={`/app/contracts/${c.id}/checkout`}>
                Xem quyết toán
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: BadgeDollarSign, l: "Giá thuê hiện hành", v: c.currentRent, tone: "text-brand-600 dark:text-brand-300" },
          { icon: ReceiptText, l: "Công nợ", v: c.balance, tone: c.balance > 0 ? "text-rose-600" : "text-emerald-600" },
          { icon: PiggyBank, l: "Cọc khả dụng", v: c.depositAvailable, tone: "text-amber-600" },
          { icon: Users, l: "Người ở", v: activeOcc.length, tone: "text-slate-900 dark:text-white", raw: true },
        ].map((k, i) => (
          <motion.div key={k.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="flex items-center gap-4 p-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
                <k.icon className={cn("size-5", k.tone)} />
              </div>
              <div>
                <div className="text-xs text-slate-500">{k.l}</div>
                <div className={cn("text-xl font-bold", k.tone)}>{k.raw ? `${k.v}/${c.room.capacity}` : <CountUp value={k.v} format={(n) => money(n)} />}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs
        layoutId="contract-tabs"
        value={tab}
        onChange={setTab}
        className="mb-6"
        tabs={[
          { value: "overview", label: "Tổng quan", icon: <Users className="size-4" /> },
          { value: "money", label: "Hóa đơn & thu tiền", icon: <ReceiptText className="size-4" />, count: invoices.length },
          { value: "deposit", label: "Sổ cọc", icon: <PiggyBank className="size-4" />, count: c.deposits.length },
          { value: "history", label: "Lịch sử điều khoản", icon: <History className="size-4" />, count: c.versions.length + c.rentRates.length },
        ]}
      />

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5">
              <div className="flex flex-col items-center">
                <ProgressRing value={elapsed / total} size={150} stroke={12}>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{left >= 0 ? left : 0}</div>
                  <div className="text-xs text-slate-500">ngày còn lại</div>
                </ProgressRing>
              </div>
              <div className="mt-5 divide-y divide-slate-100 dark:divide-white/[0.05]">
                <InfoRow label="Bắt đầu" value={fmtDate(c.startDate)} />
                <InfoRow label="Kết thúc" value={fmtDate(c.endDate)} />
                <InfoRow label="Chốt kỳ" value={`Ngày ${c.billingAnchorDay} hằng tháng`} />
                <InfoRow label="Hạn đóng" value={`${c.paymentDueDays} ngày sau phát hành`} />
                <InfoRow label="Kích hoạt" value={fmtDateTime(c.activatedAt)} />
                {c.terminationReason && <InfoRow label="Kết thúc" value={c.terminationReason} />}
              </div>
            </Card>
            <Card className="min-w-0 lg:col-span-2">
              <CardHeader
                title="Người ở"
                subtitle="Mỗi lượt ở có ngày vào, ngày ra riêng — dùng cho tính phí theo người và Ngày Người"
                icon={<Users className="size-5" />}
                action={
                  live && (
                    <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" />} disabled={activeOcc.length >= c.room.capacity} onClick={() => setModal("occupant")}>
                      Thêm người
                    </Button>
                  )
                }
              />
              <div className="space-y-2 px-5 pb-5">
                {c.occupants.map((o, i) => (
                  <motion.div key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]", o.status === "ENDED" && "opacity-60")}>
                    <Avatar name={o.person.fullName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-slate-900 dark:text-white">{o.person.fullName}</span>
                        {o.role === "REPRESENTATIVE" && <Badge tone="blue">Đại diện</Badge>}
                        {o.status === "ENDED" && <Badge tone="violet">Đã chuyển ra</Badge>}
                        {o.status === "PLANNED" && <Badge>Dự kiến</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {o.person.phone} · vào {fmtDate(o.moveInDate)}
                        {o.moveOutDate && ` · ra ${fmtDate(o.moveOutDate)}`}
                      </div>
                    </div>
                    {live && o.status === "ACTIVE" && o.role !== "REPRESENTATIVE" && (
                      <Button size="xs" variant="ghost" icon={<UserMinus className="size-3.5" />} onClick={() => setEnding(o.id)}>
                        Chuyển ra
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "money" && (
          <div className="grid gap-6 xl:grid-cols-5">
            <Card className="overflow-hidden xl:col-span-3">
              <CardHeader title="Hóa đơn" icon={<ReceiptText className="size-5" />} />
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Số</th>
                      <th>Kỳ</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Tổng</th>
                      <th className="text-right">Đã thu</th>
                      <th className="text-right">Còn nợ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <Link to={`/app/invoices/${i.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-300">
                            {i.invoiceNo}
                          </Link>
                        </td>
                        <td>{i.period ? periodLabel(i.period) : "Trả phòng"}</td>
                        <td>
                          <StatusBadge map={invoiceStatus} value={i.status} />
                        </td>
                        <td className="num text-right">{money(i.total)}</td>
                        <td className="num text-right text-emerald-600">{money(i.paid)}</td>
                        <td className="num text-right font-semibold">{i.balance ? <span className="text-rose-600">{money(i.balance)}</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {invoices.length === 0 && <EmptyState title="Chưa có hóa đơn" />}
              </div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Phiếu thu" icon={<Wallet className="size-5" />} />
              <div className="space-y-2 px-5 pb-5">
                {payments.length === 0 && <p className="text-sm text-slate-500">Chưa có phiếu thu.</p>}
                {payments.map((p) => (
                  <div key={p.id} className={cn("flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]", p.status === "VOIDED" && "opacity-50")}>
                    <div className={cn("flex size-9 items-center justify-center rounded-xl", p.status === "VOIDED" ? "bg-slate-100 text-slate-400 dark:bg-white/5" : "bg-emerald-500/10 text-emerald-600")}>
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {p.code} {p.status === "VOIDED" && <Badge tone="red">Đã hủy</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {paymentMethod[p.method]} · {fmtDateTime(p.receivedAt)}
                      </div>
                    </div>
                    <div className={cn("num text-sm font-bold", p.status === "VOIDED" ? "text-slate-400 line-through" : "text-emerald-600")}>{money(p.amount)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "deposit" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5">
              <div className="text-sm text-slate-500">Cọc phải nộp</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{money(c.depositRequired)}</div>
              <ProgressBar className="mt-4" value={c.depositRequired ? c.depositReceived / c.depositRequired : 1} tone={c.depositReceived < c.depositRequired ? "amber" : "green"} />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Đã nhận {money(c.depositReceived)}</span>
                {c.depositReceived < c.depositRequired && <span className="font-semibold text-amber-600">Thiếu {money(c.depositRequired - c.depositReceived)}</span>}
              </div>
              <div className="mt-5 rounded-2xl bg-amber-500/5 p-4 ring-1 ring-amber-500/20">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">Cọc khả dụng = Nhận − Cấn trừ − Hoàn</div>
                <div className="mt-1 text-2xl font-extrabold text-amber-600">{money(c.depositAvailable)}</div>
              </div>
              {live && c.depositReceived < c.depositRequired && (
                <Button className="mt-4 w-full" icon={<CircleDollarSign className="size-4" />} onClick={() => setModal("deposit")}>
                  Nhận bổ sung cọc
                </Button>
              )}
            </Card>
            <Card className="min-w-0 lg:col-span-2">
              <CardHeader title="Sổ giao dịch cọc" subtitle="Chỉ thêm, không sửa — số dư luôn cộng lại từ các dòng này" icon={<PiggyBank className="size-5" />} />
              <div className="relative px-5 pb-5">
                <div className="absolute top-0 bottom-6 left-[38px] w-px bg-slate-200 dark:bg-white/10" />
                {c.deposits.map((t, i) => {
                  const plus = depositType[t.type].sign > 0;
                  return (
                    <motion.div key={t.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative flex items-center gap-4 py-3">
                      <div className={cn("relative z-10 flex size-9 items-center justify-center rounded-full ring-4 ring-white dark:ring-ink-900", plus ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>{plus ? "+" : "−"}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{depositType[t.type].label}</div>
                        <div className="text-xs text-slate-500">
                          {fmtDateTime(t.occurredAt)} · {t.note}
                        </div>
                      </div>
                      <div className={cn("num font-bold", plus ? "text-emerald-600" : "text-amber-600")}>
                        {plus ? "+" : "−"}
                        {money(t.amount)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "history" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Phiên bản thời hạn" subtitle="Gia hạn tạo phiên bản mới, giữ phiên bản cũ (AC-005-01)" icon={<CalendarPlus className="size-5" />} />
              <div className="space-y-3 px-5 pb-5">
                {[...c.versions].reverse().map((v, i) => (
                  <div key={v.no} className={cn("rounded-xl border p-3", i === 0 ? "border-brand-500/30 bg-brand-500/5" : "border-slate-100 dark:border-white/[0.06]")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">Phiên bản {v.no}</span>
                      {i === 0 && <Badge tone="blue">Hiện hành</Badge>}
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Kết thúc {fmtDate(v.endDate)} · {v.note}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {v.createdBy} · {fmtDateTime(v.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="Lịch sử giá thuê" subtitle="Giá có ngày hiệu lực; hóa đơn đã chốt không đổi (AC-005-02)" icon={<TrendingUp className="size-5" />} />
              <div className="space-y-3 px-5 pb-5">
                {c.rentRates.map((r, i) => (
                  <div key={r.id} className={cn("flex items-center gap-3 rounded-xl border p-3", i === 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-100 dark:border-white/[0.06]")}>
                    <div className="min-w-0 flex-1">
                      <div className="num font-bold text-slate-900 dark:text-white">{money(r.amount)}</div>
                      <div className="text-xs text-slate-500">
                        Từ {fmtDate(r.effectiveFrom)} · {r.reason}
                      </div>
                    </div>
                    {i === 0 && <Badge tone="green">Mới nhất</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </motion.div>

      <CollectPaymentModal open={modal === "collect"} onClose={() => setModal(null)} contractId={c.id} />
      <ExtendModal open={modal === "extend"} onClose={() => setModal(null)} c={c} />
      <RentModal open={modal === "rent"} onClose={() => setModal(null)} c={c} />
      <DepositModal open={modal === "deposit"} onClose={() => setModal(null)} c={c} />
      <OccupantModal open={modal === "occupant"} onClose={() => setModal(null)} c={c} />
      <ConfirmDialog open={modal === "activate"} onClose={() => setModal(null)} onConfirm={() => activate.mutate()} loading={activate.isPending} title="Kích hoạt hợp đồng?" description="Hệ thống sẽ kiểm tra phòng không bảo trì, không có hợp đồng hiệu lực khác và đủ sức chứa (BR-004)." confirmLabel="Kích hoạt" />
      <ConfirmDialog open={ending != null} onClose={() => setEnding(null)} onConfirm={() => ending && endOcc.mutate(ending)} loading={endOcc.isPending} title="Ghi nhận chuyển ra hôm nay?" description="Lượt ở được kết thúc và giữ lại lịch sử; người này không còn được tính phí theo người từ kỳ sau." confirmLabel="Xác nhận" />
    </div>
  );
}

function ExtendModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: ContractView }) {
  const [endDate, setEndDate] = useState(addMonths(c.endDate, 12));
  const [note, setNote] = useState("Gia hạn thêm 12 tháng");
  const m = useApiMutation(() => api.contracts.extend(c.id, { endDate, note }), { success: "Đã gia hạn và lưu phiên bản mới", onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} size="sm" icon={<CalendarPlus className="size-5" />} title="Gia hạn hợp đồng" description={`Hiện kết thúc ${fmtDate(c.endDate)}. Phiên bản cũ vẫn được giữ.`} footer={<><Button variant="ghost" onClick={onClose}>Hủy</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Gia hạn</Button></>}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {[6, 12].map((mo) => (
            <Button key={mo} size="sm" variant="secondary" onClick={() => setEndDate(addMonths(c.endDate, mo))}>
              +{mo} tháng
            </Button>
          ))}
        </div>
        <Field label="Ngày kết thúc mới" error={fieldError(m.error, "endDate")}>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <Field label="Ghi chú">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function RentModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: ContractView }) {
  const [amount, setAmount] = useState(c.currentRent + 200_000);
  const [effectiveFrom, setEffectiveFrom] = useState(periodStart(addPeriods(currentPeriod(), 1)));
  const [reason, setReason] = useState("Điều chỉnh giá theo thị trường");
  const m = useApiMutation(() => api.contracts.changeRent(c.id, { amount, effectiveFrom, reason }), { success: "Đã thêm mức giá mới", onSuccess: onClose });
  const diff = amount - c.currentRent;
  return (
    <Modal open={open} onClose={onClose} size="sm" icon={<TrendingUp className="size-5" />} title="Đổi giá thuê" description="Giá mới có ngày hiệu lực. Hóa đơn đã phát hành giữ nguyên số tiền." footer={<><Button variant="ghost" onClick={onClose}>Hủy</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Lưu giá mới</Button></>}>
      <div className="space-y-4">
        <Field label="Giá mới" error={fieldError(m.error, "amount")} hint={diff ? `${diff > 0 ? "Tăng" : "Giảm"} ${money(Math.abs(diff))} so với ${money(c.currentRent)}` : undefined}>
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Áp dụng từ" error={fieldError(m.error, "effectiveFrom")} hint="Chọn ngày đầu kỳ (AC-005-03)">
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </Field>
        <Field label="Lý do">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function DepositModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: ContractView }) {
  const short = c.depositRequired - c.depositReceived;
  const [amount, setAmount] = useState(short);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [key] = useState(() => uid("dep-"));
  const m = useApiMutation(() => api.contracts.receiveDeposit(c.id, { amount, method, idempotencyKey: key }), { success: "Đã ghi nhận tiền cọc", onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} size="sm" icon={<PiggyBank className="size-5" />} title="Nhận bổ sung cọc" description={`Còn thiếu ${money(short)}.`} footer={<><Button variant="ghost" onClick={onClose}>Hủy</Button><Button loading={m.isPending} onClick={() => m.mutate()}>Ghi nhận</Button></>}>
      <div className="space-y-4">
        <Field label="Số tiền" error={fieldError(m.error, "amount")}>
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Hình thức">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(["BANK_TRANSFER", "CASH", "E_WALLET"] as PaymentMethod[]).map((x) => (
              <option key={x} value={x}>
                {paymentMethod[x]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function OccupantModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: ContractView }) {
  const [p, setP] = useState<PersonInput>({ fullName: "", phone: "", email: "", dateOfBirth: "", identityNumber: "", permanentAddress: "" });
  const [moveInDate, setMoveInDate] = useState(today() < c.startDate ? c.startDate : today());
  const m = useApiMutation(() => api.contracts.addOccupant(c.id, { person: p, moveInDate }), { success: `Đã thêm ${p.fullName}`, onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} icon={<UserPlus className="size-5" />} title="Thêm người ở cùng" description={`Phòng tối đa ${c.room.capacity} người.`} footer={<><Button variant="ghost" onClick={onClose}>Hủy</Button><Button loading={m.isPending} disabled={!p.fullName.trim()} onClick={() => m.mutate()}>Thêm</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ và tên" required error={fieldError(m.error, "fullName")}>
          <Input value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} />
        </Field>
        <Field label="Số điện thoại" error={fieldError(m.error, "phone")}>
          <Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
        </Field>
        <Field label="Ngày vào" error={fieldError(m.error, "moveInDate")} hint={`Trong khoảng ${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}`}>
          <Input type="date" value={moveInDate} min={c.startDate} max={c.endDate} onChange={(e) => setMoveInDate(e.target.value)} />
        </Field>
        <Field label="Ngày sinh">
          <Input type="date" value={p.dateOfBirth} max={addDays(today(), -365 * 15)} onChange={(e) => setP({ ...p, dateOfBirth: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
