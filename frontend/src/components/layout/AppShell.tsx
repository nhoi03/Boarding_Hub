import { Navigate, useLocation, useOutlet } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { MobileTabBar, Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { useAuth, homePathFor } from "@/stores/auth";
import { api } from "@/api";
import type { Role } from "@/api/types";

const pageEase = [0.22, 1, 0.36, 1] as const;

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  return (
    <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: "instant" })}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.34, ease: pageEase }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

/** Chặn trang theo vai trò; quyền thật vẫn do API kiểm lại (AC-001-03). */
export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  useQuery({ queryKey: ["me"], queryFn: api.auth.me, enabled: !!user, staleTime: 60_000 });
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return <>{children}</>;
}

export function AppShell() {
  return (
    <RequireRole roles={["OWNER", "STAFF"]}>
      <div className="relative flex min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 right-0 h-[480px] w-[680px] rounded-full bg-brand-500/[0.07] blur-3xl dark:bg-brand-500/[0.12]" />
          <div className="absolute bottom-0 -left-40 h-[420px] w-[520px] rounded-full bg-brand-400/[0.07] blur-3xl dark:bg-brand-500/[0.06]" />
        </div>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pt-8 lg:pb-8">
            <AnimatedOutlet />
          </main>
        </div>
        <MobileTabBar />
        <CommandPalette />
      </div>
    </RequireRole>
  );
}
