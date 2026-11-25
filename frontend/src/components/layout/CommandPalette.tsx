import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CornerDownLeft, DoorOpen, FileText, Loader2, Moon, ReceiptText, Search, User, Zap } from "lucide-react";
import { api } from "@/api";
import { useUI } from "@/stores/ui";
import { useAuth } from "@/stores/auth";
import { NAV, QUICK_ACTIONS } from "./nav";
import { cn, matches } from "@/lib/format";
import { Kbd } from "@/components/ui/primitives";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

function useDebounced<T>(v: T, ms = 180) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const typeIcon = { room: DoorOpen, person: User, contract: FileText, invoice: ReceiptText };
const typeGroup = { room: "Phòng", person: "Người thuê", contract: "Hợp đồng", invoice: "Hóa đơn" };

export function CommandPalette() {
  const { commandOpen: open, setCommandOpen, toggleTheme } = useUI();
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dq = useDebounced(q);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!useUI.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setCommandOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", dq],
    queryFn: () => api.search(dq),
    enabled: open && dq.trim().length > 0 && user?.role !== "TENANT",
    staleTime: 30_000,
  });

  const go = (to: string) => {
    setCommandOpen(false);
    navigate(to);
  };

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    const nav = NAV.filter((n) => user && n.roles.includes(user.role));
    const actions = user?.role === "TENANT" ? [] : QUICK_ACTIONS;
    for (const a of actions) if (!q || matches(`${a.label} ${a.keywords}`, q)) out.push({ id: a.to, group: "Thao tác nhanh", label: a.label, icon: a.icon, run: () => go(a.to) });
    for (const n of nav) if (!q || matches(`${n.label} ${n.keywords ?? ""}`, q)) out.push({ id: n.to, group: "Đi tới", label: n.label, icon: n.icon, run: () => go(n.to) });
    if (!q || matches("che do toi sang giao dien theme", q)) out.push({ id: "theme", group: "Giao diện", label: "Đổi chế độ sáng / tối", icon: Moon, run: () => { setCommandOpen(false); toggleTheme(); } });
    for (const r of results ?? []) out.push({ id: `${r.type}-${r.id}`, group: typeGroup[r.type], label: r.title, hint: r.subtitle, icon: typeIcon[r.type], run: () => go(r.link) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, results, user]);

  useEffect(() => setActive(0), [q, results]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      items[active]?.run();
    } else if (e.key === "Escape") setCommandOpen(false);
  };

  useEffect(() => {
    document.querySelector(`[data-cmd-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const groups = [...new Set(items.map((i) => i.group))];
  let idx = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCommandOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-brand-900/20 dark:border-white/10 dark:bg-ink-900"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-white/[0.06]">
              {isFetching ? <Loader2 className="size-5 animate-spin text-brand-500" /> : <Search className="size-5 text-slate-400" />}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Tìm phòng, người thuê, hợp đồng, hóa đơn hoặc gõ lệnh…"
                className="h-14 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <Kbd>ESC</Kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {items.length === 0 && !isFetching && <div className="px-4 py-10 text-center text-sm text-slate-500">Không tìm thấy kết quả cho “{q}”.</div>}
              {groups.map((g) => (
                <div key={g} className="mb-1">
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{g}</div>
                  {items
                    .filter((i) => i.group === g)
                    .map((it) => {
                      idx++;
                      const i = idx;
                      const on = i === active;
                      return (
                        <button
                          key={it.id}
                          data-cmd-idx={i}
                          onMouseMove={() => setActive(i)}
                          onClick={it.run}
                          className={cn("relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors", on ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300")}
                        >
                          {on && <motion.div layoutId="cmd-active" className="absolute inset-0 rounded-xl bg-brand-500/10 ring-1 ring-brand-500/20" transition={{ type: "spring", stiffness: 600, damping: 40 }} />}
                          <div className={cn("relative flex size-8 items-center justify-center rounded-lg", on ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" : "bg-slate-100 text-slate-500 dark:bg-white/5")}>
                            <it.icon className="size-4" />
                          </div>
                          <div className="relative min-w-0 flex-1">
                            <div className="truncate font-medium">{it.label}</div>
                            {it.hint && <div className="truncate text-xs text-slate-500 dark:text-slate-400">{it.hint}</div>}
                          </div>
                          {on && <ArrowRight className="relative size-4 text-brand-500" />}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> di chuyển
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>
                    <CornerDownLeft className="size-3" />
                  </Kbd>{" "}
                  mở
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Zap className="size-3 text-brand-500" /> BoardingHub Command
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
