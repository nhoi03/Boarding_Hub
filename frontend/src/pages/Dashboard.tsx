import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarClock,
  ClipboardList,
  FileText,
  Gauge,
  HandCoins,
  Info,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api } from "@/api";
import { paymentMethod } from "@/api/labels";
import { useAuth } from "@/stores/auth";
import { useUI } from "@/stores/ui";
import { CountUp, SpotlightCard, rise, stagger } from "@/components/fx";
import { Avatar, Badge, Card, CardHeader, EmptyState, ProgressRing, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/PageLoader";
import { CollectPaymentModal } from "@/components/domain/CollectPayment";
import { ChartTooltip } from "@/components/domain/charts";
import { compactMoney, cn, money } from "@/lib/format";
import { daysBetween, fmtDate, periodLabel, relativeTime, today } from "@/lib/date";

const sevIcon = { danger: AlertCircle, warning: AlertTriangle, info: Info };
const sevCls = { danger: "text-rose-500 bg-rose-500/10 ring-rose-500/20", warning: "text-amber-500 bg-amber-500/10 ring-amber-500/20", info: "text-sky-500 bg-sky-500/10 ring-sky-500/20" };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Chào buổi tối" : h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

function Kpi({ icon: Icon, label, value, format, sub, tone, children }: { icon: typeof Wallet; label: string; value: number; format?: (n: number) => string; sub?: React.ReactNode; tone: string; children?: React.ReactNode }) {
  return (
    <motion.div variants={rise}>
      <SpotlightCard className="h-full p-5">
        <div className="flex items-start justify-between">
          <div className={cn("flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", tone)}>
            <Icon className="size-5" />
          </div>
          {children}
        </div>
        <div className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 text-[26px] leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
          <CountUp value={value} format={format} />
        </div>
        {sub && <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </SpotlightCard>
    </motion.div>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [collect, setCollect] = useState<{ contractId?: number } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", propertyId], queryFn: () => api.dashboard.get(propertyId) });

  if (isLoading || !data) return <PageLoader />;

  const occ = data.rooms.total - data.rooms.inactive ? data.rooms.occupied / (data.rooms.total - data.rooms.inactive) : 0;
  const last = data.revenueSeries[data.revenueSeries.length - 2];
  const prev = data.revenueSeries[data.revenueSeries.length - 3];
  const growth = prev?.billed ? (last.billed - prev.billed) / prev.billed : 0;
  const collectRate = data.billedThisPeriod ? data.revenueSeries.find((s) => s.period === data.period)!.collected / data.billedThisPeriod : 0;
  const d = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <div className="text-sm font-medium text-slate-500 capitalize">{d.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {greeting()}, <span className="text-gradient">{user.fullName.split(" ").slice(-1)[0]}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Bạn có <b className="text-slate-800 dark:text-slate-200">{data.reminders.filter((r) => r.severity !== "info").length} việc cần chú ý</b> và{" "}
            <b className="text-rose-600">{data.overdueCount} hóa đơn quá hạn</b>.
          </p>
        </motion.div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" to="/app/meters" icon={<Gauge className="size-4" />}>
            Ghi chỉ số
          </Button>
          <Button variant="secondary" to="/app/invoices/billing" icon={<ClipboardList className="size-4" />}>
            Lập hóa đơn
          </Button>
          <Button onClick={() => setCollect({})} icon={<Wallet className="size-4" />}>
            Thu tiền
          </Button>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={HandCoins} label="Đã thu trong tháng" value={data.collectedThisPeriod} format={(n) => money(n)} tone="from-emerald-800 to-emerald-600" sub="Tiền thực nhận, không gồm cọc và quỹ">
          <Badge tone="green">
            <TrendingUp className="size-3" /> {Math.round(collectRate * 100)}% {periodLabel(data.period, true)}
          </Badge>
        </Kpi>
        <Kpi
          icon={Wallet}
          label="Công nợ còn phải thu"
          value={data.outstanding}
          format={(n) => money(n)}
          tone="from-brand-700 to-brand-500"
          sub={
            <Link to="/app/invoices?status=OVERDUE" className="font-medium text-rose-600 hover:underline">
              {data.overdueCount} hóa đơn quá hạn →
            </Link>
          }
        />
        <Kpi icon={FileText} label={`Phát hành ${periodLabel(data.period)}`} value={data.billedThisPeriod} format={(n) => money(n)} tone="from-stone-600 to-stone-400" sub={`${data.occupants} người đang ở`}>
          {growth !== 0 && (
            <Badge tone={growth > 0 ? "green" : "red"}>
              <ArrowUpRight className={cn("size-3", growth < 0 && "rotate-90")} /> {Math.abs(Math.round(growth * 100))}%
            </Badge>
          )}
        </Kpi>
        <Kpi icon={PiggyBank} label="Tiền cọc đang giữ" value={data.depositHeld} format={(n) => money(n)} tone="from-amber-500 to-orange-500 shadow-amber-500/30" sub="Theo dõi riêng, không tính là doanh thu (BR-006)" />
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Dòng tiền 6 kỳ gần nhất" subtitle="Phải thu theo hóa đơn và số đã thu tương ứng" icon={<TrendingUp className="size-5" />} />
          <div className="h-[300px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueSeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b56b3c" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#b56b3c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7d8f6a" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7d8f6a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-white/[0.06]" />
                <XAxis dataKey="period" tickFormatter={(p) => periodLabel(p, true)} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={56} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => periodLabel(l)} />} cursor={{ stroke: "#b56b3c", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="billed" name="Phải thu" stroke="#b56b3c" strokeWidth={2.5} fill="url(#gBilled)" animationDuration={1400} />
                <Area type="monotone" dataKey="collected" name="Đã thu" stroke="#7d8f6a" strokeWidth={2.5} fill="url(#gCollected)" animationDuration={1600} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Tình trạng phòng" subtitle={`${data.rooms.total} phòng`} icon={<BedDouble className="size-5" />} action={<Button size="xs" variant="ghost" to="/app/rooms">Sơ đồ <ArrowRight className="size-3" /></Button>} />
          <div className="flex flex-col items-center px-5 pb-5">
            <ProgressRing value={occ} size={168} stroke={14}>
              <div className="text-4xl font-extrabold text-slate-900 dark:text-white">
                <CountUp value={Math.round(occ * 100)} />%
              </div>
              <div className="text-xs font-medium text-slate-500">lấp đầy</div>
            </ProgressRing>
            <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
              {[
                { l: "Đang thuê", v: data.rooms.occupied, c: "bg-sky-500", s: "OCCUPIED" },
                { l: "Trống", v: data.rooms.vacant, c: "bg-emerald-500", s: "VACANT" },
                { l: "Bảo trì", v: data.rooms.maintenance, c: "bg-amber-500", s: "MAINTENANCE" },
                { l: "Ngừng dùng", v: data.rooms.inactive, c: "bg-slate-400", s: "INACTIVE" },
              ].map((x) => (
                <Link key={x.l} to={`/app/rooms?status=${x.s}`} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                  <span className={cn("size-2.5 rounded-full", x.c)} />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{x.l}</span>
                  <span className="ml-auto font-bold text-slate-900 dark:text-white">{x.v}</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Nhắc việc" subtitle="Tự tổng hợp, không gửi lặp (US-027)" icon={<CalendarClock className="size-5" />} action={<Badge tone="violet">{data.reminders.length}</Badge>} />
          <div className="max-h-[420px] space-y-1 overflow-y-auto px-3 pb-4">
            {data.reminders.length === 0 && <EmptyState title="Không có việc tồn đọng" description="Mọi thứ đều đã được xử lý." />}
            {data.reminders.slice(0, 14).map((r, i) => {
              const Icon = sevIcon[r.severity];
              return (
                <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.03 }}>
                  <Link to={r.link} className="group flex gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1", sevCls[r.severity])}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{r.title}</div>
                      <div className="truncate text-xs text-slate-500">{r.detail}</div>
                    </div>
                    <ArrowRight className="mt-2 size-4 shrink-0 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Nợ nhiều nhất" subtitle="Bấm để thu ngay" icon={<AlertTriangle className="size-5" />} action={<Button size="xs" variant="ghost" to="/app/invoices?status=UNPAID">Tất cả <ArrowRight className="size-3" /></Button>} />
          <div className="space-y-1 px-3 pb-4">
            {data.topDebtors.length === 0 && <EmptyState title="Không ai nợ" description="Tất cả hóa đơn đã thu đủ." />}
            {data.topDebtors.map((t, i) => {
              const overdueDays = t.oldestDue ? daysBetween(t.oldestDue, today()) : 0;
              const max = data.topDebtors[0].balance;
              return (
                <motion.div key={t.contractId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }} className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <Avatar name={t.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/app/contracts/${t.contractId}`} className="truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white">
                        {t.roomCode}
                      </Link>
                      {overdueDays > 0 && <Badge tone={overdueDays > 20 ? "red" : "amber"}>{overdueDays} ngày</Badge>}
                    </div>
                    <div className="truncate text-xs text-slate-500">{t.name}</div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(t.balance / max) * 100}%` }} transition={{ delay: 0.4 + i * 0.05, duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm font-bold text-rose-600 dark:text-rose-400">{money(t.balance)}</div>
                    <button onClick={() => setCollect({ contractId: t.contractId })} className="mt-0.5 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100 dark:text-brand-300">
                      Thu tiền →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Thu tiền gần đây" icon={<HandCoins className="size-5" />} action={<Button size="xs" variant="ghost" to="/app/payments">Sổ thu <ArrowRight className="size-3" /></Button>} />
          <div className="relative px-5 pb-5">
            <div className="absolute top-2 bottom-6 left-[37px] w-px bg-gradient-to-b from-emerald-500/40 via-slate-200 to-transparent dark:via-white/10" />
            {data.recentPayments.length === 0 && <Skeleton className="h-40" />}
            {data.recentPayments.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="relative flex gap-3 py-2.5">
                <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-white dark:ring-ink-900">
                  <HandCoins className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {p.roomCode} · {p.payerName}
                    </span>
                    <span className="num shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">+{compactMoney(p.amount)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {paymentMethod[p.method]} · {relativeTime(p.receivedAt)} · {fmtDate(p.receivedAt)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      <CollectPaymentModal open={!!collect} onClose={() => setCollect(null)} contractId={collect?.contractId} />
    </div>
  );
}
