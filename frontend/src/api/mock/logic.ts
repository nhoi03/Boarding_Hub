import type { Contract, ID, Invoice, InvoiceItem, Meter, Payment, Period, Service } from "../types";
import type { DB } from "./db";
import { fmtDate, periodEnd, periodLabel, periodStart, today } from "@/lib/date";
import { num, money } from "@/lib/format";

/**
 * Quy tắc nghiệp vụ dùng chung cho bộ sinh dữ liệu mẫu và API giả lập.
 * Số dư, công nợ, cọc khả dụng luôn tính lại từ lịch sử chứng từ, không lưu cứng.
 */

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function priceAt(s: Service, period: Period): number {
  const start = periodStart(period);
  const sorted = [...s.priceHistory].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let price = sorted[0]?.unitPrice ?? s.unitPrice;
  for (const h of sorted) if (h.effectiveFrom <= start) price = h.unitPrice;
  return price;
}

export function rentAt(d: DB, contractId: ID, onDate: string): number {
  const rates = d.rentRates.filter((r) => r.contractId === contractId).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let amount = rates[0]?.amount ?? 0;
  for (const r of rates) if (r.effectiveFrom <= onDate) amount = r.amount;
  return amount;
}

export function currentRent(d: DB, contractId: ID): number {
  return rentAt(d, contractId, today());
}

export function confirmedReading(d: DB, meterId: ID, period: Period) {
  return d.readings.find((r) => r.meterId === meterId && r.period === period && r.status === "CONFIRMED");
}

export function previousValue(d: DB, meter: Meter, period: Period): number {
  const prior = d.readings
    .filter((r) => r.meterId === meter.id && r.status === "CONFIRMED" && r.period < period)
    .sort((a, b) => b.period.localeCompare(a.period))[0];
  return prior ? prior.currentValue : meter.initialValue;
}

export function occupantsInPeriod(d: DB, contractId: ID, period: Period) {
  const s = periodStart(period);
  const e = periodEnd(period);
  return d.occupancies.filter(
    (o) =>
      o.contractId === contractId &&
      (o.status === "ACTIVE" || o.status === "ENDED") &&
      o.moveInDate <= e &&
      (!o.moveOutDate || o.moveOutDate >= s),
  );
}

export function computeInvoiceDraft(d: DB, contract: Contract, period: Period, nextItemId: () => ID) {
  const items: InvoiceItem[] = [];
  const missing: string[] = [];
  const rent = rentAt(d, contract.id, periodStart(period));
  const midStart = contract.startDate > periodStart(period);
  items.push({
    id: nextItemId(),
    kind: "RENT",
    description: `Tiền phòng ${periodLabel(period)}`,
    quantity: 1,
    unit: "tháng",
    unitPrice: rent,
    amount: rent,
    formula: midStart
      ? `Vào ở ${fmtDate(contract.startDate)}; chính sách tính theo ngày (Q02) chưa duyệt nên tính đủ tháng`
      : `Giá thuê hiệu lực từ đầu kỳ: ${money(rent)}`,
  });

  for (const s of d.services) {
    const price = priceAt(s, period);
    if (s.method === "METERED") {
      const meter = d.meters.find((m) => m.roomId === contract.roomId && m.serviceId === s.id && m.status === "ACTIVE");
      if (!meter) continue;
      const reading = confirmedReading(d, meter.id, period);
      if (!reading) {
        missing.push(`Chỉ số ${s.name.toLowerCase()} chưa được xác nhận`);
        continue;
      }
      const qty = reading.currentValue - reading.previousValue;
      items.push({
        id: nextItemId(),
        kind: s.code === "ELECTRIC" ? "ELECTRIC" : s.code === "WATER" ? "WATER" : "SERVICE",
        description: s.name,
        quantity: qty,
        unit: s.unit,
        unitPrice: price,
        amount: Math.round(qty * price),
        formula: `(${num(reading.currentValue)} − ${num(reading.previousValue)}) = ${num(qty)} ${s.unit} × ${money(price)}`,
      });
    } else if (s.method === "PER_ROOM" || s.method === "FIXED") {
      items.push({
        id: nextItemId(),
        kind: "SERVICE",
        description: s.name,
        quantity: 1,
        unit: s.unit,
        unitPrice: price,
        amount: price,
        formula: `1 ${s.unit} × ${money(price)}`,
      });
    } else if (s.method === "PER_PERSON") {
      const n = occupantsInPeriod(d, contract.id, period).length;
      if (n === 0) continue;
      items.push({
        id: nextItemId(),
        kind: "SERVICE",
        description: s.name,
        quantity: n,
        unit: s.unit,
        unitPrice: price,
        amount: n * price,
        formula: `${n} người ở trong kỳ × ${money(price)}`,
      });
    }
  }
  return { items, missing, subtotal: sum(items.map((i) => i.amount)) };
}

export function invoiceTotal(inv: Invoice): number {
  return inv.subtotal + sum(inv.adjustments.map((a) => a.amount));
}

export function invoicePaid(d: DB, invoiceId: ID): number {
  let paid = 0;
  for (const p of d.payments) {
    if (p.status !== "CONFIRMED") continue;
    for (const a of p.allocations) if (a.invoiceId === invoiceId && a.status === "ACTIVE") paid += a.amount;
  }
  return paid;
}

export function invoiceBalance(d: DB, inv: Invoice): number {
  if (inv.status === "DRAFT" || inv.status === "CANCELLED") return 0;
  return Math.max(0, invoiceTotal(inv) - invoicePaid(d, inv.id));
}

export function refreshInvoiceStatus(d: DB, inv: Invoice) {
  if (inv.status === "DRAFT" || inv.status === "CANCELLED") return;
  const paid = invoicePaid(d, inv.id);
  const total = invoiceTotal(inv);
  inv.status = paid >= total ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "ISSUED";
}

export function isOverdue(d: DB, inv: Invoice): boolean {
  return !!inv.dueDate && inv.dueDate < today() && invoiceBalance(d, inv) > 0;
}

export function contractBalance(d: DB, contractId: ID): number {
  return sum(d.invoices.filter((i) => i.contractId === contractId).map((i) => invoiceBalance(d, i)));
}

export function depositReceived(d: DB, contractId: ID): number {
  return sum(d.deposits.filter((t) => t.contractId === contractId && t.type === "RECEIVE").map((t) => t.amount));
}

export function depositAvailable(d: DB, contractId: ID): number {
  let v = 0;
  for (const t of d.deposits) {
    if (t.contractId !== contractId) continue;
    v += t.type === "RECEIVE" ? t.amount : -t.amount;
  }
  return Math.max(0, v);
}

export function paymentAllocated(p: Payment): number {
  return sum(p.allocations.filter((a) => a.status === "ACTIVE").map((a) => a.amount));
}

export function paymentUnallocated(p: Payment): number {
  if (p.status !== "CONFIRMED") return 0;
  return Math.max(0, p.amount - paymentAllocated(p) - p.refundedAmount);
}

/** Phân bổ tiền vào các hóa đơn còn nợ theo thứ tự cũ trước (FIFO). */
export function autoAllocate(d: DB, contractId: ID, amount: number) {
  const open = d.invoices
    .filter((i) => i.contractId === contractId && invoiceBalance(d, i) > 0)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.id - b.id);
  const out: { invoiceId: ID; amount: number }[] = [];
  let left = amount;
  for (const inv of open) {
    if (left <= 0) break;
    const take = Math.min(left, invoiceBalance(d, inv));
    out.push({ invoiceId: inv.id, amount: take });
    left -= take;
  }
  return out;
}

/** Công thức quyết toán trả phòng (US-012, AC-012-02/03): cọc không bao giờ âm. */
export function settle(outstandingDebt: number, extraDeductions: number, depositAvail: number) {
  const totalObligation = outstandingDebt + extraDeductions;
  const depositUsed = Math.min(depositAvail, totalObligation);
  return {
    outstandingDebt,
    extraDeductions,
    totalObligation,
    depositAvailable: depositAvail,
    depositUsed,
    refundAmount: depositAvail - depositUsed,
    extraCharge: totalObligation - depositUsed,
  };
}
