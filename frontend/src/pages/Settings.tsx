import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Database, Droplets, Plug, RotateCcw, Server, Sparkles, Trash2, Wifi, Zap } from "lucide-react";
import { toast } from "sonner";
import { api, API_MODE } from "@/api";
import type { Service } from "@/api/types";
import { useAuth } from "@/stores/auth";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { Field, Input, MoneyInput } from "@/components/ui/form";
import { PageLoader } from "@/components/PageLoader";
import { fieldError, useApiMutation } from "@/lib/query";
import { cn, money } from "@/lib/format";
import { currentPeriod, fmtDate, periodStart } from "@/lib/date";

const svcIcon: Record<string, typeof Zap> = { ELECTRIC: Zap, WATER: Droplets, WIFI: Wifi, TRASH: Trash2 };
const svcTone: Record<string, string> = { ELECTRIC: "from-amber-700 to-amber-500", WATER: "from-stone-500 to-stone-400", WIFI: "from-brand-600 to-brand-400", TRASH: "from-emerald-800 to-emerald-600" };
const methodLabel = { METERED: "Theo chỉ số", PER_ROOM: "Theo phòng", PER_PERSON: "Theo người", FIXED: "Cố định" };

function PriceModal({ svc, onClose }: { svc: Service | null; onClose: () => void }) {
  const [price, setPrice] = useState(0);
  const [from, setFrom] = useState(periodStart(currentPeriod()));
  const m = useApiMutation(() => api.services.updatePrice(svc!.id, { unitPrice: price, effectiveFrom: from }), {
    success: "Đã thêm bảng giá mới — hóa đơn cũ giữ nguyên giá cũ",
    onSuccess: () => {
      setPrice(0);
      onClose();
    },
  });
  return (
    <Modal
      open={!!svc}
      onClose={onClose}
      size="sm"
      title={`Đổi giá ${svc?.name.toLowerCase() ?? ""}`}
      description="Giá mới áp dụng từ ngày đầu kỳ, không sửa ngược hóa đơn đã phát hành (AC-005-02, AC-005-03)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={m.isPending} disabled={!price} onClick={() => m.mutate(undefined)}>
            Lưu giá mới
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={`Đơn giá mới (đ/${svc?.unit ?? ""})`} error={fieldError(m.error, "unitPrice")} hint={svc ? `Hiện tại ${money(svc.unitPrice)}` : undefined}>
          <MoneyInput value={price} onChange={setPrice} autoFocus />
        </Field>
        <Field label="Áp dụng từ" error={fieldError(m.error, "effectiveFrom")} hint="Phải là ngày 01 của kỳ chưa chốt">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export default function Settings() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Service | null>(null);
  const [resetting, setResetting] = useState(false);
  const { data: services, isLoading } = useQuery({ queryKey: ["services"], queryFn: () => api.services.list() });

  if (isLoading || !services) return <PageLoader />;

  const reset = async () => {
    await api.demo.reset();
    await qc.invalidateQueries();
    setResetting(false);
    toast.success("Đã khôi phục dữ liệu demo ban đầu");
  };

  return (
    <div>
      <PageHeader eyebrow="Chủ trọ" title="Cài đặt" description="Bảng giá dịch vụ, nguồn dữ liệu và dữ liệu demo." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Bảng giá dịch vụ" subtitle="Lịch sử giá được giữ lại để tính đúng hóa đơn từng kỳ (BR-007)." />
            <div className="grid gap-4 p-5 pt-2 sm:grid-cols-2">
              {services.map((s, i) => {
                const Icon = svcIcon[s.code] ?? Sparkles;
                return (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-slate-200 p-4 dark:border-white/[0.07]">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", svcTone[s.code] ?? "from-slate-400 to-slate-500")}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                        <div className="text-xs text-slate-500">{methodLabel[s.method]}</div>
                      </div>
                      <Button size="xs" variant="secondary" onClick={() => setEditing(s)}>
                        Đổi giá
                      </Button>
                    </div>
                    <div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
                      {money(s.unitPrice)}
                      <span className="text-sm font-medium text-slate-400">/{s.unit}</span>
                    </div>
                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                      {[...s.priceHistory]
                        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                        .map((h, j) => (
                          <div key={h.effectiveFrom} className="flex justify-between text-xs">
                            <span className="text-slate-500">Từ {fmtDate(h.effectiveFrom)}</span>
                            <span className={cn("num font-semibold", j === 0 ? "text-brand-600" : "text-slate-400 line-through")}>{money(h.unitPrice)}</span>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Plug className="size-4 text-brand-500" /> Nguồn dữ liệu
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
              {API_MODE === "mock" ? <Database className="size-5 text-amber-500" /> : <Server className="size-5 text-emerald-500" />}
              <div className="text-sm">
                <div className="font-semibold">{API_MODE === "mock" ? "Dữ liệu giả lập (trình duyệt)" : "Spring Boot REST API"}</div>
                <div className="text-xs text-slate-500">{API_MODE === "mock" ? "Lưu trong localStorage, đúng các quy tắc nghiệp vụ" : "/api/v1 · JWT Bearer"}</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Chuyển sang backend thật: đặt <code className="rounded bg-slate-100 px-1 dark:bg-white/10">VITE_API_MODE=http</code> trong <code className="rounded bg-slate-100 px-1 dark:bg-white/10">.env.local</code> rồi chạy lại.
            </p>
          </Card>

          {API_MODE === "mock" && (
            <Card className="p-5">
              <div className="mb-2 font-semibold text-slate-900 dark:text-white">Dữ liệu demo</div>
              <p className="mb-4 text-sm text-slate-500">Xóa mọi thay đổi và tạo lại bộ dữ liệu mẫu: 2 khu trọ, 32 phòng, nhiều tình huống công nợ.</p>
              <Button variant="secondary" className="w-full" icon={<RotateCcw className="size-4" />} onClick={() => setResetting(true)}>
                Khôi phục dữ liệu demo
              </Button>
            </Card>
          )}

          <Card className="p-5 text-sm">
            <div className="mb-2 font-semibold text-slate-900 dark:text-white">Tài khoản</div>
            <div className="space-y-1 text-slate-500">
              <div>{user?.fullName}</div>
              <div>{user?.email}</div>
              <Badge tone="violet">Gói Pro · dùng thử</Badge>
            </div>
          </Card>
        </div>
      </div>
      <PriceModal svc={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={resetting} onClose={() => setResetting(false)} onConfirm={reset} danger title="Khôi phục dữ liệu demo?" description="Mọi hợp đồng, hóa đơn, phiếu thu bạn đã tạo trong bản demo sẽ bị xóa." confirmLabel="Khôi phục" />
    </div>
  );
}
