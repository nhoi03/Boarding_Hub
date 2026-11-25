import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, AlertTriangle, Bell, Building2, Check, ChevronDown, Info, LogOut, Menu, Moon, RotateCcw, Search, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api, API_MODE } from "@/api";
import { roleLabel } from "@/api/labels";
import { useAuth } from "@/stores/auth";
import { useUI } from "@/stores/ui";
import { Avatar, Kbd } from "@/components/ui/primitives";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/lib/format";

function Popover({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    setTimeout(() => document.addEventListener("click", h));
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("click", h);
      document.removeEventListener("keydown", k);
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className={cn("absolute right-0 z-50 mt-2 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-ink-800", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PropertySwitcher() {
  const { propertyId, setPropertyId } = useUI();
  const [open, setOpen] = useState(false);
  const { data: props = [] } = useQuery({ queryKey: ["properties"], queryFn: api.properties.list });
  const current = props.find((p) => p.id === propertyId);
  useEffect(() => {
    if (propertyId && props.length && !current) setPropertyId(null);
  }, [props, propertyId, current, setPropertyId]);
  const options = props.length > 1 ? [{ id: null as number | null, name: "Tất cả khu trọ", sub: `${props.length} khu` }, ...props.map((p) => ({ id: p.id as number | null, name: p.name, sub: `${p.address}, ${p.district}` }))] : props.map((p) => ({ id: p.id as number | null, name: p.name, sub: p.district }));
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium shadow-sm transition hover:border-brand-300 dark:border-white/10 dark:bg-white/[0.04]">
        <Building2 className="size-4 text-brand-500" />
        <span className="hidden max-w-[180px] truncate sm:inline">{current?.name ?? (props.length > 1 ? "Tất cả khu trọ" : props[0]?.name ?? "…")}</span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="left-0 w-72 origin-top-left p-1.5">
        {options.map((o) => (
          <button
            key={String(o.id)}
            onClick={() => {
              setPropertyId(o.id);
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{o.name}</div>
              <div className="truncate text-xs text-slate-500">{o.sub}</div>
            </div>
            {(propertyId ?? null) === o.id && <Check className="size-4 text-brand-500" />}
          </button>
        ))}
      </Popover>
    </div>
  );
}

const sevIcon = { danger: AlertCircle, warning: AlertTriangle, info: Info };
const sevCls = { danger: "text-rose-500 bg-rose-500/10", warning: "text-amber-500 bg-amber-500/10", info: "text-sky-500 bg-sky-500/10" };

function Notifications() {
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({ queryKey: ["reminders"], queryFn: api.reminders.list, refetchInterval: 60_000 });
  const urgent = data.filter((r) => r.severity !== "info").length;
  return (
    <div className="relative">
      <IconButton label="Nhắc việc" onClick={() => setOpen((o) => !o)} className="relative">
        <Bell className={cn("size-[18px]", urgent > 0 && "origin-top animate-[wiggle_1s_ease-in-out_2]")} />
        {urgent > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 animate-pulse-ring items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{urgent > 9 ? "9+" : urgent}</span>}
      </IconButton>
      <Popover open={open} onClose={() => setOpen(false)} className="w-[380px] max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Nhắc việc</div>
            <div className="text-xs text-slate-500">Tự động tổng hợp từ dữ liệu (US-027)</div>
          </div>
          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-300">{data.length}</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {data.length === 0 && <div className="px-4 py-10 text-center text-sm text-slate-500">Không có việc cần làm. Tuyệt vời! 🎉</div>}
          {data.slice(0, 30).map((r, i) => {
            const Icon = sevIcon[r.severity];
            return (
              <motion.div key={r.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                <Link to={r.link} onClick={() => setOpen(false)} className="flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", sevCls[r.severity])}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{r.title}</div>
                    <div className="truncate text-xs text-slate-500">{r.detail}</div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, clear } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  if (!user) return null;
  const logout = async () => {
    await api.auth.logout();
    clear();
    qc.clear();
    navigate("/login");
  };
  const reset = async () => {
    setOpen(false);
    const t = toast.loading("Đang khôi phục dữ liệu demo…");
    await api.demo.reset();
    await qc.invalidateQueries();
    toast.success("Đã khôi phục dữ liệu demo ban đầu", { id: t });
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition hover:bg-slate-100 dark:hover:bg-white/5">
        <Avatar name={user.fullName} size={34} />
        <div className="hidden text-left leading-tight md:block">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{user.fullName}</div>
          <div className="text-xs text-slate-500">{roleLabel[user.role]}</div>
        </div>
        <ChevronDown className="hidden size-4 text-slate-400 md:block" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-64 p-1.5">
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar name={user.fullName} size={40} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.fullName}</div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
        </div>
        <div className="my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
        <div className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-500">
          <UserRound className="size-4" /> Vai trò: <span className="font-medium text-slate-800 dark:text-slate-200">{roleLabel[user.role]}</span>
        </div>
        {API_MODE === "mock" && (
          <button onClick={reset} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
            <RotateCcw className="size-4" /> Khôi phục dữ liệu demo
          </button>
        )}
        <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10">
          <LogOut className="size-4" /> Đăng xuất
        </button>
      </Popover>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useUI();
  return (
    <IconButton label="Đổi giao diện sáng/tối" onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ duration: 0.2 }}>
          {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}

export function Topbar() {
  const { setCommandOpen, setMobileNavOpen } = useUI();
  return (
    <header className="sticky top-0 z-40 flex min-h-14 items-center gap-1.5 border-b border-slate-200/70 bg-white/70 px-3 py-1.5 backdrop-blur-xl sm:min-h-16 sm:gap-3 sm:px-6 dark:border-white/[0.06] dark:bg-ink-950/60" style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}>
      <IconButton label="Mở menu" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
        <Menu className="size-5" />
      </IconButton>
      <PropertySwitcher />
      <IconButton label="Tìm kiếm" className="ml-auto md:hidden" onClick={() => setCommandOpen(true)}>
        <Search className="size-[18px]" />
      </IconButton>
      <button
        onClick={() => setCommandOpen(true)}
        className="group ml-2 hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-400 transition hover:border-brand-300 hover:bg-white md:flex dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
      >
        <Search className="size-4 transition group-hover:text-brand-500" />
        <span className="hidden flex-1 truncate text-left sm:inline">Tìm phòng, người thuê, hóa đơn…</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="flex items-center gap-1 md:ml-auto">
        <ThemeToggle />
        <Notifications />
        <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />
        <UserMenu />
      </div>
    </header>
  );
}
