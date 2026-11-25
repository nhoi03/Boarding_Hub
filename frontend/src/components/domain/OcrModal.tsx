import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, CheckCircle2, Keyboard, RotateCcw, ScanLine, XCircle } from "lucide-react";
import { api } from "@/api";
import type { ID, Period } from "@/api/types";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/query";
import { num } from "@/lib/format";

type State = { s: "scanning" } | { s: "done"; value: number; confidence: number } | { s: "error"; message: string };

function Digits({ value, blur }: { value: string; blur?: boolean }) {
  return (
    <div className="flex gap-1">
      {value.split("").map((d, i) => (
        <motion.div
          key={`${i}-${d}`}
          initial={{ y: blur ? 0 : -24, opacity: blur ? 0.4 : 0 }}
          animate={{ y: 0, opacity: blur ? 0.4 : 1 }}
          transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
          className={`flex h-12 w-9 items-center justify-center rounded-md bg-slate-950 font-mono text-2xl font-bold text-emerald-400 shadow-inner ${blur ? "blur-[3px]" : ""} ${i >= value.length - 1 ? "text-rose-400" : ""}`}
        >
          {d}
        </motion.div>
      ))}
    </div>
  );
}

export function OcrModal({ open, onClose, meterId, period, label, onUse }: { open: boolean; onClose: () => void; meterId?: ID; period: Period; label: string; onUse: (v: number) => void }) {
  const [state, setState] = useState<State>({ s: "scanning" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open || !meterId) return;
    let alive = true;
    setState({ s: "scanning" });
    api.readings
      .ocr(meterId, period)
      .then((r) => alive && setState({ s: "done", ...r }))
      .catch((e) => alive && setState({ s: "error", message: errorMessage(e) }));
    return () => {
      alive = false;
    };
  }, [open, meterId, period, attempt]);

  const value = state.s === "done" ? String(state.value).padStart(6, "0") : "000000";

  return (
    <Modal open={open} onClose={onClose} size="sm" icon={<Camera className="size-5" />} title="Đọc chỉ số bằng ảnh (OCR)" description={`${label} — kết quả chỉ là gợi ý, cần người ghi xác nhận (AC-009-01).`}>
      <div className="relative mx-auto mt-2 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 p-6 shadow-2xl">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,rgba(255,255,255,.25),transparent_50%)]" />
        <div className="relative mx-auto w-fit rounded-2xl border-4 border-slate-600 bg-slate-800 p-4">
          <div className="mb-2 text-center text-[10px] font-semibold tracking-[0.3em] text-slate-400">KWH · M³</div>
          <Digits value={value} blur={state.s !== "done"} />
        </div>
        <AnimatePresence>
          {state.s === "scanning" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-4 h-0.5 animate-scan bg-cyan-400 shadow-[0_0_20px_4px_rgba(34,211,238,0.7)]" />
              {["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
                <div key={c} className={`absolute size-6 rounded-sm border-cyan-400 ${c}`} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 min-h-[110px]">
        <AnimatePresence mode="wait">
          {state.s === "scanning" && (
            <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-sm text-slate-500">
              <ScanLine className="size-6 animate-pulse text-cyan-500" />
              Đang nhận dạng chữ số…
            </motion.div>
          )}
          {state.s === "done" && (
            <motion.div key="d" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
                <div>
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Giá trị gợi ý</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{num(state.value)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Độ tin cậy</div>
                  <div className="text-lg font-bold text-emerald-600">{Math.round(state.confidence * 100)}%</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" icon={<Keyboard className="size-4" />} onClick={onClose}>
                  Tự nhập
                </Button>
                <Button
                  variant="success"
                  className="flex-1"
                  icon={<CheckCircle2 className="size-4" />}
                  onClick={() => {
                    onUse(state.value);
                    onClose();
                  }}
                >
                  Dùng giá trị này
                </Button>
              </div>
            </motion.div>
          )}
          {state.s === "error" && (
            <motion.div key="e" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300">
                <XCircle className="size-5 shrink-0" />
                {state.message}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" icon={<RotateCcw className="size-4" />} onClick={() => setAttempt((a) => a + 1)}>
                  Chụp lại
                </Button>
                <Button className="flex-1" icon={<Keyboard className="size-4" />} onClick={onClose}>
                  Nhập tay
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
