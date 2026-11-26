import { useMemo } from "react";

/** Mã QR minh họa sinh từ nội dung chuyển khoản; bản thật dùng chuẩn VietQR/EMVCo. */
export function FakeQR({ text, size = 148 }: { text: string; size?: number }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const n = 25;
    const out: boolean[] = [];
    for (let i = 0; i < n * n; i++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      out.push((h >>> 0) % 100 < 48);
    }
    return { n, out };
  }, [text]);
  const s = size / cells.n;
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x * s} y={y * s} width={7 * s} height={7 * s} fill="#0f172a" rx={s} />
      <rect x={(x + 1) * s} y={(y + 1) * s} width={5 * s} height={5 * s} fill="#fff" rx={s * 0.6} />
      <rect x={(x + 2) * s} y={(y + 2) * s} width={3 * s} height={3 * s} fill="#964f2c" rx={s * 0.5} />
    </g>
  );
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > cells.n - 9 && y < 8) || (x < 8 && y > cells.n - 9);
  return (
    <svg width={size} height={size} className="rounded-xl bg-white p-0">
      {cells.out.map((on, i) => {
        const x = i % cells.n;
        const y = Math.floor(i / cells.n);
        return on && !inFinder(x, y) ? <rect key={i} x={x * s} y={y * s} width={s} height={s} fill="#0f172a" rx={s * 0.3} /> : null;
      })}
      {finder(0, 0)}
      {finder(cells.n - 7, 0)}
      {finder(0, cells.n - 7)}
    </svg>
  );
}
