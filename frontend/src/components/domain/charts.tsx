import type { TooltipContentProps } from "recharts";
import { money } from "@/lib/format";

export function ChartTooltip({ active, payload, label, labelFormatter }: Partial<Omit<TooltipContentProps<number, string>, "labelFormatter">> & { labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur dark:border-white/10 dark:bg-ink-800/95">
      <div className="mb-1.5 text-xs font-semibold text-slate-500">{labelFormatter ? labelFormatter(String(label)) : String(label)}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 text-sm">
          <span className="size-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
          <span className="num ml-auto pl-4 font-semibold text-slate-900 dark:text-white">{money(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}
