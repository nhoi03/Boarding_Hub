import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex size-9 items-center justify-center rounded-xl bg-brand-600 shadow-md shadow-brand-700/25", className)}>
      <svg viewBox="0 0 64 64" className="size-[62%]" fill="none" stroke="white" strokeWidth="5" strokeLinejoin="round">
        <path d="M14 30 32 15l18 15v18a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" />
        <path d="M26 51V38h12v13" />
      </svg>
    </div>
  );
}

export function Logo({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            Boarding<span className="text-gradient">Hub</span>
          </div>
          <div className="mt-1 text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase">Quản lý nhà trọ</div>
        </div>
      )}
    </div>
  );
}
