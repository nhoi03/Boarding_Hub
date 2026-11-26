import type {
  AuditLog,
  Checkout,
  Contract,
  DepositTxn,
  ID,
  Invoice,
  MaintenanceRequest,
  Meter,
  MeterReading,
  Occupancy,
  Payment,
  Person,
  Property,
  RentRate,
  Room,
  Service,
  User,
} from "../types";
import { buildSeed } from "./seed";

export interface MockUser extends User {
  password: string;
}

export interface DB {
  version: number;
  seq: Record<string, number>;
  users: MockUser[];
  properties: Property[];
  rooms: Room[];
  persons: Person[];
  contracts: Contract[];
  rentRates: RentRate[];
  occupancies: Occupancy[];
  services: Service[];
  meters: Meter[];
  readings: MeterReading[];
  invoices: Invoice[];
  payments: Payment[];
  deposits: DepositTxn[];
  checkouts: Checkout[];
  maintenance: MaintenanceRequest[];
  audit: AuditLog[];
}

const KEY = "bh-mock-db";
const SESSION_KEY = "bh-mock-session";
const DB_VERSION = 3;

let cache: DB | null = null;

export function db(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === DB_VERSION) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    /* dữ liệu hỏng thì sinh lại */
  }
  cache = buildSeed(DB_VERSION);
  persist();
  return cache;
}

export function persist() {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* hết dung lượng thì bỏ qua, dữ liệu vẫn còn trong bộ nhớ */
  }
}

export function resetDB() {
  cache = buildSeed(DB_VERSION);
  persist();
}

export function nextId(entity: string): ID {
  const d = db();
  d.seq[entity] = (d.seq[entity] ?? 0) + 1;
  return d.seq[entity];
}

export function getSessionUserId(): ID | null {
  const v = localStorage.getItem(SESSION_KEY);
  return v ? Number(v) : null;
}

export function setSessionUserId(id: ID | null) {
  if (id == null) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, String(id));
}
