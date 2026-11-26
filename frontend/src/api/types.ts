/**
 * Kiểu dữ liệu phía client, bám theo database/boardinghub.dbml.
 * Tiền là số nguyên VND; ngày là chuỗi ISO "YYYY-MM-DD"; kỳ thu là "YYYY-MM".
 */

export type ID = number;
export type ISODate = string;
export type ISODateTime = string;
export type Period = string;

export type Role = "OWNER" | "STAFF" | "TENANT";

export interface User {
  id: ID;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  personId?: ID;
  propertyIds: ID[];
}

export interface Session {
  token: string;
  user: User;
  expiresAt: ISODateTime;
}

export interface Property {
  id: ID;
  code: string;
  name: string;
  address: string;
  district: string;
  city: string;
}

export type RoomStatus = "VACANT" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";

export interface Room {
  id: ID;
  propertyId: ID;
  code: string;
  floor: number;
  capacity: number;
  areaM2: number;
  listedRent: number;
  status: RoomStatus;
  description: string;
  amenities: string[];
}

export interface Person {
  id: ID;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: ISODate;
  identityNumber: string;
  permanentAddress: string;
  userId?: ID;
}

export type ContractStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED" | "CANCELLED";

export interface RentRate {
  id: ID;
  contractId: ID;
  amount: number;
  effectiveFrom: ISODate;
  reason: string;
  createdAt: ISODateTime;
}

export interface ContractVersion {
  no: number;
  endDate: ISODate;
  note: string;
  createdAt: ISODateTime;
  createdBy: string;
}

export interface Contract {
  id: ID;
  code: string;
  roomId: ID;
  representativePersonId: ID;
  startDate: ISODate;
  endDate: ISODate;
  billingAnchorDay: number;
  paymentDueDays: number;
  depositRequired: number;
  status: ContractStatus;
  activatedAt?: ISODateTime;
  terminatedAt?: ISODateTime;
  terminationReason?: string;
  versions: ContractVersion[];
  createdAt: ISODateTime;
}

export type OccupancyStatus = "PLANNED" | "ACTIVE" | "ENDED" | "CANCELLED";
export type OccupancyRole = "REPRESENTATIVE" | "MEMBER";

export interface Occupancy {
  id: ID;
  contractId: ID;
  roomId: ID;
  personId: ID;
  role: OccupancyRole;
  moveInDate: ISODate;
  moveOutDate?: ISODate;
  status: OccupancyStatus;
}

export type ServiceMethod = "METERED" | "PER_ROOM" | "PER_PERSON" | "FIXED";

export interface Service {
  id: ID;
  code: "ELECTRIC" | "WATER" | "WIFI" | "TRASH" | string;
  name: string;
  unit: string;
  method: ServiceMethod;
  unitPrice: number;
  effectiveFrom: ISODate;
  priceHistory: { unitPrice: number; effectiveFrom: ISODate }[];
}

export interface Meter {
  id: ID;
  roomId: ID;
  serviceId: ID;
  serial: string;
  initialValue: number;
  status: "ACTIVE" | "REPLACED";
}

export type ReadingStatus = "DRAFT" | "CONFIRMED" | "SUPERSEDED";

export interface MeterReading {
  id: ID;
  meterId: ID;
  period: Period;
  previousValue: number;
  currentValue: number;
  source: "MANUAL" | "OCR";
  status: ReadingStatus;
  isAnomaly: boolean;
  readAt: ISODateTime;
  recordedBy: string;
  confirmedAt?: ISODateTime;
}

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type InvoiceType = "PERIODIC" | "CHECKOUT" | "ONE_OFF";
export type InvoiceItemKind = "RENT" | "ELECTRIC" | "WATER" | "SERVICE" | "DAMAGE" | "OTHER";

export interface InvoiceItem {
  id: ID;
  kind: InvoiceItemKind;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  formula: string;
}

export interface InvoiceAdjustment {
  id: ID;
  amount: number;
  reason: string;
  createdAt: ISODateTime;
  createdBy: string;
}

export interface Invoice {
  id: ID;
  invoiceNo: string;
  contractId: ID;
  roomId: ID;
  period?: Period;
  type: InvoiceType;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  adjustments: InvoiceAdjustment[];
  dueDate?: ISODate;
  issuedAt?: ISODateTime;
  generationKey: string;
  createdAt: ISODateTime;
}

/** Hóa đơn kèm số liệu tính từ lịch sử phân bổ (không lưu cứng). */
export interface InvoiceView extends Invoice {
  total: number;
  paid: number;
  balance: number;
  overdue: boolean;
  roomCode: string;
  propertyId: ID;
  representativeName: string;
}

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "E_WALLET" | "OTHER";

export interface PaymentAllocation {
  id: ID;
  invoiceId: ID;
  amount: number;
  status: "ACTIVE" | "REVERSED";
}

export interface Payment {
  id: ID;
  code: string;
  contractId: ID;
  payerPersonId?: ID;
  amount: number;
  receivedAt: ISODateTime;
  method: PaymentMethod;
  idempotencyKey: string;
  reference?: string;
  status: "CONFIRMED" | "VOIDED";
  voidReason?: string;
  allocations: PaymentAllocation[];
  refundedAmount: number;
  receivedBy: string;
}

export interface PaymentView extends Payment {
  roomCode: string;
  payerName: string;
  unallocated: number;
}

export type DepositTxnType = "RECEIVE" | "APPLY_TO_DEBT" | "REFUND";

export interface DepositTxn {
  id: ID;
  contractId: ID;
  type: DepositTxnType;
  amount: number;
  occurredAt: ISODateTime;
  method?: PaymentMethod;
  checkoutId?: ID;
  idempotencyKey: string;
  note: string;
}

export type CheckoutStatus = "DRAFT" | "PENDING_CONFIRMATION" | "CONFIRMED" | "CANCELLED";

export interface Deduction {
  description: string;
  amount: number;
}

export interface Checkout {
  id: ID;
  contractId: ID;
  checkoutDate: ISODate;
  outstandingDebt: number;
  extraDeductions: number;
  totalObligation: number;
  depositAvailable: number;
  depositUsed: number;
  refundAmount: number;
  extraCharge: number;
  deductions: Deduction[];
  status: CheckoutStatus;
  confirmedAt?: ISODateTime;
  createdAt: ISODateTime;
}

export type MaintenanceStatus = "NEW" | "ACCEPTED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "CANCELLED";
export type MaintenancePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface MaintenanceRequest {
  id: ID;
  code: string;
  roomId: ID;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reportedBy: string;
  assignedTo?: string;
  blocksRoom: boolean;
  cost?: number;
  resolutionNote?: string;
  createdAt: ISODateTime;
  history: { at: ISODateTime; by: string; status: MaintenanceStatus; note?: string }[];
}

export interface AuditLog {
  id: ID;
  at: ISODateTime;
  actor: string;
  action: string;
  entityType: string;
  entityId: ID | string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface Reminder {
  id: string;
  kind: "MISSING_READING" | "UNBILLED" | "OVERDUE" | "CONTRACT_EXPIRING" | "DEPOSIT_SHORT" | "MAINTENANCE";
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
  link: string;
}

export interface RoomView extends Room {
  propertyName: string;
  activeContract?: Contract;
  occupants: (Occupancy & { person: Person })[];
  currentRent?: number;
  balance: number;
  openMaintenance: number;
}

export interface ContractView extends Contract {
  room: Room;
  propertyName: string;
  representative: Person;
  occupants: (Occupancy & { person: Person })[];
  currentRent: number;
  rentRates: RentRate[];
  depositReceived: number;
  depositAvailable: number;
  balance: number;
  deposits: DepositTxn[];
  checkout?: Checkout;
}

export interface DashboardData {
  period: Period;
  rooms: { total: number; occupied: number; vacant: number; maintenance: number; inactive: number };
  occupants: number;
  billedThisPeriod: number;
  collectedThisPeriod: number;
  outstanding: number;
  overdueCount: number;
  depositHeld: number;
  revenueSeries: { period: Period; billed: number; collected: number }[];
  topDebtors: { contractId: ID; roomCode: string; name: string; balance: number; oldestDue?: ISODate }[];
  recentPayments: PaymentView[];
  reminders: Reminder[];
}

export interface PeriodReadingRow {
  room: Room;
  propertyName: string;
  meter: Meter;
  service: Service;
  previousValue: number;
  reading?: MeterReading;
}

export interface PeriodBillingRow {
  contract: Contract;
  room: Room;
  representativeName: string;
  invoice?: InvoiceView;
  missing: string[];
  estimate: number;
}

export interface SearchResult {
  type: "room" | "person" | "contract" | "invoice";
  id: ID;
  title: string;
  subtitle: string;
  link: string;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public field?: string,
  ) {
    super(message);
  }
}
