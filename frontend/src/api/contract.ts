import type {
  AuditLog,
  Checkout,
  Contract,
  ContractView,
  DashboardData,
  Deduction,
  ID,
  InvoiceView,
  ISODate,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
  MeterReading,
  PaymentMethod,
  PaymentView,
  Period,
  PeriodBillingRow,
  PeriodReadingRow,
  Person,
  Property,
  Reminder,
  Room,
  RoomStatus,
  RoomView,
  SearchResult,
  Service,
  Session,
  User,
  Role,
} from "./types";

/**
 * Hợp đồng giữa frontend và backend. Bản giả lập (mock) và bản gọi REST (http)
 * cùng cài interface này, nên đổi nguồn dữ liệu không phải sửa giao diện.
 */

export interface DemoAccount {
  email: string;
  password: string;
  role: Role;
  label: string;
  description: string;
}

export interface RoomInput {
  propertyId: ID;
  code: string;
  floor: number;
  capacity: number;
  areaM2: number;
  listedRent: number;
  description: string;
  amenities: string[];
}

export interface PersonInput {
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: ISODate;
  identityNumber: string;
  permanentAddress: string;
}

export interface NewContractInput {
  roomId: ID;
  representative: { personId: ID } | { person: PersonInput };
  members: PersonInput[];
  startDate: ISODate;
  endDate: ISODate;
  rent: number;
  depositRequired: number;
  billingAnchorDay: number;
  paymentDueDays: number;
  activate: boolean;
  initialDeposit?: { amount: number; method: PaymentMethod; idempotencyKey: string };
}

export interface PersonListItem extends Person {
  roomCode?: string;
  propertyName?: string;
  contractId?: ID;
  role?: "REPRESENTATIVE" | "MEMBER";
  status: "LIVING" | "MOVED_OUT" | "NO_CONTRACT";
  moveInDate?: ISODate;
}

export interface InvoiceDetail extends InvoiceView {
  allocations: { paymentId: ID; paymentCode: string; amount: number; receivedAt: string; method: PaymentMethod; status: "ACTIVE" | "REVERSED" }[];
  contract: Contract;
}

export interface CreatePaymentInput {
  contractId: ID;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  payerPersonId?: ID;
  allocations?: { invoiceId: ID; amount: number }[];
  idempotencyKey: string;
}

export interface CreatePaymentResult {
  payment: PaymentView;
  duplicated: boolean;
  paidInvoiceNos: string[];
}

export interface CheckoutInput {
  checkoutDate: ISODate;
  deductions: Deduction[];
}

export interface TenantOverview {
  person: Person;
  contract?: ContractView;
  invoices: InvoiceView[];
  maintenance: MaintenanceRequest[];
  payments: PaymentView[];
}

export interface BoardingHubApi {
  auth: {
    login(email: string, password: string): Promise<Session>;
    me(): Promise<User>;
    logout(): Promise<void>;
    demoAccounts(): Promise<DemoAccount[]>;
  };
  properties: {
    list(): Promise<Property[]>;
  };
  rooms: {
    list(q?: { propertyId?: ID; status?: RoomStatus; search?: string }): Promise<RoomView[]>;
    get(id: ID): Promise<RoomView>;
    create(input: RoomInput): Promise<Room>;
    update(id: ID, input: Partial<RoomInput>): Promise<Room>;
    setStatus(id: ID, status: RoomStatus, reason: string): Promise<Room>;
  };
  persons: {
    list(q?: { search?: string; propertyId?: ID }): Promise<PersonListItem[]>;
  };
  contracts: {
    list(q?: { status?: string; propertyId?: ID; search?: string }): Promise<ContractView[]>;
    get(id: ID): Promise<ContractView>;
    create(input: NewContractInput): Promise<Contract>;
    activate(id: ID): Promise<Contract>;
    extend(id: ID, input: { endDate: ISODate; note: string }): Promise<Contract>;
    changeRent(id: ID, input: { amount: number; effectiveFrom: ISODate; reason: string }): Promise<Contract>;
    addOccupant(id: ID, input: { person: PersonInput; moveInDate: ISODate }): Promise<void>;
    endOccupancy(occupancyId: ID, moveOutDate: ISODate): Promise<void>;
    receiveDeposit(id: ID, input: { amount: number; method: PaymentMethod; idempotencyKey: string }): Promise<void>;
  };
  services: {
    list(): Promise<Service[]>;
    updatePrice(id: ID, input: { unitPrice: number; effectiveFrom: ISODate }): Promise<Service>;
  };
  readings: {
    listPeriod(period: Period, propertyId?: ID): Promise<PeriodReadingRow[]>;
    save(input: { meterId: ID; period: Period; currentValue: number; source: "MANUAL" | "OCR" }): Promise<MeterReading>;
    confirm(ids: ID[]): Promise<number>;
    ocr(meterId: ID, period: Period): Promise<{ value: number; confidence: number }>;
  };
  invoices: {
    list(q?: { period?: Period; status?: string; propertyId?: ID; search?: string; contractId?: ID }): Promise<InvoiceView[]>;
    get(id: ID): Promise<InvoiceDetail>;
    billingRun(period: Period, propertyId?: ID): Promise<PeriodBillingRow[]>;
    generate(contractId: ID, period: Period): Promise<{ invoice: InvoiceView; created: boolean }>;
    issue(id: ID): Promise<InvoiceView>;
    addAdjustment(id: ID, input: { amount: number; reason: string }): Promise<InvoiceView>;
    cancel(id: ID, reason: string): Promise<InvoiceView>;
  };
  payments: {
    list(q?: { search?: string; method?: PaymentMethod; contractId?: ID }): Promise<PaymentView[]>;
    create(input: CreatePaymentInput): Promise<CreatePaymentResult>;
    void(id: ID, reason: string): Promise<PaymentView>;
    refund(id: ID, amount: number): Promise<PaymentView>;
  };
  checkouts: {
    preview(contractId: ID, input: CheckoutInput): Promise<Omit<Checkout, "id" | "status" | "createdAt">>;
    confirm(contractId: ID, input: CheckoutInput): Promise<{ checkout: Checkout; duplicated: boolean }>;
  };
  maintenance: {
    list(q?: { roomId?: ID }): Promise<(MaintenanceRequest & { roomCode: string })[]>;
    create(input: { roomId: ID; title: string; description: string; priority: MaintenancePriority; blocksRoom: boolean }): Promise<MaintenanceRequest>;
    transition(id: ID, input: { status: MaintenanceStatus; note?: string; cost?: number; assignedTo?: string }): Promise<MaintenanceRequest>;
  };
  dashboard: {
    get(propertyId?: ID): Promise<DashboardData>;
  };
  reminders: {
    list(): Promise<Reminder[]>;
  };
  audit: {
    list(q?: { entityType?: string; search?: string }): Promise<AuditLog[]>;
  };
  search(q: string): Promise<SearchResult[]>;
  tenant: {
    overview(): Promise<TenantOverview>;
  };
  demo: {
    reset(): Promise<void>;
  };
}
