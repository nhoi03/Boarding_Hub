import { useState, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Archive, CheckCircle2, Clock, Hammer, Inbox, Lock, Plus, UserCheck, Wrench } from "lucide-react";
import { api } from "@/api";
import type { MaintenanceRequest, MaintenanceStatus } from "@/api/types";
import { maintenancePriority, maintenanceStatus } from "@/api/labels";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Field, Input, MoneyInput, Textarea } from "@/components/ui/form";
import { PageLoader } from "@/components/PageLoader";
import { MaintenanceFormModal } from "@/components/domain/MaintenanceForm";
import { useApiMutation } from "@/lib/query";
import { cn, money } from "@/lib/format";
import { fmtDateTime, relativeTime } from "@/lib/date";

type Item = MaintenanceRequest & { roomCode: string };

const FLOW: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  CANCELLED: [],
};

const COLUMNS: { status: MaintenanceStatus; icon: typeof Inbox; accent: string }[] = [
  { status: "NEW", icon: Inbox, accent: "from-stone-500 to-stone-400" },
  { status: "ACCEPTED", icon: UserCheck, accent: "from-brand-500 to-brand-400" },
  { status: "IN_PROGRESS", icon: Hammer, accent: "from-amber-700 to-amber-500" },
  { status: "RESOLVED", icon: CheckCircle2, accent: "from-emerald-800 to-emerald-600" },
  { status: "CLOSED", icon: Archive, accent: "from-stone-400 to-stone-300" },
];

const actionLabel: Partial<Record<MaintenanceStatus, string>> = {
  ACCEPTED: "Tiếp nhận",
  IN_PROGRESS: "Bắt đầu xử lý",
  RESOLVED: "Báo đã xử lý",
  CLOSED: "Đóng yêu cầu",
  CANCELLED: "Hủy yêu cầu",
};

function TransitionModal({ req, to, onClose }: { req: Item | null; to: MaintenanceStatus | null; onClose: () => void }) {
  const [assignedTo, setAssignedTo] = useState("");
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");
  const m = useApiMutation(() => api.maintenance.transition(req!.id, { status: to!, assignedTo: assignedTo || undefined, cost: to === "RESOLVED" ? cost : undefined, note: note || undefined }), {
    success: () => `${req?.code}: ${to ? maintenanceStatus[to].label : ""}`,
    onSuccess: () => {
      setAssignedTo("");
      setCost(0);
      setNote("");
      onClose();
    },
  });
  if (!req || !to) return null;
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      icon={<Wrench className="size-5" />}
      title={`${actionLabel[to]} · ${req.roomCode}`}
      description={req.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button variant={to === "CANCELLED" ? "danger" : "primary"} loading={m.isPending} disabled={to === "CANCELLED" && !note.trim()} onClick={() => m.mutate(undefined)}>
            {actionLabel[to]}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {to === "ACCEPTED" && (
          <Field label="Giao cho" hint="Tên thợ hoặc nhân viên phụ trách">
            <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Ví dụ: Anh Tuấn (điện nước)" autoFocus />
          </Field>
        )}
        {to === "RESOLVED" && (
          <Field label="Chi phí sửa chữa" hint="Ghi nhận để theo dõi chi phí vận hành">
            <MoneyInput value={cost} onChange={setCost} />
          </Field>
        )}
        <Field label={to === "CANCELLED" ? "Lý do hủy" : "Ghi chú"} required={to === "CANCELLED"}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={to === "RESOLVED" ? "Đã thay vòi sen mới…" : ""} />
        </Field>
        {req.blocksRoom && (to === "RESOLVED" || to === "CLOSED" || to === "CANCELLED") && <p className="rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">Phòng sẽ tự mở lại cho thuê nếu không còn yêu cầu nào đang khóa phòng.</p>}
      </div>
    </Modal>
  );
}

function TicketCard({ m, onOpen, onDragStart, onDragEnd }: { m: Item; onOpen: () => void; onDragStart: (e: DragEvent) => void; onDragEnd: () => void }) {
  const p = maintenancePriority[m.priority];
  const draggable = FLOW[m.status].length > 0;
  return (
    <motion.div layout layoutId={`mt-${m.id}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 32 }}>
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        className={cn(
          "group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/[0.07] dark:bg-ink-900",
          draggable && "active:cursor-grabbing",
          m.priority === "URGENT" && "ring-1 ring-rose-500/40",
        )}
      >
        {m.priority === "URGENT" && <span className="absolute top-3 right-3 size-2 animate-ping rounded-full bg-rose-500" />}
        <div className="mb-2 flex items-center gap-2">
          <span className="shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-white dark:bg-white/10">{m.roomCode}</span>
          <Badge tone={p.tone}>{p.label}</Badge>
          {m.blocksRoom && <Lock className="size-3.5 text-amber-500" aria-label="Khóa phòng" />}
        </div>
        <div className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{m.title}</div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
            <Clock className="size-3" />
            {relativeTime(m.createdAt)}
          </span>
          {m.assignedTo && <span className="max-w-[110px] truncate">→ {m.assignedTo}</span>}
        </div>
        {m.cost != null && m.cost > 0 && <div className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Chi phí {money(m.cost)}</div>}
      </div>
    </motion.div>
  );
}

export default function Maintenance() {
  const { data = [], isLoading } = useQuery({ queryKey: ["maintenance"], queryFn: () => api.maintenance.list() });
  const [dragging, setDragging] = useState<Item | null>(null);
  const [over, setOver] = useState<MaintenanceStatus | null>(null);
  const [pending, setPending] = useState<{ req: Item; to: MaintenanceStatus } | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) return <PageLoader />;
  const detail = open ? data.find((x) => x.id === open.id) ?? open : null;
  const cancelled = data.filter((m) => m.status === "CANCELLED");
  const openCount = data.filter((m) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(m.status)).length;
  const totalCost = data.reduce((s, m) => s + (m.cost ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="EP05 · US-006"
        title="Bảo trì & sự cố"
        description="Kéo thẻ sang cột kế tiếp để chuyển trạng thái. Chỉ những bước hợp lệ mới sáng lên."
        actions={
          <Button variant="glow" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Tạo yêu cầu
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone="amber">{openCount} đang mở</Badge>
        <Badge tone="red">{data.filter((m) => m.priority === "URGENT" && !["CLOSED", "CANCELLED"].includes(m.status)).length} khẩn cấp</Badge>
        <Badge tone="violet">Tổng chi phí {money(totalCost)}</Badge>
        {cancelled.length > 0 && <Badge>{cancelled.length} đã hủy</Badge>}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-4">
        <div className="grid min-w-[1100px] grid-cols-5 gap-4">
          {COLUMNS.map((col) => {
            const items = data.filter((m) => m.status === col.status);
            const allowed = dragging ? FLOW[dragging.status].includes(col.status) : false;
            const isOver = over === col.status && allowed;
            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  if (allowed) {
                    e.preventDefault();
                    setOver(col.status);
                  }
                }}
                onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging && allowed) setPending({ req: dragging, to: col.status });
                  setOver(null);
                  setDragging(null);
                }}
                className={cn(
                  "flex min-h-[420px] flex-col rounded-3xl border bg-slate-50/70 p-3 transition-all dark:bg-white/[0.02]",
                  isOver ? "scale-[1.01] border-brand-400 bg-brand-50/60 dark:bg-brand-500/10" : allowed ? "border-dashed border-brand-300 dark:border-brand-500/40" : "border-slate-200/70 dark:border-white/[0.05]",
                  dragging && !allowed && dragging.status !== col.status && "opacity-50",
                )}
              >
                <div className="mb-3 flex items-center gap-2 px-1">
                  <div className={cn("flex size-7 items-center justify-center rounded-lg bg-gradient-to-br text-white", col.accent)}>
                    <col.icon className="size-3.5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{maintenanceStatus[col.status].label}</span>
                  <span className="ml-auto rounded-full bg-white px-2 text-xs font-semibold text-slate-500 shadow-sm dark:bg-white/10">{items.length}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2.5">
                  <AnimatePresence mode="popLayout">
                    {items.map((m) => (
                      <TicketCard
                        key={m.id}
                        m={m}
                        onOpen={() => setOpen(m)}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDragging(m);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setOver(null);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                  {items.length === 0 && <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-white/[0.06]">{allowed ? "Thả vào đây" : "Trống"}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Drawer
        open={!!detail}
        onClose={() => setOpen(null)}
        title={detail ? `${detail.code} · Phòng ${detail.roomCode}` : ""}
        footer={
          detail &&
          FLOW[detail.status].map((to) => (
            <Button key={to} variant={to === "CANCELLED" ? "ghost" : "primary"} className={to === "CANCELLED" ? "text-rose-600" : ""} onClick={() => setPending({ req: detail, to })}>
              {actionLabel[to]}
            </Button>
          ))
        }
      >
        {detail && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge map={maintenanceStatus} value={detail.status} />
                <StatusBadge map={maintenancePriority} value={detail.priority} />
                {detail.blocksRoom && (
                  <Badge tone="amber">
                    <Lock className="size-3" /> Khóa phòng
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{detail.title}</h3>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-600 dark:text-slate-400">{detail.description || "Không có mô tả."}</p>
            </div>
            <Card className="grid grid-cols-2 gap-3 p-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Người báo</div>
                <div className="font-medium">{detail.reportedBy}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Phụ trách</div>
                <div className="font-medium">{detail.assignedTo ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Chi phí</div>
                <div className="font-medium">{detail.cost != null ? money(detail.cost) : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Tạo lúc</div>
                <div className="font-medium">{fmtDateTime(detail.createdAt)}</div>
              </div>
            </Card>
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Lịch sử xử lý</div>
              <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-white/10">
                {detail.history.map((h, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                    <span className="absolute top-1 -left-[26px] size-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-ink-900" />
                    <StatusBadge map={maintenanceStatus} value={h.status} />
                    <div className="mt-1 text-xs text-slate-500">
                      {h.by} · {fmtDateTime(h.at)}
                    </div>
                    {h.note && <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{h.note}</div>}
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Drawer>

      <TransitionModal req={pending?.req ?? null} to={pending?.to ?? null} onClose={() => setPending(null)} />
      <MaintenanceFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
