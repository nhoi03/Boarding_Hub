import type { ISODate, Period } from "@/api/types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): ISODate {
  return toISODate(new Date());
}

/** Ngày theo giờ địa phương của một mốc thời gian ISO (UTC); chuỗi ngày thuần được giữ nguyên. */
export function localDate(s: string): ISODate {
  return s.length > 10 ? toISODate(new Date(s)) : s;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(s: ISODate, months: number): ISODate {
  const d = parseISODate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

export function periodOf(s: ISODate): Period {
  return s.slice(0, 7);
}

export function currentPeriod(): Period {
  return periodOf(today());
}

export function addPeriods(p: Period, n: number): Period {
  return periodOf(addMonths(`${p}-01`, n));
}

export function periodStart(p: Period): ISODate {
  return `${p}-01`;
}

export function periodEnd(p: Period): ISODate {
  return addDays(addMonths(`${p}-01`, 1), -1);
}

export function periodLabel(p: Period, short = false): string {
  const [y, m] = p.split("-");
  return short ? `T${Number(m)}/${y.slice(2)}` : `Tháng ${Number(m)}/${y}`;
}

export function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = parseISODate(localDate(s));
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeTime(s: string): string {
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} ngày trước`;
  return fmtDate(s);
}
