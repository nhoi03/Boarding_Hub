import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import studio from './assets/rental-studio.webp';
import loft from './assets/rental-loft.webp';
import single from './assets/rental-single.webp';

export const roomPhotos = { studio, loft, single };
export const districts = ['Cầu Giấy', 'Nam Từ Liêm', 'Đống Đa', 'Hai Bà Trưng'];
export const roomTypes = ['Studio', 'Phòng có gác', 'Phòng đơn'];
export const people = [
  { id: 'quan', name: 'Trần Minh Quân', shortName: 'Minh Quân', role: 'Người thuê đại diện', initials: 'MQ' },
  { id: 'mai', name: 'Lê Thị Mai', shortName: 'Thị Mai', role: 'Người ở cùng', initials: 'TM' },
  { id: 'an', name: 'Nguyễn Hoài An', shortName: 'Hoài An', role: 'Người ở cùng', initials: 'HA' },
] as const;
export type PersonId = (typeof people)[number]['id'];
export type DemoProperty = { id: number; name: string; address: string };
export type DemoRoom = {
  id: number; propertyId: number; roomNumber: string; capacity: number; basePrice: number;
  status: string; tenant?: string;
};
export type Listing = {
  id: string; roomId: number; title: string; district: string; address: string; type: string;
  price: number; area: number; capacity: number; photo: keyof typeof roomPhotos; description: string;
  amenities: string[]; status: 'Nháp' | 'Chờ kiểm duyệt' | 'Đang công bố' | 'Đã đóng';
};
export type Inquiry = {
  id: string; listingId: string; listingTitle: string; name: string; phone: string;
  note: string; appointment: string; status: 'Mới' | 'Đã phản hồi' | 'Đã xác nhận' | 'Đề nghị đổi lịch' | 'Đã từ chối';
  response?: string;
};
export type ServiceRequest = {
  id: string; person: PersonId; room: string; type: 'Báo hỏng' | 'Tranh chấp';
  title: string; description: string; reference?: string; created: string;
  status: 'Đã gửi' | 'Đang xử lý' | 'Đã hoàn thành'; response?: string;
};
export type Absence = { id: string; person: PersonId; start: string; end: string; note: string; status: 'Chờ xác nhận' | 'Đã xác nhận' | 'Cần điều chỉnh' };
export type Residence = {
  id: string; person: PersonId; type: 'Tạm trú' | 'Tạm vắng'; start: string; end: string;
  note: string; status: 'Nháp' | 'Chờ kiểm tra' | 'Đã kiểm tra' | 'Cần bổ sung'; review?: string;
};
export type Purchase = {
  id: string; person: PersonId; title: string; amount: number; reference: string; approvals: PersonId[];
};
export type Checkout = {
  id: string; person: PersonId; date: string; note: string;
  status: 'Đã gửi' | 'Đang kiểm tra' | 'Sẵn sàng đối chiếu'; debt?: number; deduction?: number; assessment?: string;
};
export type Invoice = {
  id: string; roomId: number; room: string; period: string; due: string; rent: number; utilities: number; service: number;
  status: 'Nháp' | 'Đã phát hành'; receipts: { id: string; amount: number; date: string; method: string; reference: string }[];
};
export type ModuleRecord = Record<string, string>;

type Demo = {
  properties: DemoProperty[]; rooms: DemoRoom[]; listings: Listing[]; inquiries: Inquiry[];
  viewedInquiries: string[]; requests: ServiceRequest[]; absences: Absence[]; residences: Residence[];
  purchases: Purchase[]; checkouts: Checkout[]; invoices: Invoice[]; modules: Record<string, ModuleRecord[]>;
};

export const initialDemo: Demo = {
  properties: [
    { id: 1, name: 'An Nhiên', address: 'Ngõ 68 Dịch Vọng, Cầu Giấy, Hà Nội' },
    { id: 2, name: 'Nhà Mộc', address: 'Ngõ 63 Lê Đức Thọ, Nam Từ Liêm, Hà Nội' },
    { id: 3, name: 'Hiên Nhà', address: 'Ngõ 119 Chùa Láng, Đống Đa, Hà Nội' },
  ],
  rooms: [
    { id: 1, propertyId: 1, roomNumber: 'A101', capacity: 3, tenant: 'Trần Minh Quân', basePrice: 3000000, status: 'OCCUPIED' },
    { id: 2, propertyId: 1, roomNumber: 'A102', capacity: 2, tenant: 'Phạm Văn Hùng', basePrice: 3300000, status: 'OCCUPIED' },
    { id: 3, propertyId: 1, roomNumber: 'A103', capacity: 2, basePrice: 4200000, status: 'AVAILABLE' },
    { id: 4, propertyId: 2, roomNumber: 'B201', capacity: 2, basePrice: 3500000, status: 'AVAILABLE' },
    { id: 5, propertyId: 3, roomNumber: 'C102', capacity: 1, basePrice: 2800000, status: 'AVAILABLE' },
    { id: 6, propertyId: 1, roomNumber: 'A104', capacity: 2, tenant: 'Phan Kim Ngân', basePrice: 3400000, status: 'OCCUPIED' },
    { id: 7, propertyId: 2, roomNumber: 'B202', capacity: 2, tenant: 'Hoàng Minh Phúc', basePrice: 3500000, status: 'OCCUPIED' },
    { id: 8, propertyId: 2, roomNumber: 'B203', capacity: 1, tenant: 'Đỗ Minh Nhật', basePrice: 2800000, status: 'OCCUPIED' },
    { id: 9, propertyId: 2, roomNumber: 'B204', capacity: 2, basePrice: 3200000, status: 'MAINTENANCE' },
    { id: 10, propertyId: 3, roomNumber: 'C101', capacity: 2, tenant: 'Lê Khánh Huyền', basePrice: 3300000, status: 'OCCUPIED' },
    { id: 11, propertyId: 3, roomNumber: 'C103', capacity: 1, tenant: 'Vũ Quỳnh Chi', basePrice: 2900000, status: 'OCCUPIED' },
    { id: 12, propertyId: 3, roomNumber: 'C104', capacity: 2, tenant: 'Hà Minh Khang', basePrice: 3300000, status: 'OCCUPIED' },
  ],
  listings: [
    { id: 'an-nhien', roomId: 3, title: 'Studio có ban công tại Cầu Giấy', district: 'Cầu Giấy', address: 'Dịch Vọng, Cầu Giấy, Hà Nội', type: 'Studio', price: 4200000, area: 28, capacity: 2, photo: 'studio', amenities: ['Ban công', 'Điều hòa', 'Bếp riêng', 'Chỗ để xe'], status: 'Đang công bố', description: 'Studio nhiều ánh sáng tự nhiên, có ban công riêng và bếp nhỏ. Phòng có sẵn giường, tủ và điều hòa. Gần công viên Cầu Giấy và các tuyến xe buýt trên đường Dịch Vọng.' },
    { id: 'nha-moc', roomId: 4, title: 'Phòng gác lửng tại Mỹ Đình', district: 'Nam Từ Liêm', address: 'Mỹ Đình, Nam Từ Liêm, Hà Nội', type: 'Phòng có gác', price: 3500000, area: 24, capacity: 2, photo: 'loft', amenities: ['Gác lửng', 'Bếp riêng', 'Wi-Fi', 'Chỗ để xe'], status: 'Đang công bố', description: 'Phòng có gác ngủ, khu bếp và vệ sinh riêng. Tầng dưới có chỗ ngồi và một góc làm việc. Khu trọ có chỗ để xe và lối đi riêng.' },
    { id: 'hien-nha', roomId: 5, title: 'Phòng đơn gần Chùa Láng', district: 'Đống Đa', address: 'Láng Thượng, Đống Đa, Hà Nội', type: 'Phòng đơn', price: 2800000, area: 19, capacity: 1, photo: 'single', amenities: ['Bàn làm việc', 'Điều hòa', 'Wi-Fi', 'Cửa sổ'], status: 'Đang công bố', description: 'Phòng đơn yên tĩnh, có cửa sổ lớn và bàn làm việc. Đi bộ được tới khu Đại học Ngoại thương và Học viện Ngoại giao. Phù hợp với một người ở.' },
  ],
  inquiries: [],
  viewedInquiries: [],
  requests: [
    { id: 'BR-016', person: 'quan', room: 'A101', type: 'Báo hỏng', title: 'Điều hòa không lạnh', description: 'Điều hòa hoạt động nhưng không làm mát.', created: '2026-11-20', status: 'Đang xử lý', response: 'Kỹ thuật sẽ kiểm tra trong giờ hành chính.' },
    { id: 'BR-015', person: 'mai', room: 'A101', type: 'Báo hỏng', title: 'Rò nước ở vòi lavabo', description: 'Nước rò dưới vòi sau khi khóa.', created: '2026-11-08', status: 'Đã hoàn thành', response: 'Đã thay gioăng vòi.' },
  ],
  absences: [
    { id: 'LV-012', person: 'quan', start: '2026-11-07', end: '2026-11-10', note: 'Về nhà', status: 'Đã xác nhận' },
    { id: 'LV-013', person: 'mai', start: '2026-11-14', end: '2026-11-15', note: '', status: 'Đã xác nhận' },
  ],
  residences: [
    { id: 'CT-01', person: 'quan', type: 'Tạm trú', start: '2026-08-15', end: '2027-08-14', note: 'Theo hợp đồng A101', status: 'Đã kiểm tra' },
    { id: 'CT-02', person: 'mai', type: 'Tạm vắng', start: '2026-11-14', end: '2026-11-15', note: '', status: 'Chờ kiểm tra' },
  ],
  purchases: [
    { id: 'MC-01', person: 'mai', title: 'Túi rác và nước lau sàn', amount: 120000, reference: 'HD-MC-01', approvals: ['an'] },
  ],
  checkouts: [],
  invoices: [
    { id: 'INV-00124', roomId: 1, room: 'A101', period: '2026-11', due: '2026-11-28', rent: 3000000, utilities: 630000, service: 150000, status: 'Đã phát hành', receipts: [] },
    { id: 'INV-00102', roomId: 1, room: 'A101', period: '2026-10', due: '2026-10-28', rent: 3000000, utilities: 612000, service: 150000, status: 'Đã phát hành', receipts: [{ id: 'PT-00102', amount: 3762000, date: '2026-10-26', method: 'Chuyển khoản', reference: 'A101-T10' }] },
    { id: 'INV-00125', roomId: 2, room: 'A102', period: '2026-11', due: '2026-11-20', rent: 3300000, utilities: 396000, service: 150000, status: 'Đã phát hành', receipts: [{ id: 'PT-00125', amount: 1000000, date: '2026-11-19', method: 'Tiền mặt', reference: 'A102-T11' }] },
    ...[6, 7, 8, 9, 10, 11].flatMap((month, index): Invoice[] => {
      const period = `2026-${String(month).padStart(2, '0')}`;
      const sample = [
        { roomId: 10, room: 'C101', rent: 3300000 },
        { roomId: 7, room: 'B202', rent: 3500000 },
        { roomId: 11, room: 'C103', rent: 2900000 },
        { roomId: 8, room: 'B203', rent: 2800000 },
      ];
      return sample.slice(0, Math.min(4, Math.floor(index / 1.5) + 1)).map(({ roomId, room, rent }) => {
        const code = `${room}-T${month}`;
        const utilities = 250000 + index * 19000;
        const service = 150000;
        return { id: `INV-${code}`, roomId, room, period, due: `${period}-28`, rent, utilities, service, status: 'Đã phát hành',
          receipts: [{ id: `PT-${code}`, amount: rent + utilities + service, date: `${period}-19`, method: 'Chuyển khoản', reference: code }] };
      });
    }),
  ],
  modules: {},
};

const DemoContext = createContext<{
  demo: Demo; change: Dispatch<SetStateAction<Demo>>;
} | null>(null);
const storageKey = 'boardinghub-frontend-preview-v1';

function readDemo(fallback = initialDemo): Demo {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return { ...initialDemo, ...JSON.parse(saved) };
  } catch {
    // Start from the sample data when the browser does not provide storage.
  }
  return fallback;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(() => readDemo());
  const current = useRef(demo);
  const storageWritable = useRef(true);

  const change: Dispatch<SetStateAction<Demo>> = update => {
    const previous = storageWritable.current ? readDemo(current.current) : current.current;
    const next = typeof update === 'function' ? update(previous) : update;
    current.current = next;
    setDemo(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      storageWritable.current = true;
    } catch {
      storageWritable.current = false;
    }
  };

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== storageKey || !storageWritable.current) return;
      current.current = readDemo();
      setDemo(current.current);
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return <DemoContext.Provider value={{ demo, change }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider is required');
  return context;
}

export const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
export const formatDate = (value: string) => value ? value.split('T')[0].split('-').reverse().join('/') : '—';
export const formatPeriod = (value: string) => value.split('-').reverse().join('/');
export const formatAppointment = (value: string) => value ? `${formatDate(value)} · ${value.split('T')[1]}` : 'Chỉ liên hệ';
export const personName = (id: PersonId) => people.find(person => person.id === id)?.name ?? id;
export const sampleId = (prefix: string) => `${prefix}-${crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`.toUpperCase();
const vietnamDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
export const today = () => vietnamDate.format(new Date());
export const invoiceTotal = (invoice: Invoice) => invoice.rent + invoice.utilities + invoice.service;
export const invoicePaid = (invoice: Invoice) => invoice.receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
export const invoiceBalance = (invoice: Invoice) => Math.max(0, invoiceTotal(invoice) - invoicePaid(invoice));
export const tenantRoomId = 1;

export function publicListings(demo: Demo) {
  return demo.listings.filter(listing => listing.status === 'Đang công bố' && demo.rooms.some(room => room.id === listing.roomId && room.status === 'AVAILABLE'));
}

export function invoiceStatus(invoice: Invoice) {
  if (invoice.status === 'Nháp') return 'Nháp';
  if (invoiceBalance(invoice) === 0) return 'Đã thanh toán';
  if (invoice.due < today()) return 'Quá hạn';
  return invoicePaid(invoice) ? 'Thanh toán một phần' : 'Chờ thanh toán';
}

export function matchText(value: string, query: string) {
  const normalize = (input: string) => input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  return normalize(value).includes(normalize(query.trim()));
}
