import { ClipboardList, DoorOpen, FileText, Gauge, LayoutDashboard, ReceiptText, ScrollText, Settings, Users, Wallet, Wrench, type LucideIcon } from "lucide-react";
import type { Role } from "@/api/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  end?: boolean;
  group: string;
  keywords?: string;
}

export const NAV: NavItem[] = [
  { to: "/app", label: "Tổng quan", icon: LayoutDashboard, roles: ["OWNER", "STAFF"], end: true, group: "Vận hành", keywords: "dashboard bao cao" },
  { to: "/app/rooms", label: "Phòng", icon: DoorOpen, roles: ["OWNER", "STAFF"], group: "Vận hành", keywords: "so do phong trong" },
  { to: "/app/tenants", label: "Người thuê", icon: Users, roles: ["OWNER", "STAFF"], group: "Vận hành", keywords: "khach nguoi o" },
  { to: "/app/contracts", label: "Hợp đồng", icon: FileText, roles: ["OWNER", "STAFF"], group: "Vận hành", keywords: "coc gia han" },
  { to: "/app/meters", label: "Chỉ số điện nước", icon: Gauge, roles: ["OWNER", "STAFF"], group: "Tiền", keywords: "dien nuoc ocr dong ho" },
  { to: "/app/invoices", label: "Hóa đơn", icon: ReceiptText, roles: ["OWNER", "STAFF"], group: "Tiền", keywords: "lap hoa don cong no" },
  { to: "/app/payments", label: "Phiếu thu", icon: Wallet, roles: ["OWNER", "STAFF"], group: "Tiền", keywords: "thu tien thanh toan" },
  { to: "/app/maintenance", label: "Bảo trì", icon: Wrench, roles: ["OWNER", "STAFF"], group: "Khác", keywords: "bao hong sua chua" },
  { to: "/app/audit", label: "Nhật ký", icon: ScrollText, roles: ["OWNER"], group: "Khác", keywords: "audit lich su" },
  { to: "/app/settings", label: "Cài đặt", icon: Settings, roles: ["OWNER"], group: "Khác", keywords: "gia dien nuoc dich vu" },
];

export const QUICK_ACTIONS = [
  { to: "/app/contracts/new", label: "Lập hợp đồng mới", icon: FileText, keywords: "tao hop dong khach moi" },
  { to: "/app/meters", label: "Ghi chỉ số tháng này", icon: Gauge, keywords: "dien nuoc" },
  { to: "/app/invoices/billing", label: "Lập hóa đơn hàng loạt", icon: ClipboardList, keywords: "chot ky" },
  { to: "/app/payments?new=1", label: "Ghi phiếu thu", icon: Wallet, keywords: "thu tien" },
];
