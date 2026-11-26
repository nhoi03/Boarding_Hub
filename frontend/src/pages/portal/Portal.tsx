import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, ChevronDown, FileText, Home, PartyPopper, Plus, QrCode, Receipt, Users, Wallet, Wrench } from "lucide-react";
import { api } from "@/api";
import { contractStatus, invoiceStatus, maintenancePriority, maintenanceStatus, paymentMethod } from "@/api/labels";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle, UserMenu } from "@/components/layout/Topbar";
import { Avatar, Badge, Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/PageLoader";
import { MaintenanceFormModal } from "@/components/domain/MaintenanceForm";
import { FakeQR } from "@/components/domain/FakeQR";
import { Aurora, CountUp, rise, stagger } from "@/components/fx";
import { cn, money } from "@/lib/format";
import { daysBetween, fmtDate, fmtDateTime, periodLabel, relativeTime, today } from "@/lib/date";

export default function Portal() {
  const { data, isLoading } = useQuery({ queryKey: ["tenant-overview"], queryFn: () => api.tenant.overview() });
  const [report, setReport] = useState(false);
  const [openInv, setOpenInv] = useState<number | null>(null);

  if (isLoading || !data) return <PageLoader />;
  const { person, contract: c, invoices, payments, maintenance } = data;
  const unpaid = invoices.filter((i) => i.balance > 0 && i.status !== "DRAFT" && i.status !== "CANCELLED");
  const debt = unpaid.reduce((s, i) => s + i.balance, 0);
  const nearest = [...unpaid].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];
  const daysLeft = c ? daysBetween(today(), c.endDate) : 0;
  const hour = new Date().getHours();
  const greet = hour >= 5 && hour < 11 ? "Chào buổi sáng" : hour >= 11 && hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-ink-950/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Logo className="min-w-0" />
          <Badge tone="cyan" className="ml-1 hidden sm:inline-flex">
            Cổng người thuê
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <Aurora intensity={0.35} />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm font-medium text-brand-600 dark:text-brand-300">{greet} 👋</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{person.fullName}</h1>
            {c && (
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Phòng <b className="text-slate-900 dark:text-white">{c.room.code}</b> · {c.propertyName}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-3">
          <motion.div variants={rise} className="md:col-span-2">
            <Card className="relative h-full overflow-hidden p-6">
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
                    <Wallet className="size-4" /> {debt > 0 ? "Số tiền cần thanh toán" : "Bạn không còn khoản nợ nào"}
                  </div>
                  <div className={cn("mt-2 text-4xl font-black sm:text-5xl", debt > 0 ? "text-brand-700 dark:text-brand-300" : "text-emerald-700")}>
                    {debt > 0 ? <CountUp value={debt} format={(n) => money(n)} /> : <PartyPopper className="size-12" />}
                  </div>
                  {nearest?.dueDate && (
                    <div className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm", nearest.overdue ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-stone-100 text-stone-600 dark:bg-white/5")}>
                      <CalendarClock className="size-4" /> Hạn gần nhất {fmtDate(nearest.dueDate)} {nearest.overdue && "· đã quá hạn"}
                    </div>
                  )}
                </div>
                {debt > 0 && nearest && (
                  <div className="rounded-2xl bg-white p-3 shadow-xl">
                    <FakeQR text={`${nearest.invoiceNo}|${debt}`} size={120} />
                    <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600">
                      <QrCode className="size-3" /> Quét để chuyển khoản
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
          <motion.div variants={rise}>
            <Card className="h-full p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileText className="size-4 text-brand-500" /> Hợp đồng
              </div>
              {c ? (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500">{c.code}</span>
                    <StatusBadge map={contractStatus} value={c.status} />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {money(c.currentRent)}
                    <span className="text-sm font-medium text-slate-400">/tháng</span>
                  </div>
                  <div className="text-slate-500">
                    {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                  </div>
                  <div className={cn("text-xs font-semibold", daysLeft <= 30 ? "text-amber-600" : "text-slate-500")}>{daysLeft >= 0 ? `Còn ${daysLeft} ngày` : "Đã hết hạn"}</div>
                  <div className="text-xs text-slate-500">Tiền cọc đang giữ: {money(c.depositAvailable)}</div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Bạn chưa có hợp đồng đang hiệu lực.</p>
              )}
            </Card>
          </motion.div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader title="Hóa đơn của phòng" subtitle="Bấm để xem chi tiết cách tính" icon={<Receipt className="size-5" />} />
            {invoices.length === 0 ? (
              <EmptyState title="Chưa có hóa đơn" />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {invoices
                  .filter((i) => i.status !== "DRAFT")
                  .map((i) => {
                    const open = openInv === i.id;
                    return (
                      <div key={i.id}>
                        <button onClick={() => setOpenInv(open ? null : i.id)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white">{i.period ? periodLabel(i.period) : i.invoiceNo}</div>
                            <div className="text-xs text-slate-500">
                              {i.invoiceNo} {i.dueDate && `· hạn ${fmtDate(i.dueDate)}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="num font-bold text-slate-900 dark:text-white">{money(i.total)}</div>
                            {i.balance > 0 && i.status !== "CANCELLED" && <div className="num text-xs font-semibold text-rose-600">còn {money(i.balance)}</div>}
                          </div>
                          <StatusBadge map={invoiceStatus} value={i.status} />
                          <ChevronDown className={cn("size-4 text-slate-400 transition", open && "rotate-180")} />
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-50/60 dark:bg-white/[0.02]">
                              <div className="space-y-2 px-5 py-4">
                                {i.items.map((it) => (
                                  <div key={it.id} className="flex justify-between gap-4 text-sm">
                                    <div>
                                      <div className="text-slate-800 dark:text-slate-200">{it.description}</div>
                                      {it.formula && <div className="font-mono text-[11px] text-slate-500">{it.formula}</div>}
                                    </div>
                                    <span className="num shrink-0 font-semibold">{money(it.amount)}</span>
                                  </div>
                                ))}
                                {i.adjustments.map((a) => (
                                  <div key={a.id} className="flex justify-between text-sm text-slate-500">
                                    <i>{a.reason}</i>
                                    <span className="num">{money(a.amount)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold dark:border-white/10">
                                  <span>Đã thanh toán</span>
                                  <span className="num text-emerald-600">{money(i.paid)}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>

          <div className="space-y-6">
            {c && (
              <Card>
                <CardHeader title="Người ở cùng" icon={<Users className="size-5" />} />
                <div className="space-y-3 px-5 pb-5">
                  {c.occupants
                    .filter((o) => o.status === "ACTIVE")
                    .map((o) => (
                      <div key={o.id} className="flex items-center gap-3">
                        <Avatar name={o.person.fullName} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{o.person.fullName}</div>
                          <div className="text-xs text-slate-500">{o.role === "REPRESENTATIVE" ? "Đại diện" : "Thành viên"}</div>
                        </div>
                      </div>
                    ))}
                  <p className="text-[11px] text-slate-400">Thông tin cá nhân của người ở cùng được ẩn (AC-030-02).</p>
                </div>
              </Card>
            )}
            <Card>
              <CardHeader title="Thanh toán gần đây" icon={<Wallet className="size-5" />} />
              <div className="space-y-3 px-5 pb-5">
                {payments.length === 0 && <p className="text-sm text-slate-500">Chưa có khoản thanh toán.</p>}
                {payments.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className={cn("num font-semibold", p.status === "VOIDED" ? "text-slate-400 line-through" : "text-emerald-600")}>{money(p.amount)}</div>
                      <div className="text-xs text-slate-500">
                        {paymentMethod[p.method]} · {fmtDateTime(p.receivedAt)}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{p.code}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader
            title="Báo hỏng & yêu cầu sửa chữa"
            subtitle="Chủ trọ nhận thông báo ngay khi bạn gửi"
            icon={<Wrench className="size-5" />}
            action={
              c && (
                <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setReport(true)}>
                  Báo hỏng
                </Button>
              )
            }
          />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            {maintenance.length === 0 && <p className="text-sm text-slate-500">Chưa có yêu cầu nào. Mọi thứ đều ổn!</p>}
            {maintenance.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 p-4 dark:border-white/[0.07]">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <StatusBadge map={maintenanceStatus} value={m.status} />
                  <StatusBadge map={maintenancePriority} value={m.priority} />
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">{m.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {m.code} · {relativeTime(m.createdAt)}
                </div>
                {m.resolutionNote && <div className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">{m.resolutionNote}</div>}
              </motion.div>
            ))}
          </div>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Home className="size-3.5" /> BoardingHub — minh bạch tiền phòng cho cả chủ trọ và người thuê
        </p>
      </main>
      {c && <MaintenanceFormModal open={report} onClose={() => setReport(false)} roomId={c.room.id} />}
    </div>
  );
}
