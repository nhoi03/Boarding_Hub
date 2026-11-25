import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn, num, parseMoney } from "@/lib/format";

const control =
  "w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500";

const border = (err?: string) => (err ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-slate-200 dark:border-white/10");

export function Field({ label, hint, error, children, className, required }: { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p key="e" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs font-medium text-rose-600 dark:text-rose-400">
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: string; icon?: ReactNode; suffix?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, error, icon, suffix, ...props }, ref) {
  return (
    <div className="relative">
      {icon && <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">{icon}</div>}
      <input ref={ref} className={cn(control, border(error), "h-10", icon && "pl-10", suffix && "pr-12", className)} {...props} />
      {suffix && <div className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-slate-400">{suffix}</div>}
    </div>
  );
});

export function MoneyInput({ value, onChange, error, className, ...props }: Omit<InputProps, "value" | "onChange"> & { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      inputMode="numeric"
      value={value ? num(value) : ""}
      onChange={(e) => onChange(parseMoney(e.target.value))}
      suffix="đ"
      error={error}
      className={cn("num font-medium", className)}
      {...props}
    />
  );
}

export function Select({ className, error, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <div className="relative">
      <select className={cn(control, border(error), "h-10 cursor-pointer appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function Textarea({ className, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea className={cn(control, border(error), "min-h-[90px] py-2.5", className)} {...props} />;
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand-600" : "bg-slate-200 dark:bg-white/10")}
      >
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow", checked ? "right-0.5" : "left-0.5")} />
      </button>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>}
          {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className, layoutId }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string; layoutId: string }) {
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn("relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", active ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200")}>
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-white/10" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative flex items-center gap-1.5">
              {o.label}
              {o.count != null && <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-brand-500/15 text-brand-700 dark:text-brand-300" : "bg-slate-200/80 text-slate-500 dark:bg-white/10")}>{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
