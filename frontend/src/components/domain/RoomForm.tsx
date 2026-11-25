import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DoorOpen } from "lucide-react";
import { api } from "@/api";
import type { RoomInput } from "@/api/contract";
import type { Room } from "@/api/types";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/Button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/ui/form";
import { useApiMutation, fieldError } from "@/lib/query";
import { cn } from "@/lib/format";

const AMENITIES = ["Điều hòa", "Nóng lạnh", "Ban công", "Gác xép", "WC riêng", "Tủ lạnh", "Máy giặt", "Cửa sổ lớn", "Bếp riêng", "Giường tủ"];

export function RoomFormModal({ open, onClose, room }: { open: boolean; onClose: () => void; room?: Room }) {
  const { data: props = [] } = useQuery({ queryKey: ["properties"], queryFn: api.properties.list });
  const empty: RoomInput = { propertyId: props[0]?.id ?? 1, code: "", floor: 1, capacity: 2, areaM2: 20, listedRent: 3_000_000, description: "", amenities: [] };
  const [f, setF] = useState<RoomInput>(empty);
  useEffect(() => {
    if (open) setF(room ? { propertyId: room.propertyId, code: room.code, floor: room.floor, capacity: room.capacity, areaM2: room.areaM2, listedRent: room.listedRent, description: room.description, amenities: room.amenities } : { ...empty, propertyId: props[0]?.id ?? 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room]);
  const set = <K extends keyof RoomInput>(k: K, v: RoomInput[K]) => setF((s) => ({ ...s, [k]: v }));

  const create = useApiMutation(api.rooms.create, { success: (r) => `Đã tạo phòng ${r.code}`, onSuccess: onClose });
  const update = useApiMutation((input: RoomInput) => api.rooms.update(room!.id, input), { success: "Đã cập nhật phòng", onSuccess: onClose });
  const m = room ? update : create;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<DoorOpen className="size-5" />}
      title={room ? `Sửa phòng ${room.code}` : "Thêm phòng mới"}
      description="Giá niêm yết chỉ là giá tham khảo; hợp đồng đã ký giữ nguyên giá riêng."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={m.isPending} onClick={() => m.mutate(f)}>
            {room ? "Lưu thay đổi" : "Tạo phòng"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Khu trọ" required>
          <Select value={f.propertyId} disabled={!!room} onChange={(e) => set("propertyId", Number(e.target.value))}>
            {props.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mã phòng" required error={fieldError(m.error, "code")} hint="Không trùng trong cùng khu (AC-002-01)">
          <Input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="Ví dụ 501" />
        </Field>
        <Field label="Tầng">
          <Input type="number" min={1} value={f.floor} onChange={(e) => set("floor", Number(e.target.value))} />
        </Field>
        <Field label="Sức chứa (người)" required error={fieldError(m.error, "capacity")}>
          <Input type="number" min={1} value={f.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
        </Field>
        <Field label="Diện tích">
          <Input type="number" min={1} value={f.areaM2} onChange={(e) => set("areaM2", Number(e.target.value))} suffix="m²" />
        </Field>
        <Field label="Giá niêm yết / tháng">
          <MoneyInput value={f.listedRent} onChange={(v) => set("listedRent", v)} />
        </Field>
        <Field label="Tiện ích" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = f.amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("amenities", on ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])}
                  className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", on ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-400")}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Mô tả" className="sm:col-span-2">
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Hướng phòng, đặc điểm nổi bật…" />
        </Field>
      </div>
    </Modal>
  );
}
