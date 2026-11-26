import type { BoardingHubApi } from "./contract";
import { ApiError, type Session } from "./types";

/**
 * Bản gọi REST tới Spring Boot (/api/v1). Mỗi hàm ứng với một endpoint,
 * nên file này cũng là danh sách API backend cần cài.
 * Lỗi backend trả về dạng { code, message, field? } theo RFC 7807 rút gọn.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const TOKEN_KEY = "bh-token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

type Query = Record<string, string | number | undefined | null>;

function qs(q?: Query) {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) tokenStore.set(null);
    throw new ApiError(data.code ?? `HTTP_${res.status}`, data.message ?? "Có lỗi xảy ra, vui lòng thử lại.", res.status, data.field);
  }
  return data as T;
}

const get = <T,>(p: string, q?: Query) => call<T>("GET", p + qs(q));
const post = <T,>(p: string, b?: unknown, h?: Record<string, string>) => call<T>("POST", p, b ?? {}, h);
const put = <T,>(p: string, b?: unknown) => call<T>("PUT", p, b ?? {});
const idem = (key: string) => ({ "Idempotency-Key": key });

export const httpApi: BoardingHubApi = {
  auth: {
    login: async (email, password) => {
      const s = await post<Session>("/auth/login", { email, password });
      tokenStore.set(s.token);
      return s;
    },
    me: () => get("/auth/me"),
    logout: async () => {
      await post("/auth/logout").catch(() => undefined);
      tokenStore.set(null);
    },
    demoAccounts: async () => [],
  },
  properties: { list: () => get("/properties") },
  rooms: {
    list: (q) => get("/rooms", q),
    get: (id) => get(`/rooms/${id}`),
    create: (input) => post("/rooms", input),
    update: (id, input) => put(`/rooms/${id}`, input),
    setStatus: (id, status, reason) => post(`/rooms/${id}/status`, { status, reason }),
  },
  persons: { list: (q) => get("/persons", q) },
  contracts: {
    list: (q) => get("/contracts", q),
    get: (id) => get(`/contracts/${id}`),
    create: (input) => post("/contracts", input),
    activate: (id) => post(`/contracts/${id}/activate`),
    extend: (id, input) => post(`/contracts/${id}/extensions`, input),
    changeRent: (id, input) => post(`/contracts/${id}/rent-rates`, input),
    addOccupant: (id, input) => post(`/contracts/${id}/occupancies`, input),
    endOccupancy: (occupancyId, moveOutDate) => post(`/occupancies/${occupancyId}/end`, { moveOutDate }),
    receiveDeposit: (id, input) => post(`/contracts/${id}/deposits`, input, idem(input.idempotencyKey)),
  },
  services: {
    list: () => get("/services"),
    updatePrice: (id, input) => post(`/services/${id}/prices`, input),
  },
  readings: {
    listPeriod: (period, propertyId) => get("/meter-readings", { period, propertyId }),
    save: (input) => post("/meter-readings", input),
    confirm: (ids) => post("/meter-readings/confirm", { ids }),
    ocr: (meterId, period) => post("/meter-readings/ocr", { meterId, period }),
  },
  invoices: {
    list: (q) => get("/invoices", q),
    get: (id) => get(`/invoices/${id}`),
    billingRun: (period, propertyId) => get("/billing-runs", { period, propertyId }),
    generate: (contractId, period) => post("/invoices/generate", { contractId, period }, idem(`${contractId}:${period}:PERIODIC`)),
    issue: (id) => post(`/invoices/${id}/issue`),
    addAdjustment: (id, input) => post(`/invoices/${id}/adjustments`, input),
    cancel: (id, reason) => post(`/invoices/${id}/cancel`, { reason }),
  },
  payments: {
    list: (q) => get("/payments", q),
    create: (input) => post("/payments", input, idem(input.idempotencyKey)),
    void: (id, reason) => post(`/payments/${id}/void`, { reason }),
    refund: (id, amount) => post(`/payments/${id}/refunds`, { amount }),
  },
  checkouts: {
    preview: (contractId, input) => post(`/contracts/${contractId}/checkout/preview`, input),
    confirm: (contractId, input) => post(`/contracts/${contractId}/checkout`, input, idem(`checkout-${contractId}`)),
  },
  maintenance: {
    list: (q) => get("/maintenance-requests", q),
    create: (input) => post("/maintenance-requests", input),
    transition: (id, input) => post(`/maintenance-requests/${id}/transitions`, input),
  },
  dashboard: { get: (propertyId) => get("/dashboard", { propertyId }) },
  reminders: { list: () => get("/reminders") },
  audit: { list: (q) => get("/audit-logs", q) },
  search: (q) => get("/search", { q }),
  tenant: { overview: () => get("/me/tenancy") },
  demo: { reset: async () => undefined },
};
