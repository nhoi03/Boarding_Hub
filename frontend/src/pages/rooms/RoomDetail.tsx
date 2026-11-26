import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, BedDouble, FilePlus2, FileText, Maximize, Pencil, Power, Ruler, Users, Wallet, Wrench } from "lucide-react";
import { api } from "@/api";
import type { RoomStatus } from "@/api/types";
import { invoiceStatus, maintenancePriority, maintenanceStatus, roomStatus } from "@/api/labels";
import { useAuth } from "@/stores/auth";
import { Avatar, Badge, Card, CardHeader, EmptyState, InfoRow, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/overlay";
import { Field, Select, Textarea } from "@/components/ui/form";
import { PageLoader } from "@/components/PageLoader";
import { RoomFormModal } from "@/components/domain/RoomForm";
import { CollectPaymentModal } from "@/components/domain/CollectPayment";
import { MaintenanceFormModal } from "@/components/domain/MaintenanceForm";
import { useApiMutation } from "@/lib/query";
import { money } from "@/lib/format";
import { fmtDate, periodLabel } from "@/lib/date";

export default function RoomDetail() {
  const id = Number(useParams().id);
  const isOwner = useAuth((s) => s.user?.role === "OWNER");
  const [edit, setEdit] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [collect, setCollect] = useState(false);
  const [report, setReport] = useState(false);
  const { data: room, isLoading, error } = useQuery({ queryKey: ["room", id], queryFn: () => api.rooms.get(id) });
  const c = room?.activeContract;
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices", { contractId: c?.id }], queryFn: () => api.invoices.list({ contractId: c!.id }), enabled: !!c });
  const { data: maint = [] } = useQuery({ queryKey: ["maintenance", { roomId: id }], queryFn: () => api.maintenance.list({ roomId: id }) });

  if (error) return <EmptyState title="Không mở được phòng" description={(error as Error).message} action={<Button to="/app/rooms">Về sơ đồ phòng</Button>} />;
  if (isLoading || !room) return <PageLoader />;

  return (
    <div>
      <Link to="/app/rooms" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <ArrowLeft className="size-4" /> Sơ đồ phòng
      </Link>
      <PageHeader
        eyebrow={room.propertyName}
        title={
          <span className="flex items-center gap-3">
            Phòng {room.code} <StatusBadge map={roomStatus} value={room.status} />
          </span>
        }
        description={room.description}
        actions={
          <>
            {room.status === "VACANT" && (
              <Button to={`/app/contracts/new?roomId=${room.id}`} icon={<FilePlus2 className="size-4" />}>
                Lập hợp đồng
              </Button>
            )}
            {c && (
              <Button variant="success" onClick={() => setCollect(true)} icon={<Wallet className="size-4" />}>
                Thu tiền
              </Button>
            )}
            <Button variant="secondary" onClick={() => setReport(true)} icon={<Wrench className="size-4" />}>
              Báo hỏng
            </Button>
            {isOwner && (
              <>
                <Button variant="secondary" onClick={() => setEdit(true)} icon={<Pencil className="size-4" />}>
                  Sửa
                </Button>
                <Button variant="ghost" onClick={() => setStatusOpen(true)} icon={<Power className="size-4" />}>
                  Trạng thái
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Ruler, v: `${room.areaM2} m²`, l: "Diện tích" },
                { icon: Users, v: `${room.occupants.length}/${room.capacity}`, l: "Người ở" },
                { icon: Maximize, v: `Tầng ${room.floor}`, l: "Vị trí" },
              ].map((x, i) => (
                <motion.div key={x.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/[0.03]">
                  <x.icon className="mx-auto size-5 text-brand-500" />
                  <div className="mt-1.5 font-bold text-slate-900 dark:text-white">{x.v}</div>
                  <div className="text-[11px] text-slate-500">{x.l}</div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-white/[0.05]">
              <InfoRow label="Giá niêm yết" value={money(room.listedRent)} />
              {room.currentRent != null && <InfoRow label="Giá theo hợp đồng" value={<span className="text-brand-600 dark:text-brand-300">{money(room.currentRent)}</span>} />}
              <InfoRow label="Công nợ hiện tại" value={room.balance > 0 ? <span className="text-rose-600">{money(room.balance)}</span> : "Không nợ"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {room.amenities.map((a) => (
                <Badge key={a} tone="violet">
                  {a}
                </Badge>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Bảo trì" icon={<Wrench className="size-5" />} action={<Badge tone="amber">{maint.length}</Badge>} />
            <div className="space-y-2 px-5 pb-5">
              {maint.length === 0 && <p className="text-sm text-slate-500">Chưa có yêu cầu nào.</p>}
              {maint.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{m.title}</span>
                    <StatusBadge map={maintenanceStatus} value={m.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    {m.code} · {fmtDate(m.createdAt)} · <StatusBadge map={maintenancePriority} value={m.priority} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Hợp đồng hiện tại"
              icon={<FileText className="size-5" />}
              action={c && <Button size="sm" variant="secondary" to={`/app/contracts/${c.id}`}>Mở hợp đồng</Button>}
            />
            {c ? (
              <div className="px-5 pb-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoRow label="Mã" value={c.code} className="flex-col items-start gap-0.5 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]" />
                  <InfoRow label="Thời hạn" value={`${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}`} className="flex-col items-start gap-0.5 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]" />
                  <InfoRow label="Kỳ thu" value={`Ngày ${c.billingAnchorDay}, hạn ${c.paymentDueDays} ngày`} className="flex-col items-start gap-0.5 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]" />
                </div>
                <div className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">Người đang ở</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {room.occupants.map((o, i) => (
                    <motion.div key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                      <Avatar name={o.person.fullName} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{o.person.fullName}</div>
                        <div className="text-xs text-slate-500">
                          {o.person.phone} · từ {fmtDate(o.moveInDate)}
                        </div>
                      </div>
                      {o.role === "REPRESENTATIVE" && (
                        <Badge tone="blue" className="ml-auto">
                          Đại diện
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon={<BedDouble className="size-6" />} title="Phòng chưa có hợp đồng" description={room.status === "VACANT" ? "Lập hợp đồng để tiếp nhận người thuê." : "Phòng cần sẵn sàng trước khi cho thuê (AC-002-03)."} action={room.status === "VACANT" && <Button to={`/app/contracts/new?roomId=${room.id}`}>Lập hợp đồng</Button>} />
            )}
          </Card>

          {c && (
            <Card className="overflow-hidden">
              <CardHeader title="Hóa đơn của hợp đồng" icon={<Wallet className="size-5" />} />
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Số</th>
                      <th>Kỳ</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Tổng</th>
                      <th className="text-right">Còn nợ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <Link className="font-medium text-brand-600 hover:underline dark:text-brand-300" to={`/app/invoices/${i.id}`}>
                            {i.invoiceNo}
                          </Link>
                        </td>
                        <td>{i.period ? periodLabel(i.period) : "Trả phòng"}</td>
                        <td>
                          <StatusBadge map={invoiceStatus} value={i.status} />
                        </td>
                        <td className="num text-right">{money(i.total)}</td>
                        <td className="num text-right font-semibold">{i.balance > 0 ? <span className="text-rose-600">{money(i.balance)}</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      <RoomFormModal open={edit} onClose={() => setEdit(false)} room={room} />
      <StatusModal open={statusOpen} onClose={() => setStatusOpen(false)} roomId={room.id} current={room.status} />
      {c && <CollectPaymentModal open={collect} onClose={() => setCollect(false)} contractId={c.id} />}
      <MaintenanceFormModal open={report} onClose={() => setReport(false)} roomId={room.id} />
    </div>
  );
}

function StatusModal({ open, onClose, roomId, current }: { open: boolean; onClose: () => void; roomId: number; current: RoomStatus }) {
  const [status, setStatus] = useState<RoomStatus>(current === "VACANT" ? "MAINTENANCE" : "VACANT");
  const [reason, setReason] = useState("");
  const m = useApiMutation(() => api.rooms.setStatus(roomId, status, reason), { success: "Đã đổi trạng thái phòng", onSuccess: onClose });
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Đổi trạng thái phòng"
      description="Phòng đang có hợp đồng phải trả phòng trước. Ngừng dùng vẫn giữ toàn bộ lịch sử (AC-002-02)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={m.isPending} onClick={() => m.mutate()}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Trạng thái mới">
          <Select value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)}>
            <option value="VACANT">Trống — sẵn sàng cho thuê</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="INACTIVE">Ngừng sử dụng</option>
          </Select>
        </Field>
        <Field label="Lý do">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: sửa trần thấm nước" />
        </Field>
      </div>
    </Modal>
  );
}
