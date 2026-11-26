import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { animate, motion, useMotionTemplate, useMotionValue, useSpring, useTransform, type Variants } from "motion/react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/format";

export function Aurora({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute -top-1/3 -left-1/4 size-[70vmax] rounded-full bg-[radial-gradient(circle_at_center,rgb(212_168_116/0.28),transparent_62%)] blur-3xl" style={{ opacity: intensity * 0.7 }} />
      <div className="absolute -right-1/4 -bottom-1/3 size-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,rgb(181_107_60/0.16),transparent_62%)] blur-3xl" style={{ opacity: intensity * 0.7 }} />
    </div>
  );
}

/** Thẻ có quầng sáng chạy theo con trỏ chuột. */
export function SpotlightCard({ children, className, glow = "rgb(181 107 60 / 0.1)", style }: { children: ReactNode; className?: string; glow?: string; style?: CSSProperties }) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const bg = useMotionTemplate`radial-gradient(380px circle at ${x}px ${y}px, ${glow}, transparent 70%)`;
  const border = useMotionTemplate`radial-gradient(240px circle at ${x}px ${y}px, rgb(196 138 88 / 0.45), transparent 70%)`;
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };
  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(-400);
        y.set(-400);
      }}
      className={cn("group card relative overflow-hidden", className)}
      style={style}
    >
      <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: border, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", padding: 1 }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("vi-VN"), duration = 1.2, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, duration]);
  return <span className={cn("num", className)}>{format(shown)}</span>;
}

export function fireConfetti(origin?: { x: number; y: number }) {
  const colors = ["#b56b3c", "#d2ae84", "#7d8f6a", "#e7d7c3", "#f2c14e"];
  const base = { particleCount: 70, spread: 75, startVelocity: 42, colors, zIndex: 9999, origin: origin ?? { x: 0.5, y: 0.6 } };
  confetti(base);
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 60, origin: { x: 0, y: 0.7 } }), 160);
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 120, origin: { x: 1, y: 0.7 } }), 260);
}

export function TiltCard({ children, className, max = 10 }: { children: ReactNode; className?: string; max?: number }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  const shine = useMotionTemplate`radial-gradient(500px circle at ${useTransform(mx, (v) => v * 100)}% ${useTransform(my, (v) => v * 100)}%, rgb(255 255 255 / 0.18), transparent 50%)`;
  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      className={cn("relative", className)}
    >
      {children}
      <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: shine }} />
    </motion.div>
  );
}

export function Typewriter({ words, className }: { words: string[]; className?: string }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);
  useEffect(() => {
    const word = words[i % words.length];
    const t = setTimeout(
      () => {
        if (!del) {
          const next = word.slice(0, text.length + 1);
          setText(next);
          if (next === word) setTimeout(() => setDel(true), 1400);
        } else {
          const next = word.slice(0, text.length - 1);
          setText(next);
          if (!next) {
            setDel(false);
            setI((x) => x + 1);
          }
        }
      },
      del ? 35 : 70,
    );
    return () => clearTimeout(t);
  }, [text, del, i, words]);
  return (
    <span className={className}>
      {text}
      <span className="ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] animate-pulse rounded-full bg-current" />
    </span>
  );
}

export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]", className)}>
      <div className="flex shrink-0 animate-marquee items-center gap-12 pr-12 hover:[animation-play-state:paused]">
        {children}
        {children}
      </div>
    </div>
  );
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function Reveal({ children, className, delay = 0, y = 16 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -8% 0px" }} transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export function GradientBorder({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative rounded-3xl p-px", className)}>
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-brand-400 via-brand-600 to-amber-800 opacity-70" />
      <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-white dark:bg-ink-900">{children}</div>
    </div>
  );
}
