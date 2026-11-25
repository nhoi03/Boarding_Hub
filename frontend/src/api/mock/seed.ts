import type {
  Contract,
  ID,
  ISODate,
  MaintenancePriority,
  MaintenanceStatus,
  Payment,
  PaymentMethod,
  Period,
  Person,
  Room,
  RoomStatus,
} from "../types";
import type { DB } from "./db";
import { addDays, addMonths, addPeriods, currentPeriod, periodEnd, periodLabel, periodOf, periodStart, today } from "@/lib/date";
import { removeDiacritics } from "@/lib/format";
import { computeInvoiceDraft, refreshInvoiceStatus, invoiceTotal } from "./logic";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAMILY = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương", "Lý", "Phan", "Võ"];
const MIDDLE = ["Văn", "Thị", "Minh", "Thu", "Đức", "Ngọc", "Thanh", "Hải", "Quang", "Bảo", "Gia", "Khánh", "Hoài", "Tuấn"];
const GIVEN = ["Bình", "Chi", "Dũng", "Giang", "Hà", "Hùng", "Huyền", "Khoa", "Lan", "Linh", "Long", "Mai", "Nam", "Ngân", "Phong", "Phương", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Tuấn", "Vy", "Yến", "Đạt", "Hiếu", "Nhung", "Tú", "Kiên", "Hạnh", "Duy", "Hằng"];
const HOMETOWN = ["Nam Định", "Thái Bình", "Nghệ An", "Thanh Hóa", "Hải Dương", "Bắc Ninh", "Phú Thọ", "Hưng Yên", "Ninh Bình", "Hà Tĩnh", "Quảng Ninh", "Lào Cai", "Tuyên Quang", "Vĩnh Phúc"];
const AMENITIES = ["Điều hòa", "Nóng lạnh", "Ban công", "Gác xép", "WC riêng", "Tủ lạnh", "Máy giặt", "Cửa sổ lớn", "Bếp riêng", "Giường tủ"];
const METHODS: PaymentMethod[] = ["BANK_TRANSFER", "BANK_TRANSFER", "BANK_TRANSFER", "CASH", "E_WALLET"];

const VACANT = new Set(["CG-204", "CG-402", "CG-405", "TX-102", "TX-302"]);
const MAINT = new Set(["CG-305", "TX-203"]);
const INACTIVE = new Set(["TX-304"]);
const HISTORY_ONLY = "CG-104";
const EXPIRING = new Set(["CG-203", "TX-201"]);
const DEPOSIT_SHORT = new Set(["CG-202", "TX-103"]);
const OLD_DEBT = new Set(["CG-303", "TX-104"]);
const UNISSUED = "TX-204";
const UNBILLED = "TX-202";
const OVERPAID = "CG-301";
const TWO_INSTALLMENTS = "CG-102";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function buildSeed(version: number): DB {
  const r = mulberry32(20261124);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const T = today();
  const curP = currentPeriod();
  const firstP = addPeriods(curP, -5);
  const lastBilled = addPeriods(curP, -1);
  const at = (date: ISODate, h = 9) => {
    const safe = date > T ? T : date;
    return new Date(`${safe}T${pad(h)}:${pad(int(0, 59))}:00`).toISOString();
  };

  const d: DB = {
    version,
    seq: {},
    users: [],
    properties: [],
    rooms: [],
    persons: [],
    contracts: [],
    rentRates: [],
    occupancies: [],
    services: [],
    meters: [],
    readings: [],
    invoices: [],
    payments: [],
    deposits: [],
    checkouts: [],
    maintenance: [],
    audit: [],
  };
  const id = (e: string): ID => (d.seq[e] = (d.seq[e] ?? 0) + 1);

  d.users.push(
    { id: id("user"), email: "chutro@boardinghub.vn", password: "demo123", fullName: "Phạm Quốc Hưng", phone: "0912345678", role: "OWNER", propertyIds: [1, 2] },
    { id: id("user"), email: "nhanvien@boardinghub.vn", password: "demo123", fullName: "Trần Thu Hà", phone: "0987654321", role: "STAFF", propertyIds: [1] },
    { id: id("user"), email: "nguoithue@boardinghub.vn", password: "demo123", fullName: "Nguyễn Minh Anh", phone: "0901112233", role: "TENANT", propertyIds: [1] },
  );

  const priceChange = periodStart(addPeriods(curP, -2));
  d.services.push(
    { id: id("service"), code: "ELECTRIC", name: "Điện", unit: "kWh", method: "METERED", unitPrice: 3800, effectiveFrom: priceChange, priceHistory: [{ unitPrice: 3500, effectiveFrom: "2025-01-01" }, { unitPrice: 3800, effectiveFrom: priceChange }] },
    { id: id("service"), code: "WATER", name: "Nước", unit: "m³", method: "METERED", unitPrice: 25000, effectiveFrom: "2025-01-01", priceHistory: [{ unitPrice: 25000, effectiveFrom: "2025-01-01" }] },
    { id: id("service"), code: "WIFI", name: "Internet", unit: "phòng", method: "PER_ROOM", unitPrice: 100000, effectiveFrom: "2025-01-01", priceHistory: [{ unitPrice: 100000, effectiveFrom: "2025-01-01" }] },
    { id: id("service"), code: "TRASH", name: "Vệ sinh chung", unit: "người", method: "PER_PERSON", unitPrice: 30000, effectiveFrom: "2025-01-01", priceHistory: [{ unitPrice: 30000, effectiveFrom: "2025-01-01" }] },
  );
  const [ELEC, WATER] = d.services;

  const props = [
    { code: "CG", name: "BoardingHub Cầu Giấy", address: "Số 12, ngõ 165 Xuân Thủy", district: "Cầu Giấy", floors: 4, perFloor: 5 },
    { code: "TX", name: "BoardingHub Thanh Xuân", address: "Số 88 Nguyễn Trãi", district: "Thanh Xuân", floors: 3, perFloor: 4 },
  ];
  const label = new Map<ID, string>();
  for (const p of props) {
    const pid = id("property");
    d.properties.push({ id: pid, code: p.code, name: p.name, address: p.address, district: p.district, city: "Hà Nội" });
    for (let f = 1; f <= p.floors; f++) {
      for (let n = 1; n <= p.perFloor; n++) {
        const code = `${f}${pad(n)}`;
        const key = `${p.code}-${code}`;
        const area = int(18, 32);
        const status: RoomStatus = MAINT.has(key) ? "MAINTENANCE" : INACTIVE.has(key) ? "INACTIVE" : VACANT.has(key) || key === HISTORY_ONLY ? "VACANT" : "OCCUPIED";
        const amen = AMENITIES.filter(() => r() < 0.45);
        const room: Room = {
          id: id("room"),
          propertyId: pid,
          code,
          floor: f,
          capacity: key === "CG-101" ? 4 : int(2, 4),
          areaM2: area,
          listedRent: Math.round((1_700_000 + area * 95_000 + (p.code === "CG" ? 300_000 : 0) - f * 50_000) / 100_000) * 100_000,
          status,
          description: `Phòng tầng ${f}, ${area} m², ${amen.includes("Cửa sổ lớn") ? "thoáng, nhiều ánh sáng" : "yên tĩnh"}.`,
          amenities: amen.length ? amen : ["Nóng lạnh", "Giường tủ"],
        };
        d.rooms.push(room);
        label.set(room.id, key);
        d.meters.push(
          { id: id("meter"), roomId: room.id, serviceId: ELEC.id, serial: `E-${key}`, initialValue: int(1200, 8800), status: "ACTIVE" },
          { id: id("meter"), roomId: room.id, serviceId: WATER.id, serial: `W-${key}`, initialValue: int(120, 880), status: "ACTIVE" },
        );
      }
    }
  }

  const usedNames = new Set<string>();
  const newPerson = (forceName?: string): Person => {
    let name = forceName ?? "";
    while (!name || usedNames.has(name)) name = `${pick(FAMILY)} ${pick(MIDDLE)} ${pick(GIVEN)}`;
    usedNames.add(name);
    const slug = removeDiacritics(name).replace(/\s+/g, ".");
    const p: Person = {
      id: id("person"),
      fullName: name,
      phone: `09${int(10000000, 99999999)}`,
      email: `${slug}${int(1, 99)}@gmail.com`,
      dateOfBirth: `${int(1994, 2005)}-${pad(int(1, 12))}-${pad(int(1, 28))}`,
      identityNumber: `0${int(10, 99)}20${int(10000000, 99999999)}`,
      permanentAddress: `${pick(["Xã", "Phường", "Thị trấn"])} ${pick(GIVEN)} ${pick(["Đông", "Tây", "Nam", "Bắc", "Thượng"])}, ${pick(HOMETOWN)}`,
    };
    d.persons.push(p);
    return p;
  };

  const meterValue = new Map<ID, number>();
  for (const m of d.meters) meterValue.set(m.id, m.initialValue);

  const recordReadings = (roomId: ID, from: Period, to: Period, occupants: number) => {
    for (let p = from; p <= to; p = addPeriods(p, 1)) {
      for (const m of d.meters.filter((x) => x.roomId === roomId)) {
        const prev = meterValue.get(m.id)!;
        const isElec = m.serviceId === ELEC.id;
        const cons = isElec ? int(45, 70) * occupants + int(0, 25) : int(2, 3) * occupants + int(0, 2);
        meterValue.set(m.id, prev + cons);
        d.readings.push({
          id: id("reading"),
          meterId: m.id,
          period: p,
          previousValue: prev,
          currentValue: prev + cons,
          source: r() < 0.3 ? "OCR" : "MANUAL",
          status: "CONFIRMED",
          isAnomaly: false,
          readAt: at(addDays(periodEnd(p), -int(0, 2)), 18),
          recordedBy: "Trần Thu Hà",
          confirmedAt: at(periodEnd(p), 20),
        });
      }
    }
  };

  const invoiceSeq = new Map<Period, number>();
  let itemSeq = 0;
  const makeInvoice = (c: Contract, period: Period, issue: boolean) => {
    const { items, subtotal } = computeInvoiceDraft(d, c, period, () => ++itemSeq);
    const n = (invoiceSeq.get(period) ?? 0) + 1;
    invoiceSeq.set(period, n);
    const issuedDate = addDays(periodEnd(period), 1);
    const inv = {
      id: id("invoice"),
      invoiceNo: `INV-${period.replace("-", "")}-${pad(n, 4)}`,
      contractId: c.id,
      roomId: c.roomId,
      period,
      type: "PERIODIC" as const,
      status: issue ? ("ISSUED" as const) : ("DRAFT" as const),
      items,
      subtotal,
      adjustments: [],
      dueDate: issue ? addDays(issuedDate, c.paymentDueDays) : undefined,
      issuedAt: issue ? at(issuedDate, 8) : undefined,
      generationKey: `${c.id}:${period}:PERIODIC`,
      createdAt: at(issuedDate, 7),
    };
    d.invoices.push(inv);
    return inv;
  };

  const pay = (c: Contract, amount: number, date: ISODate, allocations: { invoiceId: ID; amount: number }[], payerId: ID) => {
    const pid = id("payment");
    const p: Payment = {
      id: pid,
      code: `PT-${pad(pid, 5)}`,
      contractId: c.id,
      payerPersonId: payerId,
      amount,
      receivedAt: at(date, int(8, 21)),
      method: pick(METHODS),
      idempotencyKey: `seed-payment-${pid}`,
      reference: undefined,
      status: "CONFIRMED",
      allocations: allocations.map((a) => ({ id: id("allocation"), invoiceId: a.invoiceId, amount: a.amount, status: "ACTIVE" })),
      refundedAmount: 0,
      receivedBy: r() < 0.6 ? "Trần Thu Hà" : "Phạm Quốc Hưng",
    };
    if (p.method !== "CASH") p.reference = `FT${int(10000000, 99999999)}`;
    d.payments.push(p);
    return p;
  };

  for (const room of d.rooms) {
    const key = label.get(room.id)!;
    const history = key === HISTORY_ONLY;
    if (room.status !== "OCCUPIED" && !history) continue;

    const k = history ? 10 : EXPIRING.has(key) ? 11 : key === "CG-101" ? 7 : int(3, 16);
    const startP = addPeriods(curP, -k);
    const start = periodStart(startP);
    let end = addDays(addMonths(start, 12), -1);
    const cid = id("contract");
    const versions = [{ no: 1, endDate: end, note: "Ký mới 12 tháng", createdAt: at(addDays(start, -3)), createdBy: "Phạm Quốc Hưng" }];
    if (!history && end < T) {
      end = addDays(addMonths(start, 24), -1);
      versions.push({ no: 2, endDate: end, note: "Gia hạn thêm 12 tháng, giữ nguyên điều khoản", createdAt: at(addDays(versions[0].endDate, -20)), createdBy: "Phạm Quốc Hưng" });
    }
    const baseRent = room.listedRent - (k > 8 ? 200_000 : 0);
    const contract: Contract = {
      id: cid,
      code: `HĐ-${key.replace("-", "")}-${startP.slice(2).replace("-", "")}`,
      roomId: room.id,
      representativePersonId: 0,
      startDate: start,
      endDate: history ? periodEnd(addPeriods(curP, -2)) : end,
      billingAnchorDay: 1,
      paymentDueDays: 5,
      depositRequired: baseRent,
      status: history ? "TERMINATED" : "ACTIVE",
      activatedAt: at(start, 10),
      terminatedAt: history ? at(periodEnd(addPeriods(curP, -2)), 16) : undefined,
      terminationReason: history ? "Người thuê chuyển công tác, trả phòng đúng hạn" : undefined,
      versions,
      createdAt: at(addDays(start, -3)),
    };
    d.contracts.push(contract);

    d.rentRates.push({ id: id("rentRate"), contractId: cid, amount: baseRent, effectiveFrom: start, reason: "Giá khi ký hợp đồng", createdAt: contract.createdAt });
    if (k > 8 && !history) {
      d.rentRates.push({ id: id("rentRate"), contractId: cid, amount: room.listedRent, effectiveFrom: periodStart(addPeriods(curP, -3)), reason: "Điều chỉnh giá theo thị trường, đã báo trước 30 ngày", createdAt: at(periodStart(addPeriods(curP, -4))) });
    }

    const count = key === "CG-101" ? 3 : Math.min(room.capacity, int(1, 3));
    const people: Person[] = [];
    for (let i = 0; i < count; i++) people.push(newPerson(key === "CG-101" && i === 0 ? "Nguyễn Minh Anh" : undefined));
    contract.representativePersonId = people[0].id;
    people.forEach((p, i) =>
      d.occupancies.push({
        id: id("occupancy"),
        contractId: cid,
        roomId: room.id,
        personId: p.id,
        role: i === 0 ? "REPRESENTATIVE" : "MEMBER",
        moveInDate: start,
        moveOutDate: history ? contract.endDate : undefined,
        status: history ? "ENDED" : "ACTIVE",
      }),
    );
    if (key === "TX-101") {
      const gone = newPerson();
      d.occupancies.push({ id: id("occupancy"), contractId: cid, roomId: room.id, personId: gone.id, role: "MEMBER", moveInDate: start, moveOutDate: periodEnd(addPeriods(curP, -3)), status: "ENDED" });
    }
    if (key === "CG-101") {
      people[0].email = "nguoithue@boardinghub.vn";
      people[0].phone = "0901112233";
      people[0].userId = 3;
      d.users[2].personId = people[0].id;
    }

    const depositIn = DEPOSIT_SHORT.has(key) ? Math.round(baseRent / 2 / 100_000) * 100_000 : baseRent;
    d.deposits.push({ id: id("deposit"), contractId: cid, type: "RECEIVE", amount: depositIn, occurredAt: at(addDays(start, -2)), method: "BANK_TRANSFER", idempotencyKey: `seed-dep-${cid}`, note: depositIn < baseRent ? "Nhận trước một nửa, hẹn đóng nốt" : "Nhận đủ cọc khi ký" });

    const billFrom = startP > firstP ? startP : firstP;
    const billTo = history ? addPeriods(curP, -2) : lastBilled;
    recordReadings(room.id, startP > firstP ? startP : firstP, billTo, count);

    for (let p = billFrom; p <= billTo; p = addPeriods(p, 1)) {
      if (key === UNBILLED && p === lastBilled) continue;
      const inv = makeInvoice(contract, p, !(key === UNISSUED && p === lastBilled));
      if (inv.status === "DRAFT") continue;
      const total = invoiceTotal(inv);
      const issued = addDays(periodEnd(p), 1);
      const isLast = p === lastBilled;
      const isPrev = p === addPeriods(curP, -2);

      if (OLD_DEBT.has(key) && (isLast || isPrev)) continue;
      if (key === OVERPAID && isPrev) {
        pay(contract, total + 200_000, addDays(issued, 2), [{ invoiceId: inv.id, amount: total }], people[0].id);
        continue;
      }
      if (key === TWO_INSTALLMENTS && isLast) {
        const first = Math.round((total * 0.6) / 100_000) * 100_000;
        pay(contract, first, addDays(issued, 1), [{ invoiceId: inv.id, amount: first }], people[0].id);
        pay(contract, total - first, addDays(issued, 9), [{ invoiceId: inv.id, amount: total - first }], people[0].id);
        continue;
      }
      if (key === "CG-101" && isLast) {
        const part = Math.round((total * 0.6) / 100_000) * 100_000;
        pay(contract, part, addDays(issued, 3), [{ invoiceId: inv.id, amount: part }], people[0].id);
        continue;
      }
      if (isLast && !history) {
        const roll = r();
        if (roll < 0.58) pay(contract, total, addDays(issued, int(0, 6)), [{ invoiceId: inv.id, amount: total }], pick(people).id);
        else if (roll < 0.78) {
          const part = Math.round((total * (0.4 + r() * 0.3)) / 100_000) * 100_000;
          pay(contract, part, addDays(issued, int(1, 8)), [{ invoiceId: inv.id, amount: part }], people[0].id);
        }
        continue;
      }
      pay(contract, total, addDays(issued, int(0, 4)), [{ invoiceId: inv.id, amount: total }], pick(people).id);
    }

    if (history) {
      const coId = id("checkout");
      d.checkouts.push({
        id: coId,
        contractId: cid,
        checkoutDate: contract.endDate,
        outstandingDebt: 0,
        extraDeductions: 0,
        totalObligation: 0,
        depositAvailable: depositIn,
        depositUsed: 0,
        refundAmount: depositIn,
        extraCharge: 0,
        deductions: [],
        status: "CONFIRMED",
        confirmedAt: contract.terminatedAt,
        createdAt: contract.terminatedAt!,
      });
      d.deposits.push({ id: id("deposit"), contractId: cid, type: "REFUND", amount: depositIn, occurredAt: contract.terminatedAt!, method: "BANK_TRANSFER", checkoutId: coId, idempotencyKey: `seed-refund-${cid}`, note: "Hoàn đủ cọc, không có khấu trừ" });
    }
  }

  // Kỳ hiện tại đang ghi số: khu Cầu Giấy đã nhập được khoảng một nửa.
  for (const c of d.contracts.filter((x) => x.status === "ACTIVE")) {
    const room = d.rooms.find((x) => x.id === c.roomId)!;
    if (room.propertyId !== 1 || r() < 0.45) continue;
    const confirmed = r() < 0.5;
    for (const m of d.meters.filter((x) => x.roomId === room.id)) {
      const prev = meterValue.get(m.id)!;
      const cons = m.serviceId === ELEC.id ? int(90, 170) : int(4, 8);
      d.readings.push({
        id: id("reading"),
        meterId: m.id,
        period: curP,
        previousValue: prev,
        currentValue: prev + cons,
        source: r() < 0.4 ? "OCR" : "MANUAL",
        status: confirmed ? "CONFIRMED" : "DRAFT",
        isAnomaly: false,
        readAt: at(addDays(T, -int(0, 2)), 18),
        recordedBy: "Trần Thu Hà",
        confirmedAt: confirmed ? at(T, 8) : undefined,
      });
    }
  }

  for (const inv of d.invoices) refreshInvoiceStatus(d, inv);

  const roomByKey = (key: string) => d.rooms.find((x) => label.get(x.id) === key)!;
  const mt = (key: string, title: string, description: string, priority: MaintenancePriority, status: MaintenanceStatus, daysAgo: number, extra: Partial<DB["maintenance"][number]> = {}) => {
    const mid = id("maintenance");
    const created = at(addDays(T, -daysAgo), 10);
    const flow: MaintenanceStatus[] = ["NEW", "ACCEPTED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    const upto = flow.indexOf(status);
    d.maintenance.push({
      id: mid,
      code: `BT-${pad(mid, 4)}`,
      roomId: roomByKey(key).id,
      title,
      description,
      priority,
      status,
      reportedBy: extra.reportedBy ?? "Trần Thu Hà",
      blocksRoom: false,
      createdAt: created,
      history: flow.slice(0, Math.max(1, upto + 1)).map((s, i) => ({ at: at(addDays(T, -daysAgo + i), 10 + i), by: i === 0 ? extra.reportedBy ?? "Trần Thu Hà" : "Trần Thu Hà", status: s })),
      ...extra,
    });
  };
  mt("CG-305", "Thấm trần nhà vệ sinh", "Nước thấm từ tầng trên xuống trần WC, cần chống thấm và sơn lại. Phòng tạm khóa không cho thuê.", "HIGH", "IN_PROGRESS", 6, { blocksRoom: true, assignedTo: "Đội sửa chữa Minh Phát" });
  mt("TX-203", "Sơn lại tường, thay sàn gỗ", "Làm mới phòng sau khi khách cũ trả, dự kiến 10 ngày.", "NORMAL", "ACCEPTED", 3, { blocksRoom: true, assignedTo: "Đội sửa chữa Minh Phát" });
  mt("CG-101", "Vòi sen bị rò nước", "Vòi sen trong nhà tắm rỉ nước liên tục, đã khóa van tạm thời.", "NORMAL", "NEW", 1, { reportedBy: "Nguyễn Minh Anh" });
  mt("CG-201", "Điều hòa không mát", "Điều hòa chạy nhưng không ra hơi lạnh, có tiếng kêu lạ.", "URGENT", "NEW", 0);
  mt("TX-101", "Hỏng khóa cửa chính", "Ổ khóa kẹt, không mở được từ bên ngoài.", "HIGH", "RESOLVED", 12, { assignedTo: "Thợ khóa Hùng", cost: 350_000, resolutionNote: "Đã thay ổ khóa mới, giao 3 chìa." });
  mt("CG-302", "Bóng đèn hành lang hỏng", "Đèn hành lang tầng 3 không sáng.", "LOW", "CLOSED", 20, { assignedTo: "Trần Thu Hà", cost: 60_000, resolutionNote: "Đã thay bóng LED." });

  const recent = [...d.payments].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, 12);
  for (const p of recent) {
    const c = d.contracts.find((x) => x.id === p.contractId)!;
    d.audit.push({ id: id("audit"), at: p.receivedAt, actor: p.receivedBy, action: "PAYMENT_CREATED", entityType: "payment", entityId: p.id, summary: `Ghi phiếu thu ${p.code} cho phòng ${label.get(c.roomId)}`, after: { amount: p.amount, method: p.method } });
  }
  d.audit.push(
    { id: id("audit"), at: at(addDays(periodStart(curP), 0), 8), actor: "Phạm Quốc Hưng", action: "INVOICE_ISSUED", entityType: "invoice", entityId: "batch", summary: `Phát hành hóa đơn ${periodLabel(lastBilled)} cho các phòng đủ dữ liệu`, after: { period: lastBilled } },
    { id: id("audit"), at: at(priceChange, 9), actor: "Phạm Quốc Hưng", action: "SERVICE_PRICE_CHANGED", entityType: "service", entityId: ELEC.id, summary: "Đổi giá điện từ kỳ " + periodLabel(periodOf(priceChange)), before: { unitPrice: 3500 }, after: { unitPrice: 3800 } },
    { id: id("audit"), at: at(T, 7), actor: "Phạm Quốc Hưng", action: "LOGIN", entityType: "user", entityId: 1, summary: "Đăng nhập hệ thống" },
  );
  d.audit.sort((a, b) => b.at.localeCompare(a.at));

  return d;
}
