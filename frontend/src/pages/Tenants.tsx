import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Phone, Search, UserPlus, Users } from "lucide-react";
import { api } from "@/api";
import { useUI } from "@/stores/ui";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/form";
import { TableSkeleton } from "@/components/PageLoader";
import { fmtDate } from "@/lib/date";

export default function Tenants() {
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"LIVING" | "MOVED_OUT" | "ALL">("LIVING");
  const { data = [], isLoading } = useQuery({ queryKey: ["persons", propertyId, q], queryFn: () => api.persons.list({ propertyId, search: q }) });
  const rows = data.filter((p) => tab === "ALL" || p.status === tab);

  return (
    <div>
      <PageHeader
        eyebrow="EP03 · Người thuê"
        title="Người thuê"
        description="Ai đang ở phòng nào, từ khi nào. Người đã chuyển đi vẫn được giữ lịch sử (AC-003-03)."
        actions={
          <Button icon={<UserPlus className="size-4" />} to="/app/contracts/new">
            Tiếp nhận người thuê
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center dark:border-white/[0.06]">
          <Segmented
            layoutId="tenant-tab"
            value={tab}
            onChange={setTab}
            options={[
              { value: "LIVING", label: "Đang ở", count: data.filter((p) => p.status === "LIVING").length },
              { value: "MOVED_OUT", label: "Đã chuyển đi", count: data.filter((p) => p.status === "MOVED_OUT").length },
              { value: "ALL", label: "Tất cả", count: data.length },
            ]}
          />
          <div className="sm:ml-auto sm:w-80">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên, số điện thoại, phòng…" icon={<Search className="size-4" />} />
          </div>
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Users className="size-6" />} title="Không có người thuê phù hợp" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Người thuê</th>
                  <th>Liên hệ</th>
                  <th>Phòng</th>
                  <th>Vai trò</th>
                  <th>Ngày vào</th>
                  <th>Quê quán</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.fullName} size={34} />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{p.fullName}</div>
                          <div className="text-xs text-slate-500">Sinh {fmtDate(p.dateOfBirth)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-slate-700 hover:text-brand-600 dark:text-slate-300">
                        <Phone className="size-3.5" /> {p.phone}
                      </a>
                      <div className="text-xs text-slate-500">{p.email}</div>
                    </td>
                    <td>
                      <Link to={`/app/contracts/${p.contractId}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                        {p.roomCode}
                      </Link>
                      <div className="text-xs text-slate-500">{p.propertyName}</div>
                    </td>
                    <td>{p.role === "REPRESENTATIVE" ? <Badge tone="blue">Đại diện</Badge> : <Badge>Ở cùng</Badge>}</td>
                    <td>
                      {fmtDate(p.moveInDate)}
                      {p.status === "MOVED_OUT" && <div className="text-xs text-violet-600">Đã chuyển đi</div>}
                    </td>
                    <td className="max-w-[220px] truncate text-slate-500">{p.permanentAddress}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
