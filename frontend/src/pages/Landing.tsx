import { useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileClock,
  Fingerprint,
  Gauge,
  History,
  Home,
  LayoutGrid,
  Lock,
  Menu,
  QrCode,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Undo2,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Aurora, CountUp, Marquee, Reveal, SpotlightCard, Typewriter } from "@/components/fx";
import { BoardingHouse } from "@/components/fx/BoardingHouse";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/Topbar";
import { useAuth, homePathFor } from "@/stores/auth";
import { cn } from "@/lib/format";

const features = [
  { icon: LayoutGrid, title: "Sơ đồ phòng trực quan", desc: "Nhìn một lần biết phòng nào trống, đang thuê, đang bảo trì hay còn nợ. Lọc theo tầng, theo khu.", span: "md:col-span-2", color: "from-brand-600 to-brand-400" },
  { icon: ScanLine, title: "Đọc chỉ số bằng OCR", desc: "Chụp đồng hồ, hệ thống gợi ý số. Người ghi luôn xác nhận lại trước khi tính tiền.", color: "from-stone-600 to-stone-400" },
  { icon: ReceiptText, title: "Lập hóa đơn cả khu trong 30 giây", desc: "Tự lấy giá theo ngày hiệu lực, chỉ số đã xác nhận, số người ở. Bấm lại cũng không sinh hóa đơn trùng.", color: "from-amber-800 to-amber-600" },
  { icon: Wallet, title: "Thu nhiều lần, công nợ tự động", desc: "Khách trả 600k rồi 400k? Phân bổ đúng hóa đơn, nợ tự giảm, tiền dư tách riêng.", span: "md:col-span-2", color: "from-emerald-800 to-emerald-600" },
  { icon: CircleDollarSign, title: "Quyết toán cọc minh bạch", desc: "Nợ + khấu trừ được duyệt → cấn cọc → hoàn hoặc thu thêm. Cọc không bao giờ âm.", color: "from-brand-700 to-brand-500" },
  { icon: History, title: "Nhật ký không thể xóa", desc: "Ai sửa giá, ai thu tiền, ai hủy phiếu — đều có người, thời điểm, giá trị trước/sau.", color: "from-stone-500 to-stone-400" },
  { icon: Smartphone, title: "Cổng người thuê", desc: "Người thuê tự xem hóa đơn, lịch sử đóng tiền, báo hỏng — bớt tin nhắn hỏi đi hỏi lại.", color: "from-amber-700 to-amber-500" },
];

const steps = [
  { icon: Gauge, title: "Ghi chỉ số", desc: "Nhập tay hoặc chụp ảnh; chặn số mới nhỏ hơn số cũ." },
  { icon: ReceiptText, title: "Lập hóa đơn", desc: "Hàng loạt, có công thức từng dòng, chống trùng kỳ." },
  { icon: Wallet, title: "Thu tiền", desc: "Tiền mặt, chuyển khoản, ví; thu nhiều lần đều khớp." },
  { icon: BadgeCheck, title: "Đối soát", desc: "Mọi con số trên báo cáo đều mở ra được chứng từ gốc." },
];

const principles = [
  { icon: Undo2, title: "Không tẩy xóa tiền", desc: "Ghi sai thì hủy có lý do và ghi bút toán mới; phiếu gốc vẫn còn." },
  { icon: Gauge, title: "Số dư tính từ lịch sử", desc: "Công nợ, cọc, quỹ không lưu cứng — luôn cộng lại từ chứng từ." },
  { icon: FileClock, title: "Tạo phiên bản, không sửa đè", desc: "Gia hạn, đổi giá đều lưu phiên bản; hóa đơn cũ giữ nguyên." },
  { icon: Fingerprint, title: "Bấm hai lần không thu hai lần", desc: "Mỗi thao tác tiền có khóa chống lặp (idempotency)." },
];

const plans = [
  { name: "Khởi đầu", price: 0, unit: "Miễn phí mãi mãi", desc: "Cho chủ trọ mới bắt đầu số hóa.", features: ["Tối đa 10 phòng", "Hóa đơn & phiếu thu", "Cổng người thuê", "Sao lưu hằng tuần"], cta: "Bắt đầu miễn phí" },
  { name: "Chuyên nghiệp", price: 149000, unit: "/ tháng", desc: "Cho chủ trọ 1–3 khu đang vận hành.", features: ["Tối đa 60 phòng", "OCR chỉ số không giới hạn", "Nhắc nợ tự động qua Zalo/SMS", "Nhân viên & phân quyền theo khu", "Báo cáo dòng tiền"], cta: "Dùng thử 30 ngày", featured: true },
  { name: "Doanh nghiệp", price: 399000, unit: "/ tháng", desc: "Chuỗi nhà trọ, căn hộ dịch vụ.", features: ["Không giới hạn phòng & khu", "Thu tiền qua VietQR tự đối soát", "API & xuất kế toán", "Nhật ký & sao lưu nâng cao", "Hỗ trợ ưu tiên 24/7"], cta: "Liên hệ tư vấn" },
];

const faqs = [
  { q: "Dữ liệu tiền có bị sửa lén được không?", a: "Không. Hóa đơn đã phát hành và phiếu thu không sửa đè được. Muốn đổi phải lập điều chỉnh hoặc hủy có lý do, và mọi thay đổi đều vào nhật ký không thể xóa." },
  { q: "Khách đóng tiền nhiều lần thì sao?", a: "Mỗi lần thu là một phiếu, được phân bổ vào đúng hóa đơn. Công nợ tự giảm, tiền thừa được giữ riêng để hoàn hoặc trừ kỳ sau." },
  { q: "Trả phòng tính cọc thế nào?", a: "Hệ thống cộng nợ còn lại với các khoản khấu trừ đã duyệt, cấn vào cọc khả dụng, rồi cho ra số phải hoàn hoặc phải thu thêm. Bấm xác nhận hai lần cũng chỉ hoàn một lần." },
  { q: "Tôi có cần cài đặt gì không?", a: "Không. BoardingHub chạy trên trình duyệt, điện thoại và máy tính. Người thuê chỉ cần đường dẫn và tài khoản được cấp." },
];

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <BoardingHouse />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="glass absolute top-10 left-0 hidden items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-lg sm:flex">
        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-800 text-white">
          <Check className="size-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900 dark:text-white">Phòng 101 đã thu đủ</div>
          <div className="text-[11px] text-slate-500">+ 2.450.000 đ · chuyển khoản</div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="glass absolute right-0 bottom-8 hidden items-center gap-2.5 rounded-2xl px-3.5 py-2.5 shadow-lg sm:flex">
        <div className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-white">
          <Home className="size-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900 dark:text-white">2 tầng · 12 phòng</div>
          <div className="text-[11px] text-slate-500">Hiên trước, 2 phòng trống</div>
        </div>
      </motion.div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200 dark:divide-white/10">
      {faqs.map((f, i) => (
        <div key={f.q} className="py-4">
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 text-left">
            <span className="font-semibold text-slate-900 dark:text-white">{f.q}</span>
            <ChevronDown className={cn("size-5 shrink-0 text-slate-400 transition-transform", open === i && "rotate-180 text-brand-500")} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden pt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {f.a}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const user = useAuth((s) => s.user);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.2]);
  const navBg = useTransform(scrollY, [0, 80], [0, 1]);
  const [yearly, setYearly] = useState(false);
  const [menu, setMenu] = useState(false);
  const cta = user ? homePathFor(user) : "/login";
  const sections = [
    ["#tinh-nang", "Tính năng"],
    ["#quy-trinh", "Quy trình"],
    ["#nguyen-tac", "Nguyên tắc tiền"],
    ["#bang-gia", "Bảng giá"],
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f6f1ea] dark:bg-ink-950">
      <motion.header className="fixed inset-x-0 top-0 z-50">
        <motion.div style={{ opacity: navBg }} className="absolute inset-0 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-white/[0.06] dark:bg-ink-950/70" />
        <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-6 sm:px-5">
          <Link to="/" className="min-w-0">
            <Logo className="[&>div:last-child]:max-[359px]:hidden" />
          </Link>
          <nav className="ml-4 hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            {sections.map(([h, l]) => (
              <a key={h} href={h} className="transition hover:text-brand-600 dark:hover:text-white">
                {l}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Button to={cta} variant="ghost" size="sm" className="hidden sm:inline-flex">
              {user ? "Vào ứng dụng" : "Đăng nhập"}
            </Button>
            <Button to={cta} variant="glow" size="sm" icon={<Sparkles className="size-4" />} className="px-2.5 sm:px-3">
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">Trải nghiệm demo</span>
            </Button>
            <button type="button" className="inline-flex size-9 items-center justify-center rounded-xl text-slate-600 md:hidden dark:text-slate-300" aria-label="Mở menu trang chủ" onClick={() => setMenu(true)}>
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </motion.header>
      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-[70] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-slate-950/40" aria-label="Đóng menu" onClick={() => setMenu(false)} />
            <motion.nav initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="absolute inset-x-3 top-3 rounded-2xl border border-[#e7dccb] bg-[#fffdf9] p-3 shadow-xl dark:border-white/10 dark:bg-ink-900">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Mục lục</span>
                <button type="button" aria-label="Đóng" onClick={() => setMenu(false)} className="rounded-lg p-1.5 text-slate-500">
                  <X className="size-4" />
                </button>
              </div>
              {sections.map(([h, l]) => (
                <a key={h} href={h} onClick={() => setMenu(false)} className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-brand-500/10 dark:text-slate-200">
                  {l}
                </a>
              ))}
              <Button to={cta} className="mt-2 w-full">
                {user ? "Vào ứng dụng" : "Đăng nhập"}
              </Button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="bg-noise relative overflow-hidden pt-32 pb-20 sm:pt-40">
        <Aurora />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2">
          <div>
            <motion.a href="#tinh-nang" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass inline-flex max-w-full items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-medium text-slate-700 shadow-sm dark:text-slate-300">
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">MỚI</span>
              Đọc chỉ số điện nước bằng camera
              <ArrowRight className="size-3.5" />
            </motion.a>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              Quản lý nhà trọ
              <br />
              <span className="text-gradient">
                <Typewriter words={["không cần sổ sách.", "không thất thu.", "minh bạch từng đồng.", "trong một chạm."]} />
              </span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }} className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Phòng, hợp đồng, điện nước, hóa đơn, công nợ và quyết toán cọc trong một nơi. Mỗi con số đều truy được về chứng từ gốc — chủ trọ yên tâm, người thuê tin tưởng.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-wrap gap-3">
              <Button to={cta} size="lg" variant="glow" icon={<Zap className="size-5" />}>
                Vào bản demo ngay
              </Button>
              <Button size="lg" variant="secondary" onClick={() => document.getElementById("quy-trinh")?.scrollIntoView({ behavior: "smooth" })}>
                Xem cách hoạt động
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 grid max-w-lg grid-cols-3 gap-6">
              {[
                { v: 30, s: " giây", l: "lập hóa đơn cả khu" },
                { v: 0, s: " đồng", l: "lệch giữa sổ và báo cáo" },
                { v: 100, s: "%", l: "thao tác tiền có nhật ký" },
              ].map((x) => (
                <div key={x.l}>
                  <div className="text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
                    <CountUp value={x.v} duration={1.8} />
                    <span className="text-gradient">{x.s}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{x.l}</div>
                </div>
              ))}
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <HeroMockup />
          </motion.div>
        </motion.div>
      </section>

      <section className="border-y border-slate-100 py-6 dark:border-white/5">
        <Marquee className="text-sm font-semibold text-slate-400">
          {["Hợp đồng có phiên bản", "Cọc theo dõi riêng", "Chống thu trùng", "OCR có kiểm tra", "Phân quyền theo khu", "Nhật ký bất biến", "Cổng người thuê", "Nhắc nợ tự động", "Quyết toán trả phòng", "Báo cáo đối soát"].map((t) => (
            <span key={t} className="flex items-center gap-2 whitespace-nowrap">
              <Sparkles className="size-4 text-brand-400" /> {t}
            </span>
          ))}
        </Marquee>
      </section>

      <section id="tinh-nang" className="relative mx-auto max-w-7xl scroll-mt-20 px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-300">Tính năng</div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">Mọi việc của một nhà trọ, gói gọn trong một màn hình</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Thiết kế theo đúng quy trình thật: từ lúc khách đến xem phòng đến lúc trả phòng hoàn cọc.</p>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06} className={f.span}>
              <SpotlightCard className="h-full p-6">
                <div className={cn("flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", f.color)}>
                  <f.icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="quy-trinh" className="relative scroll-mt-20 overflow-hidden bg-slate-50 py-24 dark:bg-ink-900/40">
        <div className="relative mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-300">Quy trình hằng tháng</div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">Bốn bước, cuối tháng nhẹ tênh</h2>
          </Reveal>
          <div className="relative mt-16 grid gap-6 md:grid-cols-4">
            <div className="absolute top-8 right-[12%] left-[12%] hidden h-0.5 md:block">
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} className="h-full origin-left bg-brand-500" />
            </div>
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={0.2 + i * 0.15} className="relative text-center">
                <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-white shadow-xl ring-1 shadow-brand-500/10 ring-slate-200 dark:bg-ink-800 dark:ring-white/10">
                  <s.icon className="size-7 text-brand-500" />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                </div>
                <h3 className="mt-5 font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="nguyen-tac" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="text-sm font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-300">Nguyên tắc tiền bạc</div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">Tiền đã ghi là không mất dấu</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Bốn nguyên tắc được cài ngay trong cơ sở dữ liệu (trigger, ràng buộc, khóa chống lặp), không phụ thuộc vào việc người dùng có cẩn thận hay không.</p>
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <ShieldCheck className="size-10 shrink-0 text-emerald-500" />
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <b className="text-slate-900 dark:text-white">68/68 kiểm thử ràng buộc đạt</b> — chặn cọc âm, hóa đơn trùng kỳ, sửa chứng từ đã chốt, hai hợp đồng trên một phòng.
              </div>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <SpotlightCard className="h-full p-5">
                  <p.icon className="size-6 text-brand-500" />
                  <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{p.desc}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="bang-gia" className="relative scroll-mt-20 overflow-hidden py-24">
        <Aurora intensity={0.5} />
        <div className="relative mx-auto max-w-7xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-300">Bảng giá</div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">Rẻ hơn một bữa cà phê mỗi phòng</h2>
            <div className="mt-6 inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
              {[false, true].map((y) => (
                <button key={String(y)} onClick={() => setYearly(y)} className={cn("relative rounded-full px-4 py-1.5 text-sm font-semibold transition", yearly === y ? "text-white" : "text-slate-600 dark:text-slate-400")}>
                  {yearly === y && <motion.span layoutId="billing-toggle" transition={{ type: "spring", stiffness: 320, damping: 34 }} className="absolute inset-0 rounded-full bg-brand-600" />}
                  <span className="relative">{y ? "Theo năm −20%" : "Theo tháng"}</span>
                </button>
              ))}
            </div>
          </Reveal>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((p, i) => {
              const price = yearly ? Math.round((p.price * 0.8) / 1000) * 1000 : p.price;
              const body = (
                <div className={cn("flex h-full flex-col p-7", !p.featured && "card")}>
                  {p.featured && <div className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Phổ biến nhất</div>}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{price === 0 ? "0đ" : `${(price / 1000).toLocaleString("vi-VN")}k`}</span>
                    <span className="pb-1 text-sm text-slate-500">{p.unit}</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button to={cta} variant={p.featured ? "glow" : "secondary"} className="mt-8 w-full">
                    {p.cta}
                  </Button>
                </div>
              );
              return (
                <Reveal key={p.name} delay={i * 0.1} className={cn(p.featured && "lg:-mt-4 lg:mb-4")}>
                  {p.featured ? <div className="h-full rounded-3xl ring-2 ring-brand-500/50">{body}</div> : body}
                </Reveal>
              );
            })}
          </div>
          <Reveal className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: QrCode, t: "Thu qua VietQR", d: "Phí 0,3%/giao dịch, tự khớp phiếu thu" },
              { icon: BellRing, t: "Nhắc nợ Zalo ZNS", d: "300đ/tin, gửi đúng người đúng hạn" },
              { icon: Lock, t: "Lưu trữ hồ sơ", d: "Ảnh bàn giao, PDF hợp đồng có mã hóa" },
            ].map((a) => (
              <div key={a.t} className="glass flex items-center gap-3 rounded-2xl p-4">
                <a.icon className="size-8 text-brand-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{a.t}</div>
                  <div className="text-xs text-slate-500">{a.d}</div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <Reveal className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Câu hỏi thường gặp</h2>
        </Reveal>
        <Faq />
      </section>

      <section className="px-5 pb-24">
        <Reveal className="bg-noise relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand-700 px-8 py-16 text-center text-white">
          <div className="bg-grid absolute inset-0 opacity-30" />
          <div className="relative">
            <Building2 className="mx-auto size-12 opacity-90" />
            <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl">Sẵn sàng số hóa nhà trọ của bạn?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">Dùng ngay bản demo với dữ liệu thật: 2 khu, 32 phòng, 4 tháng hóa đơn — đăng nhập một chạm, không cần đăng ký.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to={cta} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-brand-700 shadow-lg transition hover:scale-[1.03] active:scale-95">
                <Users className="size-5" /> Đăng nhập demo
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-100 py-10 dark:border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <span>© {new Date().getFullYear()} BoardingHub · Đồ án cuối kỳ · React + Spring Boot</span>
        </div>
      </footer>
    </div>
  );
}
