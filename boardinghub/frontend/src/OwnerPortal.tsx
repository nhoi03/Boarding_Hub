import { lazy, Suspense } from 'react';
import {
  Building2, ChartNoAxesColumn, DoorOpen, FolderOpen, LayoutDashboard, LogOut,
  Package, Receipt, Settings, Store, Users, UtilityPole, Wrench,
} from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { OwnerGroups } from './OwnerRecords';
import { OwnerMarketplace, OwnerReports, OwnerResidence, OwnerService } from './OwnerWorkflows';
import { Workspace } from './Workspace';
import type { ThemeControls } from './ui';
import AdminPage from './AdminPage';
import { RequireAuth, useAuth } from './auth';

const RentalWorkspace = lazy(() => import('./rental/RentalWorkspace'));
const RentalOverview = lazy(() => import('./rental/RentalOverview'));

const ownerNavigation = [
  { label: 'Quản lý', items: [
    ['/admin', 'Quản trị tài khoản', Users],
    ['/dashboard', 'Tổng quan', LayoutDashboard], ['/properties', 'Khu trọ', Building2],
    ['/rooms', 'Phòng', DoorOpen], ['/tenants', 'Người thuê & hợp đồng', Users],
  ] },
  { label: 'Vận hành', items: [
    ['/assets', 'Bàn giao tài sản', Package], ['/utilities', 'Điện nước & dịch vụ', UtilityPole],
    ['/invoices', 'Hóa đơn & thu tiền', Receipt], ['/checkout', 'Trả phòng & quyết toán', LogOut],
    ['/maintenance', 'Bảo trì & tranh chấp', Wrench], ['/residence', 'Hồ sơ cư trú', FolderOpen],
  ] },
  { label: 'Kinh doanh', items: [
    ['/listings', 'Tin phòng & lịch xem', Store], ['/reports', 'Báo cáo', ChartNoAxesColumn], ['/operations', 'Vận hành', Settings],
  ] },
] as const;

export default function OwnerPortal({ controls }: { controls: ThemeControls }) {
  const {user} = useAuth();
  const navigation = ownerNavigation.map(group=>({...group,items:group.items.filter(([path])=>path!=='/admin'||user?.role==='ADMIN')}));
  return <Workspace controls={controls} groups={navigation} name="Nguyễn Văn Linh" initials="NL" role="Chủ trọ" home="/dashboard" label="Không gian chủ trọ">
    <Routes>
      <Route path="/admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
      <Route path="/dashboard" element={<Suspense fallback={<p role="status">Đang tải tổng quan…</p>}><RentalOverview /></Suspense>} />
      <Route path="/properties" element={<Navigate to="/tenants" replace />} />
      <Route path="/rooms" element={<Navigate to="/tenants" replace />} />
      <Route path="/tenants" element={<Suspense fallback={<p role="status">Đang tải luồng vào ở…</p>}><RentalWorkspace section="moveIn" /></Suspense>} />
      <Route path="/assets" element={<OwnerGroups key="assets" group="assets" />} />
      <Route path="/utilities" element={<OwnerGroups key="utilities" group="utilities" />} />
      <Route path="/invoices" element={<Suspense fallback={<p role="status">Đang tải kỳ thu…</p>}><RentalWorkspace section="billing" /></Suspense>} />
      <Route path="/checkout" element={<Suspense fallback={<p role="status">Đang tải trả phòng…</p>}><RentalWorkspace section="checkout" /></Suspense>} />
      <Route path="/maintenance" element={<OwnerService />} />
      <Route path="/residence" element={<OwnerResidence />} />
      <Route path="/listings" element={<OwnerMarketplace />} />
      <Route path="/reports" element={<OwnerReports />} />
      <Route path="/operations" element={<OwnerGroups key="operations" group="operations" />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Workspace>;
}
