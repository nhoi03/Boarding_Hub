import { useQuery } from '@tanstack/react-query';
import { Alert } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth, authError } from '../auth';
import { Heading } from '../ui';
import { money } from '../demo';
import { httpApi } from './http';
import { n, s } from './types';
import './rental.css';
export default function RentalOverview() {
  const {user}=useAuth();
  const query=useQuery({queryKey:['rental',user?.id,'http'],queryFn:()=>httpApi.state(),enabled:!!user});
  return <div className="workspace-page rental-page"><Heading title={`Chào ${user?.fullName}`} description="Quản lý luồng thuê bằng dữ liệu thật, tách riêng theo tài khoản chủ trọ."/>
    {query.isPending?<p role="status">Đang tải tổng quan…</p>:query.isError?<Alert type="error" title={authError(query.error)}/>:<>
      <div className="rental-summary"><article className="product-panel"><small>Phòng đang ở / tổng phòng</small><strong>{query.data.rooms.filter(row=>s(row,'status')==='OCCUPIED').length} / {query.data.rooms.length}</strong></article><article className="product-panel"><small>Hợp đồng hiệu lực</small><strong>{query.data.contracts.filter(row=>s(row,'status')==='ACTIVE').length}</strong></article><article className="product-panel"><small>Công nợ đã phát hành</small><strong>{money(query.data.invoices.filter(row=>s(row,'status')==='ISSUED').reduce((total,row)=>total+n(row,'balance'),0))}</strong></article></div>
      <section className="product-panel"><h2>Tiếp tục công việc</h2><div className="admin-link-grid"><Link to="/tenants" className="role-entry">1. Phòng, người thuê & vào ở</Link><Link to="/invoices" className="role-entry">2. Chốt chỉ số, hóa đơn & ghi thu</Link><Link to="/checkout" className="role-entry">3. Trả phòng, cấn nợ & hoàn cọc</Link></div>
      <p>Ba luồng này lưu dữ liệu trên MySQL. Trong từng luồng có chế độ dùng thử riêng trong trình duyệt. Các mục bảo trì, tài sản, cư trú và kinh doanh hiện vẫn là bản minh họa.</p></section>
    </>}
  </div>;
}
