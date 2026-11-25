import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Pagination, Table } from 'antd';
import { ArrowUpRight } from 'lucide-react';
import { api } from './api';
import type { Account } from './auth';
import { authError, useAuth } from './auth';
import { Heading } from './ui';

const links = [
  ['/dashboard','Tổng quan'], ['/properties','Khu trọ'], ['/rooms','Phòng'],
  ['/tenants','Người thuê & hợp đồng'], ['/assets','Bàn giao tài sản'], ['/utilities','Điện nước & dịch vụ'],
  ['/invoices','Hóa đơn & thu tiền'], ['/checkout','Trả phòng & quyết toán'], ['/maintenance','Bảo trì & tranh chấp'],
  ['/residence','Hồ sơ cư trú'], ['/listings','Tin phòng & lịch xem'], ['/reports','Báo cáo'], ['/operations','Vận hành'],
];
export default function AdminPage() {
  const {user} = useAuth();
  const [items,setItems] = useState<Account[]>([]);
  const [total,setTotal] = useState(0);
  const [page,setPage] = useState(1);
  const [revision,setRevision] = useState(0);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  useEffect(()=>{
    let active = true;
    setLoading(true); setError('');
    api.get<{items:Account[];total:number}>(`/admin/users?page=${page-1}`)
      .then(({data})=>{if(active){setItems(data.items);setTotal(data.total);}})
      .catch(error=>{if(active)setError(authError(error));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[page,revision]);
  return <div className="workspace-page">
    <Heading title="Trung tâm quản trị" description={`Xin chào ${user?.fullName}. Mở các trang quản lý và xem tài khoản đã đăng ký.`}/>
    <section className="product-panel"><h2>Liên kết quản trị</h2><div className="admin-link-grid">
      {links.map(([path,label])=><Link className="role-entry" key={path} to={path}><strong>{label}</strong><ArrowUpRight size={18}/></Link>)}
    </div><p>Các màn nghiệp vụ hiện dùng dữ liệu minh họa; mục tài khoản bên dưới sử dụng dữ liệu thật.</p></section>
    <section className="product-panel"><div className="panel-head"><h2>Tài khoản người dùng</h2><Button onClick={()=>setRevision(value=>value+1)} loading={loading}>Làm mới</Button></div>
      {error?<Alert type="error" showIcon title={error}/>:<>
        <Table rowKey="id" dataSource={items} loading={loading} pagination={false} scroll={{x:650}} columns={[
          {title:'Họ và tên',dataIndex:'fullName'}, {title:'Email',dataIndex:'email'},
          {title:'Vai trò',dataIndex:'role',render:role=>role==='ADMIN'?'Quản trị viên':role==='OWNER'?'Chủ trọ':'Người dùng'},
          {title:'Ngày đăng ký',dataIndex:'createdAt',render:value=>new Date(value).toLocaleString('vi-VN')},
        ]}/>
        <Pagination current={page} total={total} pageSize={20} onChange={setPage} showSizeChanger={false} hideOnSinglePage/>
      </>}
    </section>
  </div>;
}
