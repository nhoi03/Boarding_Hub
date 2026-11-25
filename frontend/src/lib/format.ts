import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const vnd = new Intl.NumberFormat("vi-VN");

export function money(n: number, withUnit = true): string {
  const s = vnd.format(Math.round(n));
  return withUnit ? `${s} đ` : s;
}

export function compactMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace(".", ",")} tỷ`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e8 ? 0 : 1).replace(".", ",")} tr`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

export function num(n: number, digits = 0): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(n);
}

export function parseMoney(s: string): number {
  const n = Number(s.replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[parts.length - 2][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function removeDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

export function matches(haystack: string, needle: string): boolean {
  return removeDiacritics(haystack).includes(removeDiacritics(needle.trim()));
}
