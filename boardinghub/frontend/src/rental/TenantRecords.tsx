import { useQuery } from '@tanstack/react-query';
import { Alert } from 'antd';
import { useAuth, authError } from '../auth';
import { api } from '../api';
import { Heading, Table } from '../ui';
import { money } from '../demo';
import { n, s } from './types';
import type { RentalRow } from './types';
export default function TenantRecords() {
  const {user}=useAuth();
  const query=useQuery({queryKey:['rental-tenant',user?.id],queryFn:async()=>(await api.get<Record<string,RentalRow[]>>('/rental/my')).data,enabled:!!user});
  return <div className="workspace-page"><Heading title="Hồ sơ thuê của tôi" description="Hợp đồng và hóa đơn thật, liên kết bằng email tài khoản đăng nhập của bạn."/>
    {query.isPending?<p role="status">Đang tải hồ sơ…</p>:query.isError?<Alert type="error" title={authError(query.error)}/>:<>
      {!query.data.contracts.length&&<Alert type="info" title="Chưa có hồ sơ thuê được liên kết" description="Chủ trọ cần điền đúng email tài khoản này khi tạo người thuê. Bạn chỉ thấy hồ sơ gắn với email của mình."/>}
      <section className="product-panel"><h2>Hợp đồng</h2><Table columns={['Hợp đồng','Phòng','Bắt đầu','Kết thúc','Tiền thuê','Trạng thái']} rows={query.data.contracts.map(row=>({id:String(row.id),cells:[`#${row.id}`,s(query.data.rooms.find(room=>room.id===n(row,'room_id')),'room_number'),s(row,'start_date'),s(row,'end_date')||'—',money(n(row,'rent_amount')),s(row,'status')==='ACTIVE'?'Đang hiệu lực':s(row,'status')==='DRAFT'?'Nháp':'Đã kết thúc']}))}/></section>
      {query.data.invoices.map(invoice=><section key={invoice.id} className="product-panel"><h2>Hóa đơn #{invoice.id} · {s(invoice,'period_key')}</h2><p>Tổng: {money(n(invoice,'total_amount'))} · Còn phải trả: <b>{money(n(invoice,'balance'))}</b></p>
        <Table columns={['Khoản thu','Số lượng','Đơn giá','Thành tiền']} rows={query.data.invoice_items.filter(row=>n(row,'invoice_id')===invoice.id).map(row=>({id:String(row.id),cells:[s(row,'description'),n(row,'quantity'),money(n(row,'unit_price')),money(n(row,'amount'))]}))}/></section>)}
    </>}
  </div>;
}
