import type { BoardingHubApi, DemoAccount, PersonListItem, InvoiceDetail } from "../contract";
import {
  ApiError,
  type Checkout,
  type Contract,
  type ContractView,
  type DashboardData,
  type ID,
  type Invoice,
  type InvoiceView,
  type MaintenanceStatus,
  type Payment,
  type PaymentView,
  type Period,
  type Person,
  type PeriodBillingRow,
  type PeriodReadingRow,
  type Reminder,
  type Role,
  type Room,
  type RoomView,
  type SearchResult,
  type User,
} from "../types";
import { db, persist, nextId, resetDB, getSessionUserId, setSessionUserId, type MockUser } from "./db";
import {
  autoAllocate,
  computeInvoiceDraft,
  contractBalance,
  currentRent,
  depositAvailable,
  depositReceived,
  invoiceBalance,
  invoicePaid,
  invoiceTotal,
  isOverdue,
  paymentUnallocated,
  previousValue,
  refreshInvoiceStatus,
  settle,
  sum,
} from "./logic";
import { addDays, addPeriods, currentPeriod, daysBetween, fmtDate, localDate, nowISO, periodEnd, periodLabel, periodOf, periodStart, today } from "@/lib/date";
import { matches, money, num } from "@/lib/format";

const wait = (min = 160, max = 480) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
const clone = <T,>(v: T): T => (v === undefined ? v : structuredClone(v));

async function read<T>(fn: () => T): Promise<T> {
  await wait();
  return clone(fn());
}

async function write<T>(fn: () => T, delay: [number, number] = [260, 620]): Promise<T> {
  await wait(...delay);
  const out = fn();
  persist();
  return clone(out);
}

function me(): MockUser {
  const uid = getSessionUserId();
  const u = uid != null ? db().users.find((x) => x.id === uid) : undefined;
  if (!u) throw new ApiError("UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", 401);
  return u;
}

function requireRole(...roles: Role[]) {
  const u = me();
  if (!roles.includes(u.role)) throw new ApiError("FORBIDDEN", "Tài khoản của bạn không có quyền thực hiện thao tác này.", 403);
  return u;
}

const staff = () => requireRole("OWNER", "STAFF");

function inScope(propertyId: ID) {
  return me().propertyIds.includes(propertyId);
}

function roomOf(id: ID): Room {
  const room = db().rooms.find((r) => r.id === id);
  if (!room) throw new ApiError("NOT_FOUND", "Không tìm thấy phòng.", 404);
  if (!inScope(room.propertyId)) throw new ApiError("FORBIDDEN", "Bạn không có quyền truy cập dữ liệu của khu trọ này.", 403);
  return room;
}

function contractOf(id: ID): Contract {
  const c = db().contracts.find((x) => x.id === id);
  if (!c) throw new ApiError("NOT_FOUND", "Không tìm thấy hợp đồng.", 404);
  roomOf(c.roomId);
  return c;
}

function invoiceOf(id: ID): Invoice {
  const inv = db().invoices.find((x) => x.id === id);
  if (!inv) throw new ApiError("NOT_FOUND", "Không tìm thấy hóa đơn.", 404);
  roomOf(inv.roomId);
  return inv;
}

function propertyOf(room: Room) {
  return db().properties.find((p) => p.id === room.propertyId)!;
}

export function roomKey(room: Room) {
  return `${propertyOf(room).code}-${room.code}`;
}

function personOf(id: ID): Person {
  return db().persons.find((p) => p.id === id)!;
}

function log(action: string, entityType: string, entityId: ID | string, summary: string, before?: Record<string, unknown>, after?: Record<string, unknown>) {
  const u = me();
  db().audit.unshift({ id: nextId("audit"), at: nowISO(), actor: u.fullName, action, entityType, entityId, summary, before, after });
}

function publicUser(u: MockUser): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

function fakeJwt(u: MockUser) {
  const enc = (o: object) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, "");
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: u.id, role: u.role, props: u.propertyIds, exp: Math.floor(Date.now() / 1000) + 86400 })}.mock-signature`;
}

const isLiveContract = (c: Contract) => c.status === "ACTIVE" || c.status === "EXPIRED";

function contractEffectiveEnd(c: Contract) {
  return c.status === "TERMINATED" && c.terminatedAt ? localDate(c.terminatedAt) : c.endDate;
}

function contractsInPeriod(period: Period, propertyId?: ID) {
  const s = periodStart(period);
  const e = periodEnd(period);
  return db().contracts.filter((c) => {
    if (c.status === "DRAFT" || c.status === "CANCELLED") return false;
    const room = db().rooms.find((r) => r.id === c.roomId)!;
    if (!inScope(room.propertyId) || (propertyId && room.propertyId !== propertyId)) return false;
    return c.startDate <= e && contractEffectiveEnd(c) >= s;
  });
}

function occupantsOf(contractId: ID, includeEnded = false) {
  return db()
    .occupancies.filter((o) => o.contractId === contractId && (includeEnded ? o.status !== "CANCELLED" : o.status === "ACTIVE" || o.status === "PLANNED"))
    .map((o) => ({ ...o, person: personOf(o.personId) }));
}

function roomView(room: Room): RoomView {
  const d = db();
  const active = d.contracts.find((c) => c.roomId === room.id && isLiveContract(c));
  return {
    ...room,
    propertyName: propertyOf(room).name,
    activeContract: active,
    occupants: active ? occupantsOf(active.id) : [],
    currentRent: active ? currentRent(d, active.id) : undefined,
    balance: active ? contractBalance(d, active.id) : 0,
    openMaintenance: d.maintenance.filter((m) => m.roomId === room.id && !["CLOSED", "CANCELLED", "RESOLVED"].includes(m.status)).length,
  };
}

function contractView(c: Contract): ContractView {
  const d = db();
  const room = d.rooms.find((r) => r.id === c.roomId)!;
  return {
    ...c,
    room,
    propertyName: propertyOf(room).name,
    representative: personOf(c.representativePersonId),
    occupants: occupantsOf(c.id, true),
    currentRent: currentRent(d, c.id),
    rentRates: d.rentRates.filter((r) => r.contractId === c.id).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)),
    depositReceived: depositReceived(d, c.id),
    depositAvailable: depositAvailable(d, c.id),
    balance: contractBalance(d, c.id),
    deposits: d.deposits.filter((t) => t.contractId === c.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    checkout: d.checkouts.find((x) => x.contractId === c.id && x.status !== "CANCELLED"),
  };
}

function invoiceView(inv: Invoice): InvoiceView {
  const d = db();
  const room = d.rooms.find((r) => r.id === inv.roomId)!;
  const c = d.contracts.find((x) => x.id === inv.contractId)!;
  const total = invoiceTotal(inv);
  const paid = inv.status === "DRAFT" || inv.status === "CANCELLED" ? 0 : invoicePaid(d, inv.id);
  return {
    ...inv,
    total,
    paid,
    balance: invoiceBalance(d, inv),
    overdue: isOverdue(d, inv),
    roomCode: roomKey(room),
    propertyId: room.propertyId,
    representativeName: personOf(c.representativePersonId).fullName,
  };
}

function paymentView(p: Payment): PaymentView {
  const d = db();
  const c = d.contracts.find((x) => x.id === p.contractId)!;
  const room = d.rooms.find((r) => r.id === c.roomId)!;
  return {
    ...p,
    roomCode: roomKey(room),
    payerName: p.payerPersonId ? personOf(p.payerPersonId).fullName : personOf(c.representativePersonId).fullName,
    unallocated: paymentUnallocated(p),
  };
}

function hasIssuedInvoice(contractId: ID, fromPeriod: Period) {
  return db().invoices.some((i) => i.contractId === contractId && i.type === "PERIODIC" && i.period! >= fromPeriod && i.status !== "DRAFT" && i.status !== "CANCELLED");
}

function activateContract(c: Contract) {
  const d = db();
  const room = d.rooms.find((r) => r.id === c.roomId)!;
  if (c.status !== "DRAFT") throw new ApiError("INVALID_STATE", "Chỉ kích hoạt được hợp đồng đang ở trạng thái nháp.");
  const blocking = d.maintenance.some((m) => m.roomId === room.id && m.blocksRoom && !["RESOLVED", "CLOSED", "CANCELLED"].includes(m.status));
  if (room.status === "MAINTENANCE" || blocking) throw new ApiError("ROOM_MAINTENANCE", `Phòng ${roomKey(room)} đang bảo trì nên chưa thể kích hoạt hợp đồng (AC-002-03).`, 409);
  if (room.status === "INACTIVE") throw new ApiError("ROOM_INACTIVE", "Phòng đã ngừng sử dụng.", 409);
  const other = d.contracts.find((x) => x.id !== c.id && x.roomId === room.id && isLiveContract(x));
  if (other) throw new ApiError("ROOM_TAKEN", `Phòng ${roomKey(room)} đang có hợp đồng ${other.code} hiệu lực. Mỗi phòng chỉ một hợp đồng hiệu lực (BR-004).`, 409);
  const occ = d.occupancies.filter((o) => o.contractId === c.id && o.status === "PLANNED");
  if (occ.length > room.capacity) throw new ApiError("CAPACITY_EXCEEDED", `Số người (${occ.length}) vượt sức chứa phòng (${room.capacity}).`, 422);
  c.status = "ACTIVE";
  c.activatedAt = nowISO();
  occ.forEach((o) => (o.status = "ACTIVE"));
  room.status = "OCCUPIED";
  log("CONTRACT_ACTIVATED", "contract", c.id, `Kích hoạt hợp đồng ${c.code} phòng ${roomKey(room)}`, { status: "DRAFT" }, { status: "ACTIVE" });
}

function createPerson(input: { fullName: string; phone: string; email: string; dateOfBirth: string; identityNumber: string; permanentAddress: string }): Person {
  if (!input.fullName.trim()) throw new ApiError("VALIDATION", "Vui lòng nhập họ tên.", 422, "fullName");
  if (input.phone && !/^0\d{9}$/.test(input.phone)) throw new ApiError("VALIDATION", "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.", 422, "phone");
  const p: Person = { id: nextId("person"), ...input, fullName: input.fullName.trim() };
  db().persons.push(p);
  return p;
}

function buildReminders(propertyId?: ID): Reminder[] {
  const d = db();
  const out: Reminder[] = [];
  const T = today();
  const curP = currentPeriod();
  const lastP = addPeriods(curP, -1);

  const live = d.contracts.filter((c) => {
    const room = d.rooms.find((r) => r.id === c.roomId)!;
    return isLiveContract(c) && inScope(room.propertyId) && (!propertyId || room.propertyId === propertyId);
  });

  const missingRooms: string[] = [];
  let drafts = 0;
  for (const c of live) {
    const meters = d.meters.filter((m) => m.roomId === c.roomId && m.status === "ACTIVE");
    const rs = meters.map((m) => d.readings.find((r) => r.meterId === m.id && r.period === curP && r.status !== "SUPERSEDED"));
    if (rs.some((r) => !r)) missingRooms.push(roomKey(d.rooms.find((r) => r.id === c.roomId)!));
    drafts += rs.filter((r) => r?.status === "DRAFT").length;
  }
  if (missingRooms.length && Number(T.slice(8)) >= 15)
    out.push({ id: "missing-readings", kind: "MISSING_READING", severity: "warning", title: `${missingRooms.length} phòng chưa ghi chỉ số ${periodLabel(curP)}`, detail: missingRooms.slice(0, 6).join(", ") + (missingRooms.length > 6 ? "…" : ""), link: `/app/meters?period=${curP}` });
  if (drafts) out.push({ id: "draft-readings", kind: "MISSING_READING", severity: "info", title: `${drafts} chỉ số đang nháp, chờ xác nhận`, detail: "Chỉ số nháp chưa được dùng để lập hóa đơn (BR-008).", link: `/app/meters?period=${curP}` });

  const unbilled = contractsInPeriod(lastP, propertyId).filter((c) => !d.invoices.some((i) => i.generationKey === `${c.id}:${lastP}:PERIODIC` && i.status !== "DRAFT" && i.status !== "CANCELLED"));
  if (unbilled.length)
    out.push({ id: "unbilled", kind: "UNBILLED", severity: "warning", title: `${unbilled.length} phòng chưa phát hành hóa đơn ${periodLabel(lastP)}`, detail: unbilled.map((c) => roomKey(d.rooms.find((r) => r.id === c.roomId)!)).join(", "), link: `/app/invoices/billing?period=${lastP}` });

  for (const inv of d.invoices) {
    const room = d.rooms.find((r) => r.id === inv.roomId)!;
    if (!inScope(room.propertyId) || (propertyId && room.propertyId !== propertyId)) continue;
    if (!isOverdue(d, inv)) continue;
    const days = daysBetween(inv.dueDate!, T);
    out.push({ id: `overdue-${inv.id}`, kind: "OVERDUE", severity: days > 20 ? "danger" : "warning", title: `Phòng ${roomKey(room)} quá hạn ${days} ngày`, detail: `${inv.invoiceNo} còn nợ ${money(invoiceBalance(d, inv))}`, link: `/app/invoices/${inv.id}` });
  }

  for (const c of live) {
    const left = daysBetween(T, c.endDate);
    const room = d.rooms.find((r) => r.id === c.roomId)!;
    if (left <= 30) out.push({ id: `expiring-${c.id}`, kind: "CONTRACT_EXPIRING", severity: left < 0 ? "danger" : "warning", title: left < 0 ? `Hợp đồng ${roomKey(room)} đã hết hạn` : `Hợp đồng ${roomKey(room)} còn ${left} ngày`, detail: `Kết thúc ${fmtDate(c.endDate)}. Gia hạn hoặc chuẩn bị trả phòng.`, link: `/app/contracts/${c.id}` });
    const short = c.depositRequired - depositReceived(d, c.id);
    if (short > 0) out.push({ id: `deposit-${c.id}`, kind: "DEPOSIT_SHORT", severity: "info", title: `Phòng ${roomKey(room)} còn thiếu cọc ${money(short)}`, detail: `Đã nhận ${money(depositReceived(d, c.id))} / ${money(c.depositRequired)}`, link: `/app/contracts/${c.id}` });
  }

  for (const m of d.maintenance) {
    const room = d.rooms.find((r) => r.id === m.roomId)!;
    if (!inScope(room.propertyId) || (propertyId && room.propertyId !== propertyId)) continue;
    if ((m.priority === "URGENT" || m.priority === "HIGH") && ["NEW", "ACCEPTED", "IN_PROGRESS"].includes(m.status))
      out.push({ id: `mt-${m.id}`, kind: "MAINTENANCE", severity: m.priority === "URGENT" ? "danger" : "warning", title: `${m.title} — ${roomKey(room)}`, detail: `Báo hỏng ${fmtDate(m.createdAt)}, trạng thái: ${m.status === "NEW" ? "chưa tiếp nhận" : "đang xử lý"}`, link: `/app/maintenance` });
  }

  const order = { danger: 0, warning: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

const DEMO: DemoAccount[] = [
  { email: "chutro@boardinghub.vn", password: "demo123", role: "OWNER", label: "Chủ trọ", description: "Toàn quyền 2 khu trọ, báo cáo, cấu hình giá, nhật ký" },
  { email: "nhanvien@boardinghub.vn", password: "demo123", role: "STAFF", label: "Nhân viên", description: "Chỉ khu Cầu Giấy: ghi số, lập hóa đơn, thu tiền" },
  { email: "nguoithue@boardinghub.vn", password: "demo123", role: "TENANT", label: "Người thuê", description: "Phòng CG-101: xem hóa đơn, hợp đồng, báo hỏng" },
];

const TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
  CANCELLED: [],
};

export const mockApi: BoardingHubApi = {
  auth: {
    login: (email, password) =>
      write(() => {
        const u = db().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u || u.password !== password) throw new ApiError("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.", 401);
        setSessionUserId(u.id);
        log("LOGIN", "user", u.id, "Đăng nhập hệ thống");
        return { token: fakeJwt(u), user: publicUser(u), expiresAt: new Date(Date.now() + 86400_000).toISOString() };
      }, [500, 900]),
    me: () => read(() => publicUser(me())),
    logout: async () => {
      setSessionUserId(null);
    },
    demoAccounts: async () => DEMO,
  },

  properties: {
    list: () => read(() => db().properties.filter((p) => inScope(p.id))),
  },

  rooms: {
    list: (q = {}) =>
      read(() => {
        staff();
        return db()
          .rooms.filter((r) => inScope(r.propertyId))
          .filter((r) => !q.propertyId || r.propertyId === q.propertyId)
          .filter((r) => !q.status || r.status === q.status)
          .map(roomView)
          .filter((r) => !q.search || matches(`${roomKey(r)} ${r.occupants.map((o) => o.person.fullName).join(" ")}`, q.search));
      }),
    get: (id) =>
      read(() => {
        staff();
        return roomView(roomOf(id));
      }),
    create: (input) =>
      write(() => {
        requireRole("OWNER");
        if (!inScope(input.propertyId)) throw new ApiError("FORBIDDEN", "Bạn không quản lý khu trọ này.", 403);
        const code = input.code.trim().toUpperCase();
        if (!code) throw new ApiError("VALIDATION", "Vui lòng nhập mã phòng.", 422, "code");
        if (db().rooms.some((r) => r.propertyId === input.propertyId && r.code.toUpperCase() === code))
          throw new ApiError("DUPLICATE_CODE", `Mã phòng ${code} đã tồn tại trong khu trọ này (AC-002-01).`, 409, "code");
        if (input.capacity < 1) throw new ApiError("VALIDATION", "Sức chứa phải lớn hơn 0.", 422, "capacity");
        const room: Room = { id: nextId("room"), ...input, code, status: "VACANT" };
        db().rooms.push(room);
        const [elec, water] = db().services;
        db().meters.push(
          { id: nextId("meter"), roomId: room.id, serviceId: elec.id, serial: `E-${roomKey(room)}`, initialValue: 0, status: "ACTIVE" },
          { id: nextId("meter"), roomId: room.id, serviceId: water.id, serial: `W-${roomKey(room)}`, initialValue: 0, status: "ACTIVE" },
        );
        log("ROOM_CREATED", "room", room.id, `Tạo phòng ${roomKey(room)}`, undefined, { capacity: room.capacity, listedRent: room.listedRent });
        return room;
      }),
    update: (id, input) =>
      write(() => {
        requireRole("OWNER");
        const room = roomOf(id);
        if (input.code && input.code !== room.code && db().rooms.some((r) => r.propertyId === room.propertyId && r.code === input.code))
          throw new ApiError("DUPLICATE_CODE", `Mã phòng ${input.code} đã tồn tại trong khu trọ này.`, 409, "code");
        const before = { listedRent: room.listedRent, capacity: room.capacity };
        Object.assign(room, input);
        log("ROOM_UPDATED", "room", room.id, `Cập nhật phòng ${roomKey(room)}`, before, { listedRent: room.listedRent, capacity: room.capacity });
        return room;
      }),
    setStatus: (id, status, reason) =>
      write(() => {
        requireRole("OWNER");
        const room = roomOf(id);
        const live = db().contracts.some((c) => c.roomId === id && isLiveContract(c));
        if (status === "OCCUPIED") throw new ApiError("INVALID_STATE", "Trạng thái Đang thuê do hệ thống đặt khi kích hoạt hợp đồng.");
        if (live) throw new ApiError("ROOM_IN_USE", "Phòng đang có hợp đồng hiệu lực; hãy trả phòng trước khi đổi trạng thái (AC-002-02).", 409);
        if (status === "VACANT" && db().maintenance.some((m) => m.roomId === id && m.blocksRoom && !["RESOLVED", "CLOSED", "CANCELLED"].includes(m.status)))
          throw new ApiError("ROOM_MAINTENANCE", "Còn yêu cầu bảo trì đang khóa phòng; hãy xử lý xong trước.", 409);
        const before = room.status;
        room.status = status;
        log("ROOM_STATUS_CHANGED", "room", id, `Đổi trạng thái phòng ${roomKey(room)}: ${reason || "không ghi lý do"}`, { status: before }, { status });
        return room;
      }),
  },

  persons: {
    list: (q = {}) =>
      read(() => {
        staff();
        const d = db();
        const out: PersonListItem[] = [];
        for (const p of d.persons) {
          const occs = d.occupancies.filter((o) => o.personId === p.id && o.status !== "CANCELLED");
          const occ = occs.find((o) => o.status === "ACTIVE" || o.status === "PLANNED") ?? occs.sort((a, b) => (b.moveOutDate ?? "").localeCompare(a.moveOutDate ?? ""))[0];
          if (!occ) continue;
          const room = d.rooms.find((r) => r.id === occ.roomId)!;
          if (!inScope(room.propertyId) || (q.propertyId && room.propertyId !== q.propertyId)) continue;
          const item: PersonListItem = {
            ...p,
            roomCode: roomKey(room),
            propertyName: propertyOf(room).name,
            contractId: occ.contractId,
            role: occ.role,
            moveInDate: occ.moveInDate,
            status: occ.status === "ENDED" ? "MOVED_OUT" : "LIVING",
          };
          if (q.search && !matches(`${p.fullName} ${p.phone} ${item.roomCode}`, q.search)) continue;
          out.push(item);
        }
        return out.sort((a, b) => (a.roomCode ?? "").localeCompare(b.roomCode ?? "") || (a.role === "REPRESENTATIVE" ? -1 : 1));
      }),
  },

  contracts: {
    list: (q = {}) =>
      read(() => {
        staff();
        const T = today();
        return db()
          .contracts.filter((c) => {
            const room = db().rooms.find((r) => r.id === c.roomId)!;
            if (!inScope(room.propertyId) || (q.propertyId && room.propertyId !== q.propertyId)) return false;
            if (q.status === "EXPIRING") return isLiveContract(c) && daysBetween(T, c.endDate) <= 30;
            return !q.status || c.status === q.status;
          })
          .map(contractView)
          .filter((c) => !q.search || matches(`${c.code} ${roomKey(c.room)} ${c.representative.fullName}`, q.search))
          .sort((a, b) => (a.status === "ACTIVE" ? -1 : 0) - (b.status === "ACTIVE" ? -1 : 0) || roomKey(a.room).localeCompare(roomKey(b.room)));
      }),
    get: (id) =>
      read(() => {
        staff();
        return contractView(contractOf(id));
      }),
    create: (input) =>
      write(() => {
        const u = staff();
        const d = db();
        const room = roomOf(input.roomId);
        if (room.status === "INACTIVE") throw new ApiError("ROOM_INACTIVE", "Phòng đã ngừng sử dụng.", 409);
        if (!input.startDate || !input.endDate || input.endDate <= input.startDate) throw new ApiError("VALIDATION", "Ngày kết thúc phải sau ngày bắt đầu.", 422, "endDate");
        if (input.rent <= 0) throw new ApiError("VALIDATION", "Giá thuê phải lớn hơn 0.", 422, "rent");
        if (input.depositRequired < 0) throw new ApiError("VALIDATION", "Tiền cọc không được âm.", 422, "depositRequired");
        if (1 + input.members.length > room.capacity) throw new ApiError("CAPACITY_EXCEEDED", `Số người (${1 + input.members.length}) vượt sức chứa phòng (${room.capacity}).`, 422);
        if (input.initialDeposit && input.initialDeposit.amount > input.depositRequired) throw new ApiError("VALIDATION", "Tiền cọc nhận không được lớn hơn số cọc phải nộp.", 422, "initialDeposit");

        const rep = "personId" in input.representative ? personOf(input.representative.personId) : createPerson(input.representative.person);
        const members = input.members.map(createPerson);
        let code = `HĐ-${roomKey(room).replace("-", "")}-${input.startDate.slice(2, 7).replace("-", "")}`;
        while (d.contracts.some((c) => c.code === code)) code += "B";
        const c: Contract = {
          id: nextId("contract"),
          code,
          roomId: room.id,
          representativePersonId: rep.id,
          startDate: input.startDate,
          endDate: input.endDate,
          billingAnchorDay: input.billingAnchorDay,
          paymentDueDays: input.paymentDueDays,
          depositRequired: input.depositRequired,
          status: "DRAFT",
          versions: [{ no: 1, endDate: input.endDate, note: "Ký mới", createdAt: nowISO(), createdBy: u.fullName }],
          createdAt: nowISO(),
        };
        d.contracts.push(c);
        d.rentRates.push({ id: nextId("rentRate"), contractId: c.id, amount: input.rent, effectiveFrom: input.startDate, reason: "Giá khi ký hợp đồng", createdAt: nowISO() });
        [rep, ...members].forEach((p, i) =>
          d.occupancies.push({ id: nextId("occupancy"), contractId: c.id, roomId: room.id, personId: p.id, role: i === 0 ? "REPRESENTATIVE" : "MEMBER", moveInDate: input.startDate, status: "PLANNED" }),
        );
        log("CONTRACT_CREATED", "contract", c.id, `Lập hợp đồng ${c.code} phòng ${roomKey(room)} cho ${rep.fullName}`, undefined, { rent: input.rent, deposit: input.depositRequired });
        if (input.initialDeposit && input.initialDeposit.amount > 0 && !d.deposits.some((t) => t.idempotencyKey === input.initialDeposit!.idempotencyKey)) {
          d.deposits.push({ id: nextId("deposit"), contractId: c.id, type: "RECEIVE", amount: input.initialDeposit.amount, occurredAt: nowISO(), method: input.initialDeposit.method, idempotencyKey: input.initialDeposit.idempotencyKey, note: input.initialDeposit.amount < input.depositRequired ? "Nhận một phần cọc" : "Nhận đủ cọc khi ký" });
          log("DEPOSIT_RECEIVED", "contract", c.id, `Nhận cọc ${money(input.initialDeposit.amount)} cho ${c.code}`);
        }
        if (input.activate) activateContract(c);
        return c;
      }, [700, 1100]),
    activate: (id) =>
      write(() => {
        staff();
        const c = contractOf(id);
        activateContract(c);
        return c;
      }),
    extend: (id, input) =>
      write(() => {
        const u = requireRole("OWNER");
        const c = contractOf(id);
        if (!isLiveContract(c)) throw new ApiError("INVALID_STATE", "Chỉ gia hạn được hợp đồng đang hiệu lực hoặc vừa hết hạn.");
        if (input.endDate <= c.endDate) throw new ApiError("VALIDATION", `Ngày kết thúc mới phải sau ${fmtDate(c.endDate)}.`, 422, "endDate");
        const before = c.endDate;
        c.versions.push({ no: c.versions.length + 1, endDate: input.endDate, note: input.note || "Gia hạn", createdAt: nowISO(), createdBy: u.fullName });
        c.endDate = input.endDate;
        c.status = "ACTIVE";
        log("CONTRACT_EXTENDED", "contract", c.id, `Gia hạn ${c.code} đến ${fmtDate(input.endDate)}`, { endDate: before }, { endDate: input.endDate });
        return c;
      }),
    changeRent: (id, input) =>
      write(() => {
        requireRole("OWNER");
        const c = contractOf(id);
        if (input.amount <= 0) throw new ApiError("VALIDATION", "Giá thuê phải lớn hơn 0.", 422, "amount");
        if (!input.effectiveFrom.endsWith("-01"))
          throw new ApiError("MID_PERIOD_RATE", "Ngày áp dụng nằm giữa kỳ cần chính sách phân đoạn giá (chưa được duyệt, AC-005-03). Hãy chọn ngày đầu kỳ.", 422, "effectiveFrom");
        if (hasIssuedInvoice(c.id, periodOf(input.effectiveFrom)))
          throw new ApiError("PERIOD_LOCKED", `${periodLabel(periodOf(input.effectiveFrom))} đã phát hành hóa đơn; giá mới chỉ áp dụng từ kỳ chưa chốt (AC-005-02).`, 409, "effectiveFrom");
        const before = currentRent(db(), c.id);
        db().rentRates.push({ id: nextId("rentRate"), contractId: c.id, amount: input.amount, effectiveFrom: input.effectiveFrom, reason: input.reason || "Điều chỉnh giá", createdAt: nowISO() });
        log("RENT_CHANGED", "contract", c.id, `Đổi giá thuê ${c.code} từ ${fmtDate(input.effectiveFrom)}`, { rent: before }, { rent: input.amount });
        return c;
      }),
    addOccupant: (id, input) =>
      write(() => {
        staff();
        const c = contractOf(id);
        const room = roomOf(c.roomId);
        const active = db().occupancies.filter((o) => o.contractId === id && (o.status === "ACTIVE" || o.status === "PLANNED"));
        if (active.length >= room.capacity) throw new ApiError("CAPACITY_EXCEEDED", `Phòng đã đủ ${room.capacity} người (sức chứa tối đa).`, 422);
        if (input.moveInDate < c.startDate || input.moveInDate > c.endDate) throw new ApiError("VALIDATION", "Ngày vào phải nằm trong thời hạn hợp đồng (AC-003-02).", 422, "moveInDate");
        const p = createPerson(input.person);
        db().occupancies.push({ id: nextId("occupancy"), contractId: id, roomId: room.id, personId: p.id, role: "MEMBER", moveInDate: input.moveInDate, status: c.status === "ACTIVE" ? "ACTIVE" : "PLANNED" });
        log("OCCUPANT_ADDED", "contract", id, `Thêm ${p.fullName} vào phòng ${roomKey(room)}`);
      }),
    endOccupancy: (occupancyId, moveOutDate) =>
      write(() => {
        staff();
        const o = db().occupancies.find((x) => x.id === occupancyId);
        if (!o) throw new ApiError("NOT_FOUND", "Không tìm thấy lượt ở.", 404);
        const c = contractOf(o.contractId);
        if (o.role === "REPRESENTATIVE" && isLiveContract(c)) throw new ApiError("INVALID_STATE", "Người đại diện chỉ kết thúc khi trả phòng cả hợp đồng.");
        if (moveOutDate < o.moveInDate) throw new ApiError("VALIDATION", "Ngày ra không được trước ngày vào (AC-003-02).", 422, "moveOutDate");
        o.status = "ENDED";
        o.moveOutDate = moveOutDate;
        log("OCCUPANT_ENDED", "contract", c.id, `${personOf(o.personId).fullName} chuyển ra ngày ${fmtDate(moveOutDate)}`);
      }),
    receiveDeposit: (id, input) =>
      write(() => {
        staff();
        const c = contractOf(id);
        if (db().deposits.some((t) => t.idempotencyKey === input.idempotencyKey)) return;
        if (input.amount <= 0) throw new ApiError("VALIDATION", "Số tiền phải lớn hơn 0.", 422, "amount");
        const short = c.depositRequired - depositReceived(db(), id);
        if (input.amount > short) throw new ApiError("VALIDATION", `Chỉ còn thiếu ${money(short)} tiền cọc.`, 422, "amount");
        db().deposits.push({ id: nextId("deposit"), contractId: id, type: "RECEIVE", amount: input.amount, occurredAt: nowISO(), method: input.method, idempotencyKey: input.idempotencyKey, note: "Nhận bổ sung cọc" });
        log("DEPOSIT_RECEIVED", "contract", id, `Nhận cọc ${money(input.amount)} cho ${c.code}`);
      }),
  },

  services: {
    list: () => read(() => db().services),
    updatePrice: (id, input) =>
      write(() => {
        requireRole("OWNER");
        const s = db().services.find((x) => x.id === id);
        if (!s) throw new ApiError("NOT_FOUND", "Không tìm thấy dịch vụ.", 404);
        if (input.unitPrice <= 0) throw new ApiError("VALIDATION", "Đơn giá phải lớn hơn 0.", 422, "unitPrice");
        if (!input.effectiveFrom.endsWith("-01")) throw new ApiError("VALIDATION", "Giá mới áp dụng từ ngày đầu một kỳ.", 422, "effectiveFrom");
        const p = periodOf(input.effectiveFrom);
        if (db().invoices.some((i) => i.period && i.period >= p && i.status !== "DRAFT" && i.status !== "CANCELLED"))
          throw new ApiError("PERIOD_LOCKED", `${periodLabel(p)} đã có hóa đơn phát hành; chọn kỳ sau để giữ nguyên số tiền đã chốt (AC-007-02).`, 409, "effectiveFrom");
        const before = s.unitPrice;
        s.priceHistory = s.priceHistory.filter((h) => h.effectiveFrom !== input.effectiveFrom).concat({ unitPrice: input.unitPrice, effectiveFrom: input.effectiveFrom });
        if (input.effectiveFrom <= today()) {
          s.unitPrice = input.unitPrice;
          s.effectiveFrom = input.effectiveFrom;
        }
        log("SERVICE_PRICE_CHANGED", "service", id, `Đặt giá ${s.name} ${money(input.unitPrice)}/${s.unit} từ ${periodLabel(p)}`, { unitPrice: before }, { unitPrice: input.unitPrice });
        return s;
      }),
  },

  readings: {
    listPeriod: (period, propertyId) =>
      read(() => {
        staff();
        const d = db();
        const rows: PeriodReadingRow[] = [];
        for (const c of contractsInPeriod(period, propertyId)) {
          const room = d.rooms.find((r) => r.id === c.roomId)!;
          for (const meter of d.meters.filter((m) => m.roomId === room.id && m.status === "ACTIVE")) {
            const service = d.services.find((s) => s.id === meter.serviceId)!;
            const reading = d.readings.filter((r) => r.meterId === meter.id && r.period === period && r.status !== "SUPERSEDED").sort((a, b) => b.id - a.id)[0];
            rows.push({ room, propertyName: propertyOf(room).name, meter, service, previousValue: reading?.previousValue ?? previousValue(d, meter, period), reading });
          }
        }
        return rows.sort((a, b) => roomKey(a.room).localeCompare(roomKey(b.room)) || a.service.id - b.service.id);
      }),
    save: (input) =>
      write(() => {
        const u = staff();
        const d = db();
        const meter = d.meters.find((m) => m.id === input.meterId);
        if (!meter) throw new ApiError("NOT_FOUND", "Không tìm thấy đồng hồ.", 404);
        const room = roomOf(meter.roomId);
        const c = d.contracts.find((x) => x.roomId === room.id && x.status !== "DRAFT" && x.status !== "CANCELLED" && x.startDate <= periodEnd(input.period) && contractEffectiveEnd(x) >= periodStart(input.period));
        if (c && hasIssuedInvoice(c.id, input.period) && d.invoices.some((i) => i.generationKey === `${c.id}:${input.period}:PERIODIC` && i.status !== "DRAFT" && i.status !== "CANCELLED"))
          throw new ApiError("PERIOD_LOCKED", `${periodLabel(input.period)} của phòng ${roomKey(room)} đã phát hành hóa đơn. Muốn sửa phải lập điều chỉnh hóa đơn.`, 409);
        const prev = previousValue(d, meter, input.period);
        if (!Number.isFinite(input.currentValue)) throw new ApiError("VALIDATION", "Chỉ số không hợp lệ.", 422, "currentValue");
        if (input.currentValue < prev)
          throw new ApiError("READING_DECREASED", `Chỉ số mới (${num(input.currentValue)}) nhỏ hơn chỉ số cũ (${num(prev)}). Nếu đã thay đồng hồ, hãy ghi biên bản thay đồng hồ trước (AC-008-02).`, 422, "currentValue");
        const history = d.readings.filter((r) => r.meterId === meter.id && r.status === "CONFIRMED" && r.period < input.period).sort((a, b) => b.period.localeCompare(a.period)).slice(0, 3);
        const avg = history.length ? sum(history.map((r) => r.currentValue - r.previousValue)) / history.length : 0;
        const cons = input.currentValue - prev;
        const isAnomaly = avg > 0 && (cons > avg * 1.8 || cons < avg * 0.35);
        const existing = d.readings.filter((r) => r.meterId === meter.id && r.period === input.period && r.status !== "SUPERSEDED");
        const draft = existing.find((r) => r.status === "DRAFT");
        if (draft) {
          Object.assign(draft, { currentValue: input.currentValue, previousValue: prev, source: input.source, isAnomaly, readAt: nowISO(), recordedBy: u.fullName });
          return draft;
        }
        existing.forEach((r) => (r.status = "SUPERSEDED"));
        const reading = { id: nextId("reading"), meterId: meter.id, period: input.period, previousValue: prev, currentValue: input.currentValue, source: input.source, status: "DRAFT" as const, isAnomaly, readAt: nowISO(), recordedBy: u.fullName };
        d.readings.push(reading);
        return reading;
      }, [120, 300]),
    confirm: (ids) =>
      write(() => {
        staff();
        let n = 0;
        for (const r of db().readings) {
          if (!ids.includes(r.id) || r.status !== "DRAFT") continue;
          const meter = db().meters.find((m) => m.id === r.meterId)!;
          roomOf(meter.roomId);
          r.status = "CONFIRMED";
          r.confirmedAt = nowISO();
          n++;
        }
        if (n) log("READINGS_CONFIRMED", "meter_reading", "batch", `Xác nhận ${n} chỉ số đồng hồ`);
        return n;
      }),
    ocr: async (meterId, period) => {
      await wait(1400, 2200);
      staff();
      const d = db();
      const meter = d.meters.find((m) => m.id === meterId);
      if (!meter) throw new ApiError("NOT_FOUND", "Không tìm thấy đồng hồ.", 404);
      if (Math.random() < 0.12) throw new ApiError("OCR_UNREADABLE", "Ảnh mờ hoặc lóa, không đọc được số. Vui lòng nhập tay (AC-009-03).", 422);
      const prev = previousValue(d, meter, period);
      const service = d.services.find((s) => s.id === meter.serviceId)!;
      const value = prev + (service.code === "ELECTRIC" ? 80 + Math.floor(Math.random() * 90) : 3 + Math.floor(Math.random() * 6));
      return { value, confidence: 0.82 + Math.random() * 0.16 };
    },
  },

  invoices: {
    list: (q = {}) =>
      read(() => {
        staff();
        return db()
          .invoices.filter((i) => {
            const room = db().rooms.find((r) => r.id === i.roomId)!;
            if (!inScope(room.propertyId) || (q.propertyId && room.propertyId !== q.propertyId)) return false;
            if (q.period && i.period !== q.period) return false;
            if (q.contractId && i.contractId !== q.contractId) return false;
            return true;
          })
          .map(invoiceView)
          .filter((i) => {
            if (q.status === "OVERDUE") return i.overdue;
            if (q.status === "UNPAID") return i.balance > 0;
            return !q.status || i.status === q.status;
          })
          .filter((i) => !q.search || matches(`${i.invoiceNo} ${i.roomCode} ${i.representativeName}`, q.search))
          .sort((a, b) => (b.period ?? "").localeCompare(a.period ?? "") || a.roomCode.localeCompare(b.roomCode));
      }),
    get: (id) =>
      read((): InvoiceDetail => {
        staff();
        const inv = invoiceOf(id);
        const allocations = db()
          .payments.flatMap((p) => p.allocations.filter((a) => a.invoiceId === id).map((a) => ({ paymentId: p.id, paymentCode: p.code, amount: a.amount, receivedAt: p.receivedAt, method: p.method, status: p.status === "VOIDED" ? ("REVERSED" as const) : a.status })))
          .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
        return { ...invoiceView(inv), allocations, contract: db().contracts.find((c) => c.id === inv.contractId)! };
      }),
    billingRun: (period, propertyId) =>
      read(() => {
        staff();
        const d = db();
        return contractsInPeriod(period, propertyId)
          .map((c): PeriodBillingRow => {
            const room = d.rooms.find((r) => r.id === c.roomId)!;
            const inv = d.invoices.find((i) => i.generationKey === `${c.id}:${period}:PERIODIC` && i.status !== "CANCELLED");
            let tmp = 0;
            const draft = computeInvoiceDraft(d, c, period, () => ++tmp);
            return { contract: c, room, representativeName: personOf(c.representativePersonId).fullName, invoice: inv ? invoiceView(inv) : undefined, missing: inv ? [] : draft.missing, estimate: draft.subtotal };
          })
          .sort((a, b) => roomKey(a.room).localeCompare(roomKey(b.room)));
      }),
    generate: (contractId, period) =>
      write(() => {
        staff();
        const d = db();
        const c = contractOf(contractId);
        const key = `${c.id}:${period}:PERIODIC`;
        const existing = d.invoices.find((i) => i.generationKey === key && i.status !== "CANCELLED");
        if (existing) return { invoice: invoiceView(existing), created: false };
        const draft = computeInvoiceDraft(d, c, period, () => nextId("invoiceItem"));
        if (draft.missing.length) throw new ApiError("MISSING_DATA", `Chưa đủ dữ liệu để lập hóa đơn: ${draft.missing.join("; ")}.`, 422);
        const n = d.invoices.filter((i) => i.period === period).length + 1;
        const inv: Invoice = {
          id: nextId("invoice"),
          invoiceNo: `INV-${period.replace("-", "")}-${String(n).padStart(4, "0")}`,
          contractId: c.id,
          roomId: c.roomId,
          period,
          type: "PERIODIC",
          status: "DRAFT",
          items: draft.items,
          subtotal: draft.subtotal,
          adjustments: [],
          generationKey: key,
          createdAt: nowISO(),
        };
        d.invoices.push(inv);
        log("INVOICE_GENERATED", "invoice", inv.id, `Lập hóa đơn nháp ${inv.invoiceNo} (${periodLabel(period)})`, undefined, { subtotal: inv.subtotal });
        return { invoice: invoiceView(inv), created: true };
      }, [150, 350]),
    issue: (id) =>
      write(() => {
        staff();
        const inv = invoiceOf(id);
        if (inv.status !== "DRAFT") throw new ApiError("INVALID_STATE", "Hóa đơn đã được phát hành.");
        const c = db().contracts.find((x) => x.id === inv.contractId)!;
        inv.status = "ISSUED";
        inv.issuedAt = nowISO();
        inv.dueDate = addDays(today(), c.paymentDueDays);
        refreshInvoiceStatus(db(), inv);
        log("INVOICE_ISSUED", "invoice", inv.id, `Phát hành ${inv.invoiceNo}, hạn đóng ${fmtDate(inv.dueDate)}`, { status: "DRAFT" }, { status: "ISSUED", total: invoiceTotal(inv) });
        return invoiceView(inv);
      }, [150, 350]),
    addAdjustment: (id, input) =>
      write(() => {
        const u = staff();
        const inv = invoiceOf(id);
        if (inv.status === "DRAFT" || inv.status === "CANCELLED") throw new ApiError("INVALID_STATE", "Chỉ điều chỉnh hóa đơn đã phát hành. Hóa đơn nháp có thể lập lại.");
        if (!input.amount) throw new ApiError("VALIDATION", "Số tiền điều chỉnh phải khác 0.", 422, "amount");
        if (!input.reason.trim()) throw new ApiError("VALIDATION", "Bắt buộc ghi lý do điều chỉnh (AC-010-03).", 422, "reason");
        if (invoiceTotal(inv) + input.amount < invoicePaid(db(), inv.id)) throw new ApiError("VALIDATION", "Điều chỉnh giảm làm tổng hóa đơn nhỏ hơn số tiền đã thu.", 422, "amount");
        const before = invoiceTotal(inv);
        inv.adjustments.push({ id: nextId("adjustment"), amount: input.amount, reason: input.reason.trim(), createdAt: nowISO(), createdBy: u.fullName });
        refreshInvoiceStatus(db(), inv);
        log("INVOICE_ADJUSTED", "invoice", inv.id, `Điều chỉnh ${inv.invoiceNo}: ${input.reason}`, { total: before }, { total: invoiceTotal(inv) });
        return invoiceView(inv);
      }),
    cancel: (id, reason) =>
      write(() => {
        staff();
        const inv = invoiceOf(id);
        if (!reason.trim()) throw new ApiError("VALIDATION", "Vui lòng nhập lý do hủy.", 422, "reason");
        if (inv.status !== "DRAFT" && invoicePaid(db(), inv.id) > 0) throw new ApiError("HAS_PAYMENTS", "Hóa đơn đã có tiền phân bổ. Hãy hủy phiếu thu liên quan hoặc lập điều chỉnh.", 409);
        const before = inv.status;
        inv.status = "CANCELLED";
        log("INVOICE_CANCELLED", "invoice", inv.id, `Hủy ${inv.invoiceNo}: ${reason}`, { status: before }, { status: "CANCELLED" });
        return invoiceView(inv);
      }),
  },

  payments: {
    list: (q = {}) =>
      read(() => {
        staff();
        return db()
          .payments.filter((p) => {
            const c = db().contracts.find((x) => x.id === p.contractId)!;
            const room = db().rooms.find((r) => r.id === c.roomId)!;
            return inScope(room.propertyId) && (!q.method || p.method === q.method) && (!q.contractId || p.contractId === q.contractId);
          })
          .map(paymentView)
          .filter((p) => !q.search || matches(`${p.code} ${p.roomCode} ${p.payerName} ${p.reference ?? ""}`, q.search))
          .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
      }),
    create: (input) =>
      write(() => {
        const u = staff();
        const d = db();
        const dup = d.payments.find((p) => p.idempotencyKey === input.idempotencyKey);
        if (dup) return { payment: paymentView(dup), duplicated: true, paidInvoiceNos: [] };
        const c = contractOf(input.contractId);
        if (!(input.amount > 0)) throw new ApiError("VALIDATION", "Số tiền thu phải lớn hơn 0.", 422, "amount");
        let allocations = input.allocations?.filter((a) => a.amount > 0);
        if (allocations?.length) {
          let total = 0;
          for (const a of allocations) {
            const inv = d.invoices.find((i) => i.id === a.invoiceId);
            if (!inv || inv.contractId !== c.id) throw new ApiError("VALIDATION", "Hóa đơn phân bổ không thuộc hợp đồng này.", 422);
            if (a.amount > invoiceBalance(d, inv)) throw new ApiError("VALIDATION", `Phân bổ vào ${inv.invoiceNo} vượt số còn nợ (${money(invoiceBalance(d, inv))}).`, 422);
            total += a.amount;
          }
          if (total > input.amount) throw new ApiError("VALIDATION", "Tổng phân bổ lớn hơn số tiền thu.", 422);
        } else allocations = autoAllocate(d, c.id, input.amount);

        const before = new Map(allocations.map((a) => [a.invoiceId, d.invoices.find((i) => i.id === a.invoiceId)!.status]));
        const pid = nextId("payment");
        const p: Payment = {
          id: pid,
          code: `PT-${String(pid).padStart(5, "0")}`,
          contractId: c.id,
          payerPersonId: input.payerPersonId ?? c.representativePersonId,
          amount: input.amount,
          receivedAt: nowISO(),
          method: input.method,
          idempotencyKey: input.idempotencyKey,
          reference: input.reference || undefined,
          status: "CONFIRMED",
          allocations: allocations.map((a) => ({ id: nextId("allocation"), invoiceId: a.invoiceId, amount: a.amount, status: "ACTIVE" })),
          refundedAmount: 0,
          receivedBy: u.fullName,
        };
        d.payments.push(p);
        const paidInvoiceNos: string[] = [];
        for (const a of allocations) {
          const inv = d.invoices.find((i) => i.id === a.invoiceId)!;
          refreshInvoiceStatus(d, inv);
          if (inv.status === "PAID" && before.get(inv.id) !== "PAID") paidInvoiceNos.push(inv.invoiceNo);
        }
        const room = d.rooms.find((r) => r.id === c.roomId)!;
        log("PAYMENT_CREATED", "payment", p.id, `Ghi phiếu thu ${p.code} ${money(p.amount)} phòng ${roomKey(room)}`, undefined, { amount: p.amount, allocated: sum(allocations.map((a) => a.amount)) });
        return { payment: paymentView(p), duplicated: false, paidInvoiceNos };
      }, [500, 900]),
    void: (id, reason) =>
      write(() => {
        staff();
        const d = db();
        const p = d.payments.find((x) => x.id === id);
        if (!p) throw new ApiError("NOT_FOUND", "Không tìm thấy phiếu thu.", 404);
        contractOf(p.contractId);
        if (p.status === "VOIDED") throw new ApiError("INVALID_STATE", "Phiếu thu đã được hủy trước đó.");
        if (!reason.trim()) throw new ApiError("VALIDATION", "Bắt buộc ghi lý do hủy phiếu (AC-011-04).", 422, "reason");
        if (p.refundedAmount > 0) throw new ApiError("INVALID_STATE", "Phiếu đã hoàn tiền dư, không thể hủy.");
        p.status = "VOIDED";
        p.voidReason = reason.trim();
        p.allocations.forEach((a) => (a.status = "REVERSED"));
        for (const a of p.allocations) refreshInvoiceStatus(d, d.invoices.find((i) => i.id === a.invoiceId)!);
        log("PAYMENT_VOIDED", "payment", p.id, `Hủy phiếu thu ${p.code}: ${reason}`, { status: "CONFIRMED", amount: p.amount }, { status: "VOIDED" });
        return paymentView(p);
      }),
    refund: (id, amount) =>
      write(() => {
        staff();
        const p = db().payments.find((x) => x.id === id);
        if (!p) throw new ApiError("NOT_FOUND", "Không tìm thấy phiếu thu.", 404);
        contractOf(p.contractId);
        if (amount <= 0 || amount > paymentUnallocated(p)) throw new ApiError("VALIDATION", `Chỉ hoàn tối đa ${money(paymentUnallocated(p))} tiền dư.`, 422, "amount");
        p.refundedAmount += amount;
        log("OVERPAYMENT_REFUNDED", "payment", p.id, `Hoàn tiền dư ${money(amount)} từ ${p.code}`);
        return paymentView(p);
      }),
  },

  checkouts: {
    preview: (contractId, input) =>
      read(() => {
        staff();
        const d = db();
        const c = contractOf(contractId);
        const extra = sum(input.deductions.filter((x) => x.amount > 0).map((x) => x.amount));
        return { contractId: c.id, checkoutDate: input.checkoutDate, deductions: input.deductions, ...settle(contractBalance(d, c.id), extra, depositAvailable(d, c.id)) };
      }),
    confirm: (contractId, input) =>
      write(() => {
        const u = staff();
        const d = db();
        const c = contractOf(contractId);
        const existing = d.checkouts.find((x) => x.contractId === c.id && x.status === "CONFIRMED");
        if (existing) return { checkout: existing, duplicated: true };
        if (!isLiveContract(c)) throw new ApiError("INVALID_STATE", "Hợp đồng không còn hiệu lực để trả phòng.");
        if (input.checkoutDate < c.startDate) throw new ApiError("VALIDATION", "Ngày trả phòng không được trước ngày bắt đầu hợp đồng.", 422, "checkoutDate");
        const deductions = input.deductions.filter((x) => x.amount > 0 && x.description.trim());
        const s = settle(contractBalance(d, c.id), sum(deductions.map((x) => x.amount)), depositAvailable(d, c.id));
        const room = d.rooms.find((r) => r.id === c.roomId)!;
        const coId = nextId("checkout");

        if (deductions.length) {
          const items = deductions.map((x) => ({ id: nextId("invoiceItem"), kind: "DAMAGE" as const, description: x.description, quantity: 1, unit: "khoản", unitPrice: x.amount, amount: x.amount, formula: "Khấu trừ đã được duyệt khi bàn giao trả phòng" }));
          const inv: Invoice = {
            id: nextId("invoice"),
            invoiceNo: `INV-CO-${String(coId).padStart(4, "0")}`,
            contractId: c.id,
            roomId: c.roomId,
            type: "CHECKOUT",
            status: "ISSUED",
            items,
            subtotal: sum(items.map((i) => i.amount)),
            adjustments: [],
            dueDate: today(),
            issuedAt: nowISO(),
            generationKey: `${c.id}:CHECKOUT`,
            createdAt: nowISO(),
          };
          d.invoices.push(inv);
        }
        if (s.depositUsed > 0) {
          d.deposits.push({ id: nextId("deposit"), contractId: c.id, type: "APPLY_TO_DEBT", amount: s.depositUsed, occurredAt: nowISO(), checkoutId: coId, idempotencyKey: `checkout-apply-${coId}`, note: "Cấn trừ cọc vào công nợ khi trả phòng" });
          const pid = nextId("payment");
          d.payments.push({
            id: pid,
            code: `PT-${String(pid).padStart(5, "0")}`,
            contractId: c.id,
            payerPersonId: c.representativePersonId,
            amount: s.depositUsed,
            receivedAt: nowISO(),
            method: "OTHER",
            idempotencyKey: `checkout-offset-${coId}`,
            reference: "Cấn trừ tiền cọc khi trả phòng",
            status: "CONFIRMED",
            allocations: autoAllocate(d, c.id, s.depositUsed).map((a) => ({ id: nextId("allocation"), ...a, status: "ACTIVE" as const })),
            refundedAmount: 0,
            receivedBy: u.fullName,
          });
          d.invoices.filter((i) => i.contractId === c.id).forEach((i) => refreshInvoiceStatus(d, i));
        }
        if (s.refundAmount > 0)
          d.deposits.push({ id: nextId("deposit"), contractId: c.id, type: "REFUND", amount: s.refundAmount, occurredAt: nowISO(), method: "BANK_TRANSFER", checkoutId: coId, idempotencyKey: `checkout-refund-${coId}`, note: "Hoàn cọc còn lại cho người thuê" });

        const checkout: Checkout = { id: coId, contractId: c.id, checkoutDate: input.checkoutDate, deductions, ...s, status: "CONFIRMED", confirmedAt: nowISO(), createdAt: nowISO() };
        d.checkouts.push(checkout);
        c.status = "TERMINATED";
        c.terminatedAt = nowISO();
        c.terminationReason = `Trả phòng ngày ${fmtDate(input.checkoutDate)}`;
        d.occupancies.filter((o) => o.contractId === c.id && (o.status === "ACTIVE" || o.status === "PLANNED")).forEach((o) => {
          o.status = "ENDED";
          o.moveOutDate = input.checkoutDate;
        });
        const blocked = d.maintenance.some((m) => m.roomId === room.id && m.blocksRoom && !["RESOLVED", "CLOSED", "CANCELLED"].includes(m.status));
        room.status = blocked ? "MAINTENANCE" : "VACANT";
        log("CHECKOUT_CONFIRMED", "contract", c.id, `Quyết toán trả phòng ${roomKey(room)}: hoàn ${money(s.refundAmount)}, thu thêm ${money(s.extraCharge)}`, { depositAvailable: s.depositAvailable }, { depositUsed: s.depositUsed, refund: s.refundAmount, extraCharge: s.extraCharge });
        return { checkout, duplicated: false };
      }, [900, 1400]),
  },

  maintenance: {
    list: (q = {}) =>
      read(() => {
        const u = me();
        return db()
          .maintenance.filter((m) => {
            const room = db().rooms.find((r) => r.id === m.roomId)!;
            if (u.role === "TENANT") return m.reportedBy === u.fullName;
            return inScope(room.propertyId) && (!q.roomId || m.roomId === q.roomId);
          })
          .map((m) => ({ ...m, roomCode: roomKey(db().rooms.find((r) => r.id === m.roomId)!) }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }),
    create: (input) =>
      write(() => {
        const u = me();
        const d = db();
        if (u.role === "TENANT") {
          const own = d.occupancies.some((o) => o.personId === u.personId && o.roomId === input.roomId && o.status === "ACTIVE");
          if (!own) throw new ApiError("FORBIDDEN", "Bạn chỉ báo hỏng được phòng mình đang ở.", 403);
        } else roomOf(input.roomId);
        if (!input.title.trim()) throw new ApiError("VALIDATION", "Vui lòng nhập tiêu đề.", 422, "title");
        const id = nextId("maintenance");
        const m = { id, code: `BT-${String(id).padStart(4, "0")}`, ...input, title: input.title.trim(), status: "NEW" as const, reportedBy: u.fullName, createdAt: nowISO(), history: [{ at: nowISO(), by: u.fullName, status: "NEW" as const }] };
        d.maintenance.push(m);
        const room = d.rooms.find((r) => r.id === input.roomId)!;
        if (input.blocksRoom && room.status === "VACANT") room.status = "MAINTENANCE";
        log("MAINTENANCE_CREATED", "maintenance", id, `Báo hỏng ${m.code} phòng ${roomKey(room)}: ${m.title}`);
        return m;
      }),
    transition: (id, input) =>
      write(() => {
        const u = staff();
        const d = db();
        const m = d.maintenance.find((x) => x.id === id);
        if (!m) throw new ApiError("NOT_FOUND", "Không tìm thấy yêu cầu.", 404);
        const room = roomOf(m.roomId);
        if (!TRANSITIONS[m.status].includes(input.status)) throw new ApiError("INVALID_TRANSITION", `Không thể chuyển từ trạng thái hiện tại sang trạng thái này.`, 409);
        const before = m.status;
        m.status = input.status;
        if (input.assignedTo) m.assignedTo = input.assignedTo;
        if (input.cost != null) m.cost = input.cost;
        if (input.note) m.resolutionNote = input.note;
        m.history.push({ at: nowISO(), by: u.fullName, status: input.status, note: input.note });
        if (["RESOLVED", "CLOSED", "CANCELLED"].includes(input.status) && room.status === "MAINTENANCE") {
          const stillBlocked = d.maintenance.some((x) => x.id !== m.id && x.roomId === room.id && x.blocksRoom && !["RESOLVED", "CLOSED", "CANCELLED"].includes(x.status));
          const live = d.contracts.some((c) => c.roomId === room.id && isLiveContract(c));
          if (!stillBlocked && !live) room.status = "VACANT";
        }
        log("MAINTENANCE_TRANSITION", "maintenance", id, `${m.code}: ${before} → ${input.status}`, { status: before }, { status: input.status });
        return m;
      }),
  },

  dashboard: {
    get: (propertyId) =>
      read((): DashboardData => {
        staff();
        const d = db();
        const curP = currentPeriod();
        const lastP = addPeriods(curP, -1);
        const rooms = d.rooms.filter((r) => inScope(r.propertyId) && (!propertyId || r.propertyId === propertyId));
        const roomIds = new Set(rooms.map((r) => r.id));
        const invoices = d.invoices.filter((i) => roomIds.has(i.roomId) && i.status !== "DRAFT" && i.status !== "CANCELLED");
        const contracts = d.contracts.filter((c) => roomIds.has(c.roomId));
        const live = contracts.filter(isLiveContract);
        const payments = d.payments.filter((p) => p.status === "CONFIRMED" && contracts.some((c) => c.id === p.contractId));

        const revenueSeries = Array.from({ length: 6 }, (_, i) => addPeriods(curP, i - 5)).map((p) => {
          const inv = invoices.filter((x) => x.period === p);
          return { period: p, billed: sum(inv.map(invoiceTotal)), collected: sum(inv.map((x) => invoicePaid(d, x.id))) };
        });
        const debtors = live
          .map((c) => {
            const open = invoices.filter((i) => i.contractId === c.id && invoiceBalance(d, i) > 0).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
            return { contractId: c.id, roomCode: roomKey(d.rooms.find((r) => r.id === c.roomId)!), name: personOf(c.representativePersonId).fullName, balance: sum(open.map((i) => invoiceBalance(d, i))), oldestDue: open[0]?.dueDate };
          })
          .filter((x) => x.balance > 0)
          .sort((a, b) => b.balance - a.balance);

        return {
          period: lastP,
          rooms: {
            total: rooms.length,
            occupied: rooms.filter((r) => r.status === "OCCUPIED").length,
            vacant: rooms.filter((r) => r.status === "VACANT").length,
            maintenance: rooms.filter((r) => r.status === "MAINTENANCE").length,
            inactive: rooms.filter((r) => r.status === "INACTIVE").length,
          },
          occupants: d.occupancies.filter((o) => roomIds.has(o.roomId) && o.status === "ACTIVE").length,
          billedThisPeriod: sum(invoices.filter((i) => i.period === lastP).map(invoiceTotal)),
          collectedThisPeriod: sum(payments.filter((p) => periodOf(localDate(p.receivedAt)) === curP && p.method !== "OTHER").map((p) => p.amount - p.refundedAmount)),
          outstanding: sum(invoices.map((i) => invoiceBalance(d, i))),
          overdueCount: invoices.filter((i) => isOverdue(d, i)).length,
          depositHeld: sum(live.map((c) => depositAvailable(d, c.id))),
          revenueSeries,
          topDebtors: debtors.slice(0, 6),
          recentPayments: [...payments].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, 6).map(paymentView),
          reminders: buildReminders(propertyId),
        };
      }),
  },

  reminders: {
    list: () =>
      read(() => {
        if (me().role === "TENANT") return [];
        return buildReminders();
      }),
  },

  audit: {
    list: (q = {}) =>
      read(() => {
        requireRole("OWNER");
        return db()
          .audit.filter((a) => (!q.entityType || a.entityType === q.entityType) && (!q.search || matches(`${a.summary} ${a.actor} ${a.action}`, q.search)))
          .slice(0, 400);
      }),
  },

  search: (q) =>
    read((): SearchResult[] => {
      const u = me();
      if (u.role === "TENANT" || q.trim().length < 1) return [];
      const d = db();
      const out: SearchResult[] = [];
      for (const r of d.rooms.filter((x) => inScope(x.propertyId))) {
        if (matches(roomKey(r), q)) out.push({ type: "room", id: r.id, title: `Phòng ${roomKey(r)}`, subtitle: `${propertyOf(r).name} · ${r.capacity} người · ${money(r.listedRent)}`, link: `/app/rooms/${r.id}` });
      }
      for (const p of d.persons) {
        if (!matches(`${p.fullName} ${p.phone}`, q)) continue;
        const occ = d.occupancies.find((o) => o.personId === p.id && o.status === "ACTIVE") ?? d.occupancies.find((o) => o.personId === p.id);
        if (!occ) continue;
        const room = d.rooms.find((r) => r.id === occ.roomId)!;
        if (!inScope(room.propertyId)) continue;
        out.push({ type: "person", id: p.id, title: p.fullName, subtitle: `${p.phone} · Phòng ${roomKey(room)}${occ.status === "ENDED" ? " (đã chuyển đi)" : ""}`, link: `/app/contracts/${occ.contractId}` });
      }
      for (const c of d.contracts) {
        const room = d.rooms.find((r) => r.id === c.roomId)!;
        if (inScope(room.propertyId) && matches(c.code, q)) out.push({ type: "contract", id: c.id, title: c.code, subtitle: `Phòng ${roomKey(room)} · ${personOf(c.representativePersonId).fullName}`, link: `/app/contracts/${c.id}` });
      }
      for (const i of d.invoices) {
        const room = d.rooms.find((r) => r.id === i.roomId)!;
        if (inScope(room.propertyId) && matches(i.invoiceNo, q)) out.push({ type: "invoice", id: i.id, title: i.invoiceNo, subtitle: `Phòng ${roomKey(room)} · ${money(invoiceTotal(i))}`, link: `/app/invoices/${i.id}` });
      }
      return out.slice(0, 14);
    }),

  tenant: {
    overview: () =>
      read(() => {
        const u = requireRole("TENANT");
        const d = db();
        const person = personOf(u.personId!);
        const occ = d.occupancies.find((o) => o.personId === person.id && o.status === "ACTIVE");
        const c = occ ? d.contracts.find((x) => x.id === occ.contractId) : undefined;
        let contract: ContractView | undefined;
        if (c) {
          const v = contractView(c);
          v.occupants = v.occupants.map((o) =>
            o.personId === person.id ? o : { ...o, person: { ...o.person, phone: "•••", email: "•••", identityNumber: "•••", permanentAddress: "•••", dateOfBirth: "" } },
          );
          contract = v;
        }
        return {
          person,
          contract,
          invoices: c ? d.invoices.filter((i) => i.contractId === c.id && i.status !== "DRAFT" && i.status !== "CANCELLED").map(invoiceView).sort((a, b) => (b.period ?? "z").localeCompare(a.period ?? "z")) : [],
          maintenance: d.maintenance.filter((m) => c && m.roomId === c.roomId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          payments: c ? d.payments.filter((p) => p.contractId === c.id).map(paymentView).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)) : [],
        };
      }),
  },

  demo: {
    reset: async () => {
      await wait(400, 700);
      resetDB();
    },
  },
};