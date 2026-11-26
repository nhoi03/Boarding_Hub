import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/format";

export function Tabs<T extends string>({ value, onChange, tabs, layoutId, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; icon?: ReactNode; count?: number }[]; layoutId: string; className?: string }) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/[0.07]", className)}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button key={t.value} onClick={() => onChange(t.value)} className={cn("relative flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors", on ? "text-brand-600 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
            {t.icon}
            {t.label}
            {t.count != null && <span className={cn("rounded-full px-1.5 text-[11px]", on ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : "bg-slate-100 text-slate-500 dark:bg-white/10")}>{t.count}</span>}
            {on && <motion.div layoutId={layoutId} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </button>
        );
      })}
    </div>
  );
}
