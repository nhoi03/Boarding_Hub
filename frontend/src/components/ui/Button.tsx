import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success" | "glow";
type Size = "xs" | "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_8px_20px_-8px_rgb(79_70_229/0.7)] hover:from-brand-400 hover:to-brand-600 hover:shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_12px_28px_-8px_rgb(79_70_229/0.8)]",
  glow: "text-white bg-brand-600 shadow-[0_10px_24px_-12px_rgb(122_63_36/0.8)] hover:bg-brand-500",
  secondary:
    "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 dark:bg-white/[0.06] dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/10",
  outline: "border border-brand-500/40 text-brand-600 hover:bg-brand-500/10 dark:text-brand-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white",
  danger: "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_8px_20px_-8px_rgb(225_29_72/0.7)] hover:from-rose-400",
  success: "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_8px_20px_-8px_rgb(5_150_105/0.7)] hover:from-emerald-400",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-lg",
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  to?: string;
}

const base =
  "inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, to, ...props },
  ref,
) {
  const cls = cn(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
});

export function IconButton({ className, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
