import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BedDouble, Check, CircleDollarSign, ClipboardCheck, DoorOpen, FileSignature, Plus, Trash2, UserRound, Users } from "lucide-react";
import { api } from "@/api";
import type { PersonInput } from "@/api/contract";
import type { PaymentMethod } from "@/api/types";
import { paymentMethod } from "@/api/labels";
import { useUI } from "@/stores/ui";
import { Avatar, Badge, Card, EmptyState, InfoRow, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Switch } from "@/components/ui/form";
import { fireConfetti } from "@/components/fx";
import { useApiMutation } from "@/lib/query";
import { cn, money, uid } from "@/lib/format";
import { addDays, addMonths, fmtDate, periodStart, addPeriods, currentPeriod } from "@/lib/date";

const STEPS = [
  { key: "room", label: "Chọn phòng", icon: DoorOpen },
  { key: "people", label: "Người thuê", icon: Users },
  { key: "terms", label: "Điều khoản", icon: FileSignature },
  { key: "deposit", label: "Cọc & kích hoạt", icon: CircleDollarSign },
  { key: "review", label: "Xem lại", icon: ClipboardCheck },
];

const emptyPerson = (): PersonInput => ({ fullName: "", phone: "", email: "", dateOfBirth: "", identityNumber: "", permanentAddress: "" });

function PersonForm({ value, onChange, title, onRemove }: { value: PersonInput; onChange: (p: PersonInput) => void; title: string; onRemove?: () => void }) {
  const set = (k: keyof PersonInput, v: string) => onChange({ ...value, [k]: v });
  const phoneErr = value.phone && !/^0\d{9}$/.test(value.phone) ? "Số điện thoại gồm 10 số, bắt đầu bằng 0" : undefined;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          {value.fullName ? <Avatar name={value.fullName} size={26} /> : <UserRound className="size-5 text-slate-400" />}
          {title}
        </div>
        {onRemove && (
          <button onClick={onRemove} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Xóa">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Họ và tên" required>
          <Input value={value.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Số điện thoại" error={phoneErr}>
          <Input value={value.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="09xxxxxxxx" inputMode="tel" error={phoneErr} />
        </Field>
        <Field label="Ngày sinh">
          <Input type="date" value={value.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>
        <Field label="Số CCCD" hint="Tùy chọn; được mã hóa, không ghi vào nhật ký">
          <Input value={value.identityNumber} onChange={(e) => set("identityNumber", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12 chữ số" />
        </Field>
        <Field label="Email">
          <Input type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Quê quán / thường trú">
          <Input value={value.permanentAddress} onChange={(e) => set("permanentAddress", e.target.value)} />
        </Field>
      </div>
    </motion.div>
  );
}

export default function NewContract() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [roomId, setRoomId] = useState<number | undefined>(params.get("roomId") ? Number(params.get("roomId")) : undefined);
  const [rep, setRep] = useState<PersonInput>(emptyPerson());
  const [members, setMembers] = useState<PersonInput[]>([]);
  const nextMonth = periodStart(addPeriods(currentPeriod(), 1));
  const [startDate, setStartDate] = useState(nextMonth);
  const [months, setMonths] = useState(12);
  const [endDate, setEndDate] = useState(addDays(addMonths(nextMonth, 12), -1));
  const [rent, setRent] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [anchor, setAnchor] = useState(1);
  const [dueDays, setDueDays] = useState(5);
  const [depositIn, setDepositIn] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [activate, setActivate] = useState(true);
  const [key] = useState(() => uid("dep-"));

  const { data: rooms = [], isLoading } = useQuery({ queryKey: ["rooms", propertyId], queryFn: () => api.rooms.list({ propertyId }) });
  const available = rooms.filter((r) => r.status === "VACANT" || r.status === "MAINTENANCE");
  const room = rooms.find((r) => r.id === roomId);

  useEffect(() => {
    if (room) {
      setRent(room.listedRent);
      setDeposit(room.listedRent);
      setDepositIn(room.listedRent);
    }
  }, [room]);

  useEffect(() => {
    if (months > 0) setEndDate(addDays(addMonths(startDate, months), -1));
  }, [startDate, months]);

  const valid = useMemo(() => {
    const phoneOk = (p: PersonInput) => !p.phone || /^0\d{9}$/.test(p.phone);
    return [
      !!room && room.status === "VACANT",
      !!rep.fullName.trim() && phoneOk(rep) && members.every((m) => m.fullName.trim() && phoneOk(m)) && 1 + members.length <= (room?.capacity ?? 0),
      endDate > startDate && rent > 0 && deposit >= 0,
      depositIn <= deposit,
      true,
    ];
  }, [room, rep, members, endDate, startDate, rent, deposit, depositIn]);

  const m = useApiMutation(api.contracts.create, {
    onSuccess: (c) => {
      fireConfetti();
      navigate(`/app/contracts/${c.id}`);
    },
    success: (c) => (c.status === "ACTIVE" ? `Hợp đồng ${c.code} đã có hiệu lực 🎉` : `Đã lưu nháp hợp đồng ${c.code}`),
  });

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const submit = () =>
    m.mutate({
      roomId: roomId!,
      representative: { person: rep },
      members,
      startDate,
      endDate,
      rent,
      depositRequired: deposit,
      billingAnchorDay: anchor,
      paymentDueDays: dueDays,
      activate,
      initialDeposit: depositIn > 0 ? { amount: depositIn, method, idempotencyKey: key } : undefined,
    });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="US-003 · US-004" title="Lập hợp đồng mới" description="Tiếp nhận người thuê, ghi điều khoản và nhận cọc trong một luồng." />

      <Card className="mb-6 p-4 sm:p-5">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-5 right-6 left-6 h-0.5 bg-slate-100 dark:bg-white/[0.06]" />
          <motion.div className="absolute top-5 left-6 h-0.5 bg-brand-500" animate={{ width: `calc(${(step / (STEPS.length - 1)) * 100}% - ${(step / (STEPS.length - 1)) * 48}px)` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
          {STEPS.map((s, i) => {
            const done = i < step;
            const on = i === step;
            return (
              <button key={s.key} onClick={() => i <= step || valid.slice(0, i).every(Boolean) ? go(i) : undefined} className="relative z-10 flex flex-col items-center gap-2">
                <motion.div
                  animate={{ scale: on ? 1.1 : 1 }}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                    done ? "border-transparent bg-brand-600 text-white" : on ? "border-brand-500 bg-white text-brand-600 shadow-lg shadow-brand-500/30 dark:bg-ink-900" : "border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-ink-900",
                  )}
                >
                  {done ? <Check className="size-5" /> : <s.icon className="size-[18px]" />}
                </motion.div>
                <span className={cn("hidden text-xs font-semibold sm:block", on ? "text-brand-600 dark:text-brand-300" : "text-slate-500")}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="relative min-h-[420px] overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            {step === 0 && (
              <Card className="p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white">Chọn phòng trống</h2>
                <p className="text-sm text-slate-500">Phòng đang bảo trì hiển thị để tham khảo nhưng không thể chọn (AC-002-03).</p>
                {isLoading ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))}
                  </div>
                ) : available.length === 0 ? (
                  <EmptyState icon={<BedDouble className="size-6" />} title="Không còn phòng trống" description="Tất cả phòng đều đang có người thuê." />
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {available.map((r) => {
                      const disabled = r.status !== "VACANT";
                      const on = r.id === roomId;
                      return (
                        <motion.button
                          key={r.id}
                          whileHover={disabled ? undefined : { y: -3 }}
                          whileTap={disabled ? undefined : { scale: 0.97 }}
                          disabled={disabled}
                          onClick={() => setRoomId(r.id)}
                          className={cn(
                            "relative rounded-2xl border-2 p-4 text-left transition",
                            on ? "border-brand-500 bg-brand-500/5 shadow-lg shadow-brand-500/20" : "border-slate-200 hover:border-brand-300 dark:border-white/10",
                            disabled && "cursor-not-allowed opacity-50",
                          )}
                        >
                          {on && (
                            <motion.div layoutId="room-check" className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-brand-500 text-white">
                              <Check className="size-4" />
                            </motion.div>
                          )}
                          <div className="text-xs text-slate-500">{r.propertyName.replace("BoardingHub ", "")}</div>
                          <div className="text-xl font-extrabold text-slate-900 dark:text-white">{r.code}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {r.areaM2} m² · tối đa {r.capacity} người
                          </div>
                          <div className="num mt-2 text-sm font-bold text-brand-600 dark:text-brand-300">{money(r.listedRent)}</div>
                          {disabled && <Badge tone="amber" className="mt-2">Đang bảo trì</Badge>}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {step === 1 && (
              <Card className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white">Người thuê</h2>
                    <p className="text-sm text-slate-500">
                      Phòng {room?.code} tối đa {room?.capacity} người · hiện khai {1 + members.length} người
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} disabled={1 + members.length >= (room?.capacity ?? 0)} onClick={() => setMembers((s) => [...s, emptyPerson()])}>
                    Thêm người ở cùng
                  </Button>
                </div>
                <AnimatePresence mode="popLayout">
                  <PersonForm key="rep" title="Người đại diện ký hợp đồng" value={rep} onChange={setRep} />
                  {members.map((p, i) => (
                    <PersonForm key={i} title={`Người ở cùng ${i + 1}`} value={p} onChange={(v) => setMembers((s) => s.map((x, j) => (j === i ? v : x)))} onRemove={() => setMembers((s) => s.filter((_, j) => j !== i))} />
                  ))}
                </AnimatePresence>
              </Card>
            )}

            {step === 2 && (
              <Card className="p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white">Điều khoản cho thuê</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Ngày bắt đầu" required hint="Nên chọn ngày đầu tháng; chính sách tính theo ngày (Q02) chưa duyệt">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </Field>
                  <Field label="Thời hạn">
                    <div className="flex flex-wrap gap-2">
                      {[3, 6, 12, 24].map((mo) => (
                        <button key={mo} onClick={() => setMonths(mo)} className={cn("h-10 rounded-xl border px-4 text-sm font-semibold transition", months === mo ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-400")}>
                          {mo} tháng
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Ngày kết thúc" required error={endDate <= startDate ? "Ngày kết thúc phải sau ngày bắt đầu" : undefined}>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setMonths(0);
                        setEndDate(e.target.value);
                      }}
                    />
                  </Field>
                  <Field label="Giá thuê / tháng" required hint={room && rent !== room.listedRent ? `Giá niêm yết ${money(room.listedRent)}` : undefined}>
                    <MoneyInput value={rent} onChange={setRent} />
                  </Field>
                  <Field label="Tiền cọc phải nộp">
                    <MoneyInput value={deposit} onChange={setDeposit} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ngày chốt kỳ">
                      <Select value={anchor} onChange={(e) => setAnchor(Number(e.target.value))}>
                        {[1, 5, 10, 15, 20, 25].map((d) => (
                          <option key={d} value={d}>
                            Ngày {d}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Hạn đóng">
                      <Input type="number" min={1} max={30} value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))} suffix="ngày" />
                    </Field>
                  </div>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card className="p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white">Nhận cọc và kích hoạt</h2>
                <p className="text-sm text-slate-500">Cọc theo dõi riêng, không cộng vào tiền thuê thực thu (BR-006). Có thể nhận thiếu và đóng bổ sung sau (AC-004-03).</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Tiền cọc nhận ngay" error={depositIn > deposit ? "Không được lớn hơn cọc phải nộp" : undefined} hint={deposit - depositIn > 0 ? `Còn thiếu ${money(deposit - depositIn)}` : "Nhận đủ cọc"}>
                    <MoneyInput value={depositIn} onChange={setDepositIn} />
                  </Field>
                  <Field label="Hình thức">
                    <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                      {(["BANK_TRANSFER", "CASH", "E_WALLET"] as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {paymentMethod[m]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" animate={{ width: `${deposit ? Math.min(100, (depositIn / deposit) * 100) : 100}%` }} />
                </div>
                <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <Switch checked={activate} onChange={setActivate} label="Kích hoạt hợp đồng ngay" description="Hệ thống kiểm tra phòng không bảo trì, không có hợp đồng hiệu lực khác và đủ sức chứa. Tắt để lưu bản nháp." />
                </div>
              </Card>
            )}

            {step === 4 && room && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Phòng & điều khoản</h3>
                  <div className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.05]">
                    <InfoRow label="Phòng" value={`${room.code} · ${room.propertyName}`} />
                    <InfoRow label="Thời hạn" value={`${fmtDate(startDate)} → ${fmtDate(endDate)}`} />
                    <InfoRow label="Giá thuê" value={money(rent)} />
                    <InfoRow label="Kỳ thu" value={`Chốt ngày ${anchor}, hạn đóng ${dueDays} ngày`} />
                    <InfoRow label="Cọc phải nộp" value={money(deposit)} />
                    <InfoRow label="Cọc nhận ngay" value={<span className={depositIn < deposit ? "text-amber-600" : "text-emerald-600"}>{money(depositIn)}</span>} />
                    <InfoRow label="Trạng thái sau khi lưu" value={activate ? <Badge tone="green">Hiệu lực</Badge> : <Badge>Nháp</Badge>} />
                  </div>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Người ở ({1 + members.length})</h3>
                  <div className="mt-3 space-y-2">
                    {[rep, ...members].map((p, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                        <Avatar name={p.fullName || "?"} size={34} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.fullName}</div>
                          <div className="text-xs text-slate-500">{p.phone || "Chưa có SĐT"}</div>
                        </div>
                        {i === 0 && <Badge tone="blue">Đại diện</Badge>}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-4 z-20 mt-6">
        <div className="glass flex items-center justify-between rounded-2xl p-3 shadow-xl">
          <Button variant="ghost" icon={<ArrowLeft className="size-4" />} disabled={step === 0} onClick={() => go(step - 1)}>
            Quay lại
          </Button>
          <div className="text-xs text-slate-500">
            Bước {step + 1}/{STEPS.length}
          </div>
          {step < STEPS.length - 1 ? (
            <Button disabled={!valid[step]} onClick={() => go(step + 1)}>
              Tiếp tục <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button variant="glow" loading={m.isPending} onClick={submit} icon={<FileSignature className="size-4" />}>
              {activate ? "Ký & kích hoạt" : "Lưu nháp"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
