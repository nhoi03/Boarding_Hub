import type {
  ContractStatus,
  InvoiceStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  Role,
  RoomStatus,
  CheckoutStatus,
  DepositTxnType,
} from "./types";

export type Tone = "green" | "blue" | "amber" | "red" | "gray" | "violet" | "cyan";

export const roleLabel: Record<Role, string> = {
  OWNER: "Chủ trọ",
  STAFF: "Nhân viên",
  TENANT: "Người thuê",
};

export const roomStatus: Record<RoomStatus, { label: string; tone: Tone }> = {
  VACANT: { label: "Trống", tone: "green" },
  OCCUPIED: { label: "Đang thuê", tone: "blue" },
  MAINTENANCE: { label: "Bảo trì", tone: "amber" },
  INACTIVE: { label: "Ngừng dùng", tone: "gray" },
};

export const contractStatus: Record<ContractStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Nháp", tone: "gray" },
  ACTIVE: { label: "Hiệu lực", tone: "green" },
  EXPIRED: { label: "Hết hạn", tone: "amber" },
  TERMINATED: { label: "Đã kết thúc", tone: "violet" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

export const invoiceStatus: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Nháp", tone: "gray" },
  ISSUED: { label: "Chưa thu", tone: "blue" },
  PARTIALLY_PAID: { label: "Thu một phần", tone: "amber" },
  PAID: { label: "Đã thu đủ", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

export const paymentMethod: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  E_WALLET: "Ví điện tử",
  OTHER: "Khác",
};

export const maintenanceStatus: Record<MaintenanceStatus, { label: string; tone: Tone }> = {
  NEW: { label: "Mới", tone: "blue" },
  ACCEPTED: { label: "Đã tiếp nhận", tone: "cyan" },
  IN_PROGRESS: { label: "Đang xử lý", tone: "amber" },
  RESOLVED: { label: "Đã xử lý", tone: "green" },
  CLOSED: { label: "Đã đóng", tone: "gray" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

export const maintenancePriority: Record<MaintenancePriority, { label: string; tone: Tone }> = {
  LOW: { label: "Thấp", tone: "gray" },
  NORMAL: { label: "Bình thường", tone: "blue" },
  HIGH: { label: "Cao", tone: "amber" },
  URGENT: { label: "Khẩn cấp", tone: "red" },
};

export const checkoutStatus: Record<CheckoutStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Nháp", tone: "gray" },
  PENDING_CONFIRMATION: { label: "Chờ xác nhận", tone: "amber" },
  CONFIRMED: { label: "Đã quyết toán", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

export const depositType: Record<DepositTxnType, { label: string; sign: 1 | -1 }> = {
  RECEIVE: { label: "Nhận cọc", sign: 1 },
  APPLY_TO_DEBT: { label: "Cấn trừ nợ", sign: -1 },
  REFUND: { label: "Hoàn cọc", sign: -1 },
};
