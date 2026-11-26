import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { api } from "@/api";
import type { ID, MaintenancePriority } from "@/api/types";
import { maintenancePriority } from "@/api/labels";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { useApiMutation, fieldError } from "@/lib/query";
import { cn } from "@/lib/format";
import { useAuth } from "@/stores/auth";

export function MaintenanceFormModal({ open, onClose, roomId: fixedRoom }: { open: boolean; onClose: () => void; roomId?: ID }) {
  const isTenant = useAuth((s) => s.user?.role === "TENANT");
  const [roomId, setRoomId] = useState<ID | undefined>(fixedRoom);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("NORMAL");
  const [blocksRoom, setBlocksRoom] = useState(false);
  useEffect(() => {
    if (open) {
      setRoomId(fixedRoom);
      setTitle("");
      setDescription("");
      setPriority("NORMAL");
      setBlocksRoom(false);
    }
  }, [open, fixedRoom]);
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: () => api.rooms.list(), enabled: open && !fixedRoom && !isTenant });
  const m = useApiMutation(api.maintenance.create, { success: (r) => `Đã gửi yêu cầu ${r.code}`, onSuccess: onClose });

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Wrench className="size-5" />}
      title="Báo hỏng / yêu cầu sửa chữa"
      description="Yêu cầu được lưu kèm thời điểm và người gửi; chỉ người có quyền mới tiếp nhận và phân công (US-013)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={m.isPending} disabled={!roomId || !title.trim()} onClick={() => roomId && m.mutate({ roomId, title, description, priority, blocksRoom })}>
            Gửi yêu cầu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!fixedRoom && (
          <Field label="Phòng" required>
            <Select value={roomId ?? ""} onChange={(e) => setRoomId(Number(e.target.value) || undefined)}>
              <option value="">— Chọn phòng —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.propertyName}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Vấn đề" required error={fieldError(m.error, "title")}>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Điều hòa không mát" />
        </Field>
        <Field label="Mô tả chi tiết">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hiện tượng, thời điểm bắt đầu, đã thử xử lý gì…" />
        </Field>
        <Field label="Mức độ">
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(maintenancePriority) as MaintenancePriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "rounded-xl border px-2 py-2 text-xs font-semibold transition",
                  priority === p ? "border-brand-500 bg-brand-500/10 text-brand-700 ring-2 ring-brand-500/20 dark:text-brand-300" : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-400",
                )}
              >
                {maintenancePriority[p].label}
              </button>
            ))}
          </div>
        </Field>
        {!isTenant && <Switch checked={blocksRoom} onChange={setBlocksRoom} label="Khóa phòng trong lúc sửa" description="Phòng trống sẽ chuyển sang Bảo trì và không cho kích hoạt hợp đồng mới." />}
      </div>
    </Modal>
  );
}
