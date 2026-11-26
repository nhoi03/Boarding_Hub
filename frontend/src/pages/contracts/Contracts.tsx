import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, FilePlus2, FileText, Search } from "lucide-react";
import { api } from "@/api";
import { contractStatus } from "@/api/labels";
import { useUI } from "@/stores/ui";
import { Avatar, Badge, Card, EmptyState, PageHeader, ProgressBar, Skeleton, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/form";
import { SpotlightCard } from "@/components/fx";
import { money } from "@/lib/format";
import { daysBetween, fmtDate, today } from "@/lib/date";

type Tab = "ACTIVE" | "EXPIRING" | "DRAFT" | "TERMINATED" | "ALL";

export default function Contracts() {
  const propertyId = useUI((s) => s.propertyId) ?? undefined;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "ACTIVE";
  const [q, setQ] = useState("");
  const { data: all = [], isLoading } = useQuery({ queryKey: ["contracts", "all", propertyId], queryFn: () => api.contracts.list({ propertyId }) });
  const T = today();
  const isExpiring = (c: (typeof all)[number]) => (c.status === "ACTIVE" || c.status === "EXPIRED") && daysBetween(T, c.endDate) <= 30;
  const list = all
    .filter((c) => (tab === "ALL" ? true : tab === "EXPIRING" ? isExpiring(c) : c.status === tab))
    .filter((c) => !q || `${c.code} ${c.room.code} ${c.representative.fullName}`.toLowerCase().includes(q.toLowerCase()));
  const count = (t: Tab) => (t === "ALL" ? all.length : t === "EXPIRING" ? all.filter(isExpiring).length : all.filter((c) => c.status === t).length);

  return (
    <div>
      <PageHeader
        eyebrow="EP03 · EP04 · Hợp đồng và cọc"
        title="Hợp đồng"
        description="Mỗi phòng tối đa một hợp đồng hiệu lực (BR-004). Gia hạn và đổi giá đều lưu phiên bản."
        actions={
          <Button icon={<FilePlus2 className="size-4" />} to="/app/contracts/new">
            Lập hợp đồng
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          layoutId="contract-tab"
          value={tab}
          onChange={(v) => setParams({ tab: v })}
          options={(["ACTIVE", "EXPIRING", "DRAFT", "TERMINATED", "ALL"] as Tab[]).map((t) => ({
            value: t,
            label: { ACTIVE: "Hiệu lực", EXPIRING: "Sắp hết hạn", DRAFT: "Nháp", TERMINATED: "Đã kết thúc", ALL: "Tất cả" }[t],
            count: count(t),
          }))}
        />
        <div className="sm:ml-auto sm:w-72">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mã, phòng, người đại diện…" icon={<Search className="size-4" />} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={<FileText className="size-6" />} title="Không có hợp đồng" description="Thử đổi bộ lọc." />
        </Card>
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((c, i) => {
              const total = Math.max(1, daysBetween(c.startDate, c.endDate));
              const elapsed = Math.min(total, Math.max(0, daysBetween(c.startDate, T)));
              const left = daysBetween(T, c.endDate);
              const live = c.status === "ACTIVE" || c.status === "EXPIRED";
              return (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                  <Link to={`/app/contracts/${c.id}`}>
                    <SpotlightCard className="h-full p-5 transition-transform hover:-translate-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-500">{c.propertyName}</div>
                          <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">Phòng {c.room.code}</div>
                          <div className="font-mono text-xs text-slate-400">{c.code}</div>
                        </div>
                        <StatusBadge map={contractStatus} value={c.status} />
                      </div>
                      <div className="mt-4 flex items-center gap-2.5">
                        <Avatar name={c.representative.fullName} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{c.representative.fullName}</div>
                          <div className="text-xs text-slate-500">{c.occupants.filter((o) => o.status === "ACTIVE" || o.status === "PLANNED").length} người ở</div>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="num text-sm font-bold text-slate-900 dark:text-white">{money(c.currentRent)}</div>
                          <div className="text-[11px] text-slate-500">/ tháng</div>
                        </div>
                      </div>
                      {live && (
                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                            <span>
                              {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                            </span>
                            <span className={left <= 30 ? "font-semibold text-amber-600" : ""}>{left >= 0 ? `còn ${left} ngày` : `quá ${-left} ngày`}</span>
                          </div>
                          <ProgressBar value={elapsed / total} tone={left <= 30 ? "amber" : "brand"} />
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {c.balance > 0 && <Badge tone="red">Nợ {money(c.balance)}</Badge>}
                        {c.depositReceived < c.depositRequired && <Badge tone="amber">Thiếu cọc {money(c.depositRequired - c.depositReceived)}</Badge>}
                        {live && left <= 30 && (
                          <Badge tone="amber">
                            <CalendarClock className="size-3" /> Sắp hết hạn
                          </Badge>
                        )}
                        {c.versions.length > 1 && <Badge tone="violet">{c.versions.length} phiên bản</Badge>}
                        {c.balance === 0 && c.depositReceived >= c.depositRequired && live && <Badge tone="green">Sạch nợ</Badge>}
                      </div>
                    </SpotlightCard>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
