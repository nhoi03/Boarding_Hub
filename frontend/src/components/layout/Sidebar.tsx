import { NavLink } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsLeft, LayoutGrid, Sparkles } from "lucide-react";
import { NAV } from "./nav";
import { Logo } from "./Logo";
import { useAuth } from "@/stores/auth";
import { useUI } from "@/stores/ui";
import { cn } from "@/lib/format";
import { API_MODE } from "@/api";

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const user = useAuth((s) => s.user);
  const items = NAV.filter((n) => user && n.roles.includes(user.role));
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
      {groups.map((g) => (
        <div key={g}>
          {!collapsed && <div className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">{g}</div>}
          <div className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} title={collapsed ? item.label : undefined}>
                  {({ isActive }) => (
                    <div
                      className={cn(
                        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                        isActive ? "text-brand-700 dark:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-xl bg-brand-500/10 ring-1 ring-brand-500/15 dark:bg-brand-500/20"
                          transition={{ type: "spring", stiffness: 320, damping: 34 }}
                        />
                      )}
                      {isActive && <motion.div layoutId="nav-bar" className="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-brand-500" />}
                      <item.icon className={cn("relative size-[18px] shrink-0 transition-transform group-hover:scale-110", isActive && "text-brand-600 dark:text-brand-300")} />
                      {!collapsed && <span className="relative truncate">{item.label}</span>}
                    </div>
                  )}
                </NavLink>
              ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Footer({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="m-3 overflow-hidden rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Sparkles className="size-4 text-brand-500" />
        {API_MODE === "mock" ? "Chế độ demo" : "Đã kết nối máy chủ"}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {API_MODE === "mock" ? "Dữ liệu giả lập lưu trong trình duyệt, áp dụng đúng quy tắc nghiệp vụ." : "Dữ liệu từ Spring Boot API."}
      </p>
    </div>
  );
}

const PHONE_TABS = ["/app", "/app/rooms", "/app/invoices", "/app/payments"];

export function MobileTabBar() {
  const user = useAuth((s) => s.user);
  const setMobileNavOpen = useUI((s) => s.setMobileNavOpen);
  const tabs = PHONE_TABS.map((to) => NAV.find((n) => n.to === to)).filter((n): n is (typeof NAV)[number] => !!n && !!user && n.roles.includes(user.role));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden dark:border-white/[0.08] dark:bg-ink-950/90" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Điều hướng điện thoại">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="min-w-0">
            {({ isActive }) => (
              <span className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold", isActive ? "text-brand-700 dark:text-brand-300" : "text-slate-500")}>
                <item.icon className="size-[18px]" />
                <span className="max-w-full truncate px-0.5">{item.to === "/app/payments" ? "Thu tiền" : item.label}</span>
              </span>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMobileNavOpen(true)} className="flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500">
          <LayoutGrid className="size-[18px]" />
          Menu
        </button>
      </div>
    </nav>
  );
}

export function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUI();
  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-xl lg:flex dark:border-white/[0.06] dark:bg-ink-900/50"
      >
        <div className={cn("flex h-16 items-center px-5", collapsed && "justify-center px-0")}>
          <Logo collapsed={collapsed} />
        </div>
        <NavList collapsed={collapsed} />
        <Footer collapsed={collapsed} />
        <button
          onClick={toggleSidebar}
          className="absolute top-20 -right-3 flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:scale-110 hover:text-brand-600 dark:border-white/10 dark:bg-ink-800"
          aria-label="Thu gọn thanh bên"
        >
          <ChevronsLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </motion.aside>

      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNavOpen(false)} />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white dark:bg-ink-900"
            >
              <div className="flex h-16 items-center px-5">
                <Logo />
              </div>
              <NavList collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
              <Footer collapsed={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
