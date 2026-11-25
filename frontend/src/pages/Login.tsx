import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimationControls } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, Sparkles, UserRound, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import type { Role } from "@/api/types";
import { useAuth, homePathFor } from "@/stores/auth";
import { Aurora } from "@/components/fx";
import { BoardingHouse } from "@/components/fx/BoardingHouse";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/form";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/Topbar";
import { errorMessage } from "@/lib/query";
import { cn } from "@/lib/format";

const roleIcon: Record<Role, typeof Building2> = { OWNER: Building2, STAFF: Wrench, TENANT: UserRound };
const roleColor: Record<Role, string> = { OWNER: "from-brand-700 to-brand-500", STAFF: "from-stone-600 to-stone-400", TENANT: "from-emerald-800 to-emerald-600" };

export default function Login() {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shake = useAnimationControls();
  const { data: demos = [] } = useQuery({ queryKey: ["demo-accounts"], queryFn: api.auth.demoAccounts });

  useEffect(() => {
    if (params.get("expired")) toast.warning("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
  }, [params]);

  if (user && !loading) return <Navigate to={homePathFor(user)} replace />;

  const doLogin = async (e: string, p: string, key: string) => {
    setError(null);
    setLoading(key);
    try {
      const s = await api.auth.login(e, p);
      setSession(s.token, s.user);
      toast.success(`Xin chào ${s.user.fullName}!`);
      const next = params.get("next");
      navigate(next && (s.user.role === "TENANT" ? next.startsWith("/portal") : next.startsWith("/app")) ? next : homePathFor(s.user), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      shake.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.5 } });
      setLoading(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      shake.start({ x: [0, -8, 8, -4, 4, 0], transition: { duration: 0.4 } });
      return;
    }
    doLogin(email, password, "form");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="relative flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="size-4" /> Trang chủ
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Logo />
            <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Chào mừng trở lại 👋</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Đăng nhập để quản lý phòng, hóa đơn và công nợ.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-8">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Sparkles className="size-4 text-brand-500" /> Đăng nhập nhanh tài khoản demo
            </div>
            <div className="grid gap-2.5">
              {demos.map((d, i) => {
                const Icon = roleIcon[d.role];
                return (
                  <motion.button
                    key={d.email}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.07 }}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    disabled={!!loading}
                    onClick={() => doLogin(d.email, d.password, d.email)}
                    className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-brand-500/50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500/0 via-brand-500/5 to-cyan-400/0 opacity-0 transition group-hover:opacity-100" />
                    <div className={cn("relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", roleColor[d.role])}>
                      {loading === d.email ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white">{d.label}</div>
                      <div className="truncate text-xs text-slate-500">{d.description}</div>
                    </div>
                    <ArrowRight className="relative size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-500" />
                  </motion.button>
                );
              })}
              {demos.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10">Đang kết nối máy chủ thật — dùng tài khoản được cấp.</div>}
            </div>
          </motion.div>

          <div className="my-7 flex items-center gap-3 text-center text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="max-w-[11rem] leading-snug">hoặc đăng nhập bằng email</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <motion.form animate={shake} onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input type="email" autoComplete="email" placeholder="ban@vidu.vn" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="size-4" />} error={error ?? undefined} />
            </Field>
            <Field label="Mật khẩu" error={error ?? undefined}>
              <div className="relative">
                <Input type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} icon={<KeyRound className="size-4" />} error={error ?? undefined} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Hiện mật khẩu">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading === "form"}>
              Đăng nhập
            </Button>
            <p className="text-center text-xs text-slate-400">Mật khẩu demo: <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">demo123</span></p>
          </motion.form>
        </div>
      </div>

      <div className="bg-noise relative hidden overflow-hidden bg-ink-950 lg:block">
        <Aurora intensity={0.8} />
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <ShieldCheck className="size-4 text-emerald-400" /> Phân quyền theo khu trọ · JWT · Nhật ký bất biến
          </div>
          <div>
            <BoardingHouse className="mb-6 max-w-xs" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="max-w-lg text-4xl leading-tight font-extrabold">
              “Cuối tháng không còn ngồi cộng sổ đến nửa đêm.”
            </motion.div>
            <p className="mt-4 max-w-md text-white/60">Ghi số, lập hóa đơn hàng loạt, thu tiền nhiều lần và quyết toán cọc — mọi con số đều khớp và truy được nguồn gốc.</p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                ["32", "phòng demo"],
                ["4", "tháng lịch sử"],
                ["30", "user story"],
              ].map(([v, l], i) => (
                <motion.div key={l} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-3xl font-extrabold">{v}</div>
                  <div className="text-xs text-white/50">{l}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/40">BoardingHub · Đồ án cuối kỳ</div>
        </div>
      </div>
    </div>
  );
}
