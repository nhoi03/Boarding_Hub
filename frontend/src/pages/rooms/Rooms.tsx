import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { AlertTriangle, Building2, LayoutGrid, List, Plus, Search, Users, Wrench } from "lucide-react";
import { api } from "@/api";
import type { RoomStatus, RoomView } from "@/api/types";
import { roomStatus } from "@/api/labels";
import { useUI } from "@/stores/ui";
import { useAuth } from "@/stores/auth";
import { Avatar, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/form";
import { RoomFormModal } from "@/components/domain/RoomForm";
import { cn, compactMoney, matches, money } from "@/lib/format";

const tile: Record<RoomStatus, string> = {
  OCCUPIED: "border-[#e4d3bc] bg-[#fffaf3] hover:border-brand-400 dark:border-white/10 dark:bg-white/[0.04]",
  VACANT: "border-dashed border-brand-300 bg-[#fbf7f1] hover:border-brand-500 dark:border-brand-400/40 dark:bg-transparent",
  MAINTENANCE: "border-amber-300/70 bg-amber-50/70 hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10",
  INACTIVE: "border-stone-300 bg-stone-100/70 opacity-70 hover:opacity-100 dark:border-white/10 dark:bg-white/[0.03]",
};
const dot: Record<RoomStatus, string> = { OCCUPIED: "bg-brand-500", VACANT: "bg-emerald-700", MAINTENANCE: "bg-amber-600", INACTIVE: "bg-stone-400" };

function RoomTile({ r }: { r: RoomView }) {
  const fill = r.occupants.length / r.capacity;
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} whileHover={{ y: -2 }}>
      <Link to={`/app/rooms/${r.id}`} className={cn("group relative block overflow-hidden rounded-2xl border p-4 shadow-sm transition-colors", tile[r.status])}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{r.code}</div>
            <div className="text-[11px] text-slate-500">
              {r.areaM2} m² · {r.capacity} người
            </div>
          </div>
          <span className={cn("relative mt-1.5 size-2.5 rounded-full", dot[r.status])}>
          </span>
        </div>
        <div className="mt-4 flex h-7 items-center">
          {r.occupants.length > 0 ? (
            <div className="flex -space-x-2">
              {r.occupants.slice(0, 3).map((o) => (
                <Avatar key={o.id} name={o.person.fullName} size={26} />
              ))}
            </div>
          ) : r.status === "VACANT" ? (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Sẵn sàng cho thuê</span>
          ) : r.status === "MAINTENANCE" ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Wrench className="size-3.5" /> Đang sửa chữa
            </span>
          ) : (
            <span className="text-xs text-slate-400">Ngừng sử dụng</span>
          )}
        </div>
        {r.status === "OCCUPIED" && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-900/5 dark:bg-white/10">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${fill * 100}%` }} />
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="num font-semibold text-slate-700 dark:text-slate-300">{compactMoney(r.currentRent ?? r.listedRent)}/th</span>
          {r.balance > 0 ? (
            <span className="num rounded-md bg-rose-500/10 px-1.5 py-0.5 font-bold text-rose-600 dark:text-rose-400">nợ {compactMoney(r.balance)}</span>
          ) : r.openMaintenance > 0 ? (
            <Wrench className="size-3.5 text-amber-500" />
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}

export default function Rooms() {
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const isOwner = useAuth((s) => s.user?.role === "OWNER");
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as RoomStatus | null) ?? "ALL";
  const [q, setQ] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const [creating, setCreating] = useState(false);
  const { data: rooms = [], isLoading } = useQuery({ queryKey: ["rooms", propertyId], queryFn: () => api.rooms.list({ propertyId }) });

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rooms.length };
    for (const r of rooms) c[r.status] = (c[r.status] ?? 0) + 1;
    c.DEBT = rooms.filter((r) => r.balance > 0).length;
    return c;
  }, [rooms]);

  const filtered = rooms
    .filter((r) => (status === "ALL" ? true : (status as string) === "DEBT" ? r.balance > 0 : r.status === status))
    .filter((r) => !q || matches(`${r.code} ${r.propertyName} ${r.occupants.map((o) => o.person.fullName).join(" ")}`, q));

  const groups = useMemo(() => {
    const m = new Map<string, Map<number, RoomView[]>>();
    for (const r of filtered) {
      if (!m.has(r.propertyName)) m.set(r.propertyName, new Map());
      const f = m.get(r.propertyName)!;
      if (!f.has(r.floor)) f.set(r.floor, []);
      f.get(r.floor)!.push(r);
    }
    return m;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        eyebrow="EP02 · Khu trọ và phòng"
        title="Sơ đồ phòng"
        description="Nhìn nhanh trạng thái, người ở và công nợ từng phòng."
        actions={
          isOwner && (
            <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Thêm phòng
            </Button>
          )
        }
      />
      <Card className="mb-6 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <Segmented
          layoutId="room-filter"
          value={status}
          onChange={(v) => setParams(v === "ALL" ? {} : { status: v })}
          options={[
            { value: "ALL", label: "Tất cả", count: counts.ALL },
            { value: "OCCUPIED", label: "Đang thuê", count: counts.OCCUPIED ?? 0 },
            { value: "VACANT", label: "Trống", count: counts.VACANT ?? 0 },
            { value: "MAINTENANCE", label: "Bảo trì", count: counts.MAINTENANCE ?? 0 },
            { value: "DEBT" as RoomStatus, label: "Còn nợ", count: counts.DEBT },
          ]}
        />
        <div className="flex flex-1 items-center gap-2 lg:justify-end">
          <div className="w-full max-w-xs">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã phòng, tên người ở…" icon={<Search className="size-4" />} />
          </div>
          <Segmented
            layoutId="room-view"
            value={view}
            onChange={setView}
            options={[
              { value: "map", label: <LayoutGrid className="size-4" /> },
              { value: "list", label: <List className="size-4" /> },
            ]}
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="Không có phòng phù hợp" description="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
        </Card>
      ) : view === "map" ? (
        <LayoutGroup>
          <div className="space-y-8">
            {[...groups.entries()].map(([prop, floors]) => (
              <section key={prop}>
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="size-5 text-brand-500" />
                  <h2 className="font-bold text-slate-900 dark:text-white">{prop}</h2>
                  <span className="text-sm text-slate-500">· {[...floors.values()].flat().length} phòng</span>
                </div>
                <div className="space-y-4">
                  {[...floors.entries()]
                    .sort((a, b) => b[0] - a[0])
                    .map(([floor, list]) => (
                      <div key={floor} className="flex gap-3">
                        <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/[0.04]">
                          <span className="text-[10px] font-semibold uppercase">Tầng</span>
                          <span className="text-lg font-extrabold text-slate-700 dark:text-slate-200">{floor}</span>
                        </div>
                        <motion.div layout className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                          <AnimatePresence mode="popLayout">
                            {list
                              .sort((a, b) => a.code.localeCompare(b.code))
                              .map((r) => (
                                <RoomTile key={r.id} r={r} />
                              ))}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        </LayoutGroup>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Khu</th>
                  <th>Trạng thái</th>
                  <th>Người ở</th>
                  <th className="text-right">Giá thuê</th>
                  <th className="text-right">Công nợ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/app/rooms/${r.id}`} className="font-semibold text-slate-900 hover:text-brand-600 dark:text-white">
                        {r.code}
                      </Link>
                      <div className="text-xs text-slate-500">
                        Tầng {r.floor} · {r.areaM2} m²
                      </div>
                    </td>
                    <td className="text-slate-600 dark:text-slate-400">{r.propertyName}</td>
                    <td>
                      <StatusBadge map={roomStatus} value={r.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-slate-400" />
                        {r.occupants.length}/{r.capacity}
                        <span className="truncate text-slate-500">{r.occupants[0]?.person.fullName}</span>
                      </div>
                    </td>
                    <td className="num text-right font-medium">{money(r.currentRent ?? r.listedRent)}</td>
                    <td className="num text-right">
                      {r.balance > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                          <AlertTriangle className="size-3.5" />
                          {money(r.balance)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <RoomFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
