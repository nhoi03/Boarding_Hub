import { useState } from 'react';
import {
  ArrowRight, CalendarDays, ClipboardList, FileText, FolderOpen, House,
  LogOut, MapPin, Plus, Receipt, Users, Wallet, Wrench,
} from 'lucide-react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import {
  formatDate, invoiceBalance, invoiceStatus, money, people, personName, sampleId, tenantRoomId, today, useDemo,
} from './demo';
import type { Checkout, PersonId, Residence, ServiceRequest } from './demo';
import { Blank, Details, FormDialog, Heading, Status, Table } from './ui';
import type { Field, ThemeControls } from './ui';
import { Workspace } from './Workspace';
import Invoices from './Invoices';
import TenantRecords from './rental/TenantRecords';

const root = '/nguoi-thue';
const quickActions = [
  ['bao-tri', 'Gửi báo hỏng', Wrench, 'violet'], ['ngay-nguoi', 'Khai lịch vắng', CalendarDays, 'blue'],
  ['quy-phong', 'Xem quỹ phòng', Wallet, 'green'], ['cu-tru', 'Hồ sơ cư trú', FolderOpen, 'amber'],
] as const;
const nav = [
  { label: 'Phòng của tôi', items: [
    [`${root}/ho-so-thue`, 'Hồ sơ & hóa đơn thật', FileText],
    [root, 'Tổng quan', House], [`${root}/hop-dong`, 'Hợp đồng & bàn giao', FileText],
    [`${root}/hoa-don`, 'Hóa đơn', Receipt], [`${root}/bao-tri`, 'Bảo trì & tranh chấp', Wrench],
  ] },
  { label: 'Tiện ích cư trú', items: [
    [`${root}/ngay-nguoi`, 'Ngày Người & lịch vắng', CalendarDays], [`${root}/quy-phong`, 'Quỹ phòng', Wallet],
    [`${root}/cu-tru`, 'Hồ sơ cư trú', FolderOpen], [`${root}/tra-phong`, 'Trả phòng', LogOut],
  ] },
] as const;

export default function TenantPortal({ controls }: { controls: ThemeControls }) {
  const [person, setPerson] = useState<PersonId>('quan');
  const profile = people.find(item => item.id === person)!;
  return <Workspace controls={controls} groups={nav} name={profile.name} initials={profile.initials} role={profile.role} home={root} label="Không gian người thuê"
    tools={<select className="persona-select" aria-label="Chọn tài khoản người thuê mẫu" value={person} onChange={event => setPerson(event.target.value as PersonId)}>
      {people.map(item => <option value={item.id} key={item.id}>{item.shortName}</option>)}
    </select>}>
    <Routes key={person}>
      <Route path="ho-so-thue" element={<TenantRecords />} />
      <Route index element={<Overview person={person} />} />
      <Route path="hop-dong" element={<Contract person={person} />} />
      <Route path="hoa-don" element={person === 'quan' ? <Invoices owner={false} /> : <PersonalCosts person={person} />} />
      <Route path="bao-tri" element={<Maintenance person={person} />} />
      <Route path="ngay-nguoi" element={<Sharing person={person} />} />
      <Route path="quy-phong" element={<Fund person={person} />} />
      <Route path="cu-tru" element={<ResidencePage person={person} />} />
      <Route path="cu-tru/:id/in" element={<ResidencePrint person={person} />} />
      <Route path="tra-phong" element={<CheckoutPage person={person} />} />
      <Route path="*" element={<Navigate to={root} replace />} />
    </Routes>
  </Workspace>;
}

function Overview({ person }: { person: PersonId }) {
  const { demo } = useDemo();
  const invoice = demo.invoices.filter(entry => entry.roomId === tenantRoomId && entry.status === 'Đã phát hành').sort((a, b) => b.period.localeCompare(a.period))[0];
  const requests = demo.requests.filter(request => request.person === person && request.status !== 'Đã hoàn thành');
  const profile = people.find(item => item.id === person)!;
  return <div className="workspace-page tenant-page">
    <Heading title={`Chào ${profile.shortName}!`} description="Theo dõi phòng thuê và những việc bạn cần xử lý." />
    <section className="tenant-hero">
      <div className="tenant-hero-content">
        <span className="tenant-room-caption"><MapPin size={16} /> KHU TRỌ AN NHIÊN</span>
        <h2>Phòng A101</h2><p>Dịch Vọng, Cầu Giấy, Hà Nội</p>
        <Link to={`${root}/hop-dong`} className="hero-link">Xem thông tin thuê <ArrowRight size={16} /></Link>
      </div>
      <div className="tenant-hero-art" aria-hidden="true"><House strokeWidth={1} /></div>
    </section>
    <div className="tenant-grid">
      <section className="product-panel tenant-overview-card">
        <div className="card-heading"><div><h2>{person === 'quan' ? 'Hóa đơn gần nhất' : 'Chi phí của tôi'}</h2><p>{person === 'quan' && invoice ? `Hạn thanh toán ${formatDate(invoice.due)}` : 'Điện nước theo Ngày Người'}</p></div><span className="icon-tile tone-violet"><Receipt size={20} /></span></div>
        <strong>{person === 'quan' && invoice ? money(invoiceBalance(invoice)) : money(shareFor(person))}</strong>
        {person === 'quan' && invoice && <Status>{invoiceStatus(invoice)}</Status>}
        <Link to={`${root}/hoa-don`} className="quiet-link">Xem chi tiết <ArrowRight size={16} /></Link>
      </section>
      <section className="product-panel tenant-overview-card">
        <div className="card-heading"><div><h2>Yêu cầu đang mở</h2><p>Bảo trì và đối chiếu chứng từ</p></div><span className="icon-tile tone-blue"><Wrench size={20} /></span></div>
        <strong>{requests.length} yêu cầu</strong>
        <Link to={`${root}/bao-tri`} className="quiet-link">Theo dõi yêu cầu <ArrowRight size={16} /></Link>
      </section>
    </div>
    <section className="product-panel">
      <div className="panel-head"><h2>Thao tác nhanh</h2></div>
      <div className="tenant-quick">
        {quickActions.map(([path, label, Icon, tone]) => <Link to={`${root}/${path}`} key={path}><span className={`icon-tile tone-${tone}`}><Icon size={19} /></span>{label}<ArrowRight size={16} /></Link>)}
      </div>
    </section>
  </div>;
}

function Contract({ person }: { person: PersonId }) {
  const { demo, change } = useDemo();
  const [confirm, setConfirm] = useState(false);
  const assets = demo.modules.assets ?? [
    { id: 'TS-01', name: 'Điều hòa', room: 'A101', quantity: '1', condition: 'Hoạt động tốt' },
    { id: 'TS-02', name: 'Giường và nệm', room: 'A101', quantity: '2', condition: 'Hoạt động tốt' },
  ];
  return <div className="workspace-page">
    <Heading title="Hợp đồng & bàn giao" description="Thông tin thuê và tài sản được bàn giao cho phòng A101." />
    <div className="tenant-grid">
      <section className="product-panel">
        <div className="panel-head"><h2>Hợp đồng HD-A101</h2><Status>Đang hiệu lực</Status></div>
        <dl className="details-list">
          <div><dt>Khu trọ</dt><dd>An Nhiên · A101</dd></div><div><dt>Thời hạn</dt><dd>15/08/2026 – 14/08/2027</dd></div>
          <div><dt>Vai trò của bạn</dt><dd>{people.find(item => item.id === person)?.role}</dd></div>
          {person === 'quan' && <><div><dt>Tiền thuê</dt><dd>{money(3000000)} / tháng</dd></div><div><dt>Cọc đã nhận</dt><dd>{money(3000000)}</dd></div></>}
        </dl>
      </section>
      <section className="product-panel">
        <div className="panel-head"><h2>Thành viên đang ở</h2><Users size={20} /></div>
        <div className="record-list">{people.map(item => <div className="record-row" key={item.id}><span className="icon-tile tone-violet">{item.initials}</span><div><strong>{item.name}</strong><p>{item.role}</p></div>{item.id === person && <span>Bạn</span>}</div>)}</div>
      </section>
    </div>
    <section className="product-panel">
      <div className="panel-head"><div><h2>Biên bản nhận phòng</h2><p>15/08/2026</p></div>
        {!(demo.modules.handoverAck ?? []).some(record => record.id === person) ? <button type="button" className="ui-button" onClick={() => setConfirm(true)}>Xác nhận đã đối chiếu</button> : <Status>Đã xác nhận</Status>}
      </div>
      <Table columns={['Tài sản', 'Số lượng', 'Tình trạng khi nhận']} rows={assets.filter(asset => asset.room === 'A101').map(asset => ({ id: asset.id, cells: [asset.name, asset.quantity, asset.condition] }))} />
    </section>
    {confirm && <FormDialog title="Xác nhận đã đối chiếu" intro="Ghi nhận việc bạn đã xem danh sách tài sản trong biên bản mẫu." fields={[]} submit="Xác nhận" close={() => setConfirm(false)} save={() => {
      changeHandover(person);
    }} />}
  </div>;

  function changeHandover(id: PersonId) {
    change(previous => ({ ...previous, modules: { ...previous.modules, handoverAck: [...(previous.modules.handoverAck ?? []), { id }] } }));
  }
}

function Maintenance({ person }: { person: PersonId }) {
  const { demo, change } = useDemo();
  const [newType, setNewType] = useState<ServiceRequest['type']>();
  const [active, setActive] = useState<ServiceRequest>();
  const requests = demo.requests.filter(request => request.person === person);
  const fields: Field[] = [
    { key: 'title', label: 'Tiêu đề', multiline: true },
    ...(newType === 'Tranh chấp' ? [{ key: 'reference', label: 'Chứng từ liên quan', type: 'select', options: [
      'HD-A101', 'BB-A101', ...(person === 'quan' ? demo.invoices.filter(invoice => invoice.roomId === tenantRoomId && invoice.status === 'Đã phát hành').map(invoice => invoice.id) : []),
    ], multiline: true } as const] : []),
    { key: 'description', label: 'Mô tả', type: 'textarea' },
  ];
  return <div className="workspace-page">
    <Heading title="Bảo trì & tranh chấp" description="Gửi vấn đề của phòng và theo dõi phản hồi từ chủ trọ."
      action={<div className="record-actions"><button className="ui-button" onClick={() => setNewType('Tranh chấp')}>Gửi tranh chấp</button><button className="ui-button primary" onClick={() => setNewType('Báo hỏng')}><Plus size={17} /> Báo hỏng</button></div>} />
    <section className="product-panel"><div className="panel-head"><h2>Yêu cầu của tôi</h2></div>
      <Table columns={['Yêu cầu', 'Ngày gửi', 'Loại', 'Trạng thái', 'Thao tác']} rows={requests.map(request => ({
        id: request.id, cells: [request.title, formatDate(request.created), request.type, <Status>{request.status}</Status>, <button className="text-button" onClick={() => setActive(request)}>Chi tiết</button>],
      }))} empty="Bạn chưa gửi yêu cầu nào." />
    </section>
    {active && <Details title={active.title} close={() => setActive(undefined)} data={[
      ['Mã yêu cầu', active.id], ['Trạng thái', <Status>{active.status}</Status>], ['Mô tả', active.description],
      ...(active.reference ? [['Chứng từ', active.reference] as [string, string]] : []), ['Phản hồi', active.response || 'Đang chờ chủ trọ phản hồi'],
    ]} />}
    {newType && <FormDialog title={newType === 'Báo hỏng' ? 'Gửi báo hỏng' : 'Gửi tranh chấp'} fields={fields} submit="Gửi yêu cầu" close={() => setNewType(undefined)} save={values => {
      const record: ServiceRequest = { id: sampleId(newType === 'Báo hỏng' ? 'BR' : 'TC'), person, room: 'A101', type: newType, title: values.title, description: values.description, reference: values.reference, created: today(), status: 'Đã gửi' };
      change(previous => ({ ...previous, requests: [record, ...previous.requests] }));
    }} />}
  </div>;
}

const samplePeriod = '2026-11';
const periodStart = `${samplePeriod}-01`;
const shareAmount = 630000;

function shareFor(person: PersonId) {
  return { quan: 195000, mai: 210000, an: 225000 }[person];
}

function Sharing({ person }: { person: PersonId }) {
  const { demo, change } = useDemo();
  const [form, setForm] = useState(false);
  const [preview, setPreview] = useState(false);
  const entries = demo.absences.filter(absence => absence.person === person);
  const counts = people.map(member => {
    const absent = Array.from({ length: 30 }, (_, i) => `${samplePeriod}-${String(i + 1).padStart(2, '0')}`).filter(day =>
      demo.absences.some(absence => absence.person === member.id && absence.status === 'Đã xác nhận' && day >= absence.start && day <= absence.end));
    return { id: member.id, name: member.name, days: 30 - absent.length };
  });
  const days = counts.reduce((sum, member) => sum + member.days, 0);
  const allocations = counts.map(member => ({ ...member, amount: days ? Math.floor(shareAmount * member.days / days) : 0, remainder: days ? (shareAmount * member.days) % days : 0 }));
  const remainder = days ? shareAmount - allocations.reduce((sum, member) => sum + member.amount, 0) : 0;
  const roundingOrder = [...allocations].sort((a, b) => b.remainder - a.remainder);
  roundingOrder.slice(0, remainder).forEach(member => { member.amount += 1; });

  return <div className="workspace-page">
    <Heading title="Ngày Người & lịch vắng" description="Xem phần chi phí điện nước và gửi lịch vắng của bạn."
      action={<button className="ui-button primary" onClick={() => setForm(true)}><Plus size={17} /> Khai lịch vắng</button>} />
    <section className="product-panel">
      <div className="panel-head"><div><h2>Phân bổ điện nước tháng 11/2026</h2><p>{person === 'quan' ? `${money(shareAmount)} · Phòng A101` : 'Phần chi phí của bạn · Phòng A101'}</p></div><Status>Đã ghi nhận</Status></div>
      <Table columns={['Thành viên', 'Ngày ở', 'Phần đóng']} rows={people.filter(member => person === 'quan' || member.id === person).map(member => ({
        id: member.id, cells: [member.name, `${{ quan: 26, mai: 28, an: 30 }[member.id]} ngày`, money(shareFor(member.id))],
      }))} />
      {person === 'quan' && <div className="panel-actions"><button className="ui-button" onClick={() => setPreview(true)}>Xem tính thử theo lịch đã xác nhận</button></div>}
    </section>
    <section className="product-panel"><div className="panel-head"><h2>Lịch vắng của tôi</h2></div>
      <Table columns={['Từ ngày', 'Đến ngày', 'Ghi chú', 'Trạng thái']} rows={entries.map(entry => ({ id: entry.id, cells: [formatDate(entry.start), formatDate(entry.end), entry.note || '—', <Status>{entry.status}</Status>] }))} empty="Bạn chưa khai lịch vắng." />
    </section>
    {person === 'quan' && <section className="product-panel"><div className="panel-head"><div><h2>Lịch vắng chờ xác nhận</h2><p>Tài khoản đại diện được giao xác nhận cho thành viên khác trong bản demo.</p></div></div>
      <Table columns={['Thành viên', 'Từ ngày', 'Đến ngày', 'Thao tác']} rows={demo.absences.filter(entry => entry.person !== person && entry.status === 'Chờ xác nhận').map(entry => ({
        id: entry.id, cells: [personName(entry.person), formatDate(entry.start), formatDate(entry.end), <div className="record-actions">{(['Đã xác nhận', 'Cần điều chỉnh'] as const).map((status, index) => <button className="text-button" key={status} onClick={() => {
          change(previous => ({ ...previous, absences: previous.absences.map(absence => absence.id === entry.id ? { ...absence, status } : absence) }));
        }}>{index ? 'Yêu cầu sửa' : 'Xác nhận'}</button>)}</div>],
      }))} empty="Không có lịch vắng chờ xác nhận." />
    </section>}
    {form && <FormDialog title="Khai lịch vắng" fields={[
      { key: 'start', label: 'Từ ngày', type: 'date', min: '2026-08-15', max: '2027-08-14' },
      { key: 'end', label: 'Đến ngày', type: 'date', min: '2026-08-15', max: '2027-08-14' },
      { key: 'note', label: 'Ghi chú riêng', type: 'textarea', required: false },
    ]} close={() => setForm(false)} submit="Gửi xác nhận" save={values => {
      if (values.end < values.start) return 'Ngày kết thúc phải từ ngày bắt đầu trở đi.';
      const entry = { id: sampleId('LV'), person, start: values.start, end: values.end, note: values.note, status: 'Chờ xác nhận' as const };
      change(previous => ({ ...previous, absences: [entry, ...previous.absences] }));
    }} />}
    {preview && <Details title="Tính thử phân bổ tháng 11/2026" close={() => setPreview(false)} data={[
      ['Khoảng tính', `${formatDate(periodStart)} – 30/11/2026`], ['Tổng Ngày Người', days],
      ...allocations.map(member => [member.name, days ? `${member.days} ngày · ${money(member.amount)}` : 'Chờ xử lý'] as [string, string]),
    ]} />}
  </div>;
}

function PersonalCosts({ person }: { person: PersonId }) {
  return <div className="workspace-page"><Heading title="Chi phí của tôi" description="Khoản điện nước được phân bổ cho bạn theo Ngày Người." />
    <div className="product-panel panel-head"><div><h2>Tháng 11/2026</h2><p>{personName(person)} · Phòng A101</p></div><strong>{money(shareFor(person))}</strong></div>
    <Link to={`${root}/ngay-nguoi`} className="quiet-link">Xem cách phân bổ <ArrowRight size={16} /></Link>
  </div>;
}

function Fund({ person }: { person: PersonId }) {
  const { demo, change } = useDemo();
  const [form, setForm] = useState(false);
  const total = 480000;
  const held = demo.purchases.filter(purchase => purchase.approvals.length >= 2).reduce((sum, purchase) => sum + purchase.amount, 0);
  const available = total - held;
  return <div className="workspace-page">
    <Heading title="Quỹ phòng" description="Theo dõi tiền quỹ chung và xác nhận đề nghị mua của thành viên phòng A101."
      action={<button className="ui-button primary" onClick={() => setForm(true)}><Plus size={17} /> Đề nghị mua chung</button>} />
    <div className="summary-grid">
      <div className="product-panel summary-tile"><span>Số dư quỹ</span><strong>{money(total)}</strong></div>
      <div className="product-panel summary-tile"><span>Đang giữ chỗ</span><strong>{money(held)}</strong></div>
      <div className="product-panel summary-tile"><span>Có thể sử dụng</span><strong>{money(available)}</strong></div>
    </div>
    <section className="product-panel"><div className="panel-head"><div><h2>Đề nghị mua chung</h2><p>Mỗi khoản cần hai thành viên khác xác nhận và đủ tiền quỹ để giữ chỗ.</p></div></div>
      <Table columns={['Nội dung', 'Người đề nghị', 'Chứng từ', 'Số tiền', 'Xác nhận', 'Thao tác']} rows={demo.purchases.map(purchase => {
        const canApprove = purchase.person !== person && !purchase.approvals.includes(person) && purchase.approvals.length < 2;
        const short = purchase.approvals.length === 1 && purchase.amount > available;
        return { id: purchase.id, cells: [purchase.title, personName(purchase.person), purchase.reference, money(purchase.amount), `${purchase.approvals.length}/2`, purchase.approvals.length >= 2 ? <Status>Đủ xác nhận</Status> : canApprove && !short ?
          <button className="text-button" onClick={() => change(previous => {
            const currentHeld = previous.purchases.filter(item => item.approvals.length >= 2).reduce((sum, item) => sum + item.amount, 0);
            return { ...previous, purchases: previous.purchases.map(item => item.id === purchase.id && !item.approvals.includes(person) && item.approvals.length < 2 && (item.approvals.length === 0 || item.amount <= total - currentHeld) ? { ...item, approvals: [...item.approvals, person] } : item) };
          })}>Xác nhận</button> : <Status>{short ? 'Chờ đủ quỹ' : 'Chờ xác nhận'}</Status>] };
      })} />
    </section>
    <section className="product-panel"><div className="panel-head"><div><h2>Sổ quỹ</h2><p>Các khoản thực thu và thực chi trong kỳ mẫu.</p></div></div>
      <Table columns={['Ngày', 'Nội dung', 'Biến động']} rows={[
        { id: 'fund-1', cells: ['01/11/2026', 'Đóng quỹ tháng 11 · 3 thành viên', `+${money(600000)}`] },
        { id: 'fund-2', cells: ['05/11/2026', 'Mua vật tư dọn vệ sinh', `−${money(120000)}`] },
      ]} />
    </section>
    {form && <FormDialog title="Đề nghị mua chung" fields={[
      { key: 'title', label: 'Nội dung', multiline: true }, { key: 'amount', label: 'Số tiền (₫)', type: 'number', min: 1 }, { key: 'reference', label: 'Mã chứng từ' },
    ]} close={() => setForm(false)} submit="Gửi đề nghị" save={values => {
      if (demo.purchases.some(purchase => purchase.reference.toLowerCase() === values.reference.toLowerCase())) return 'Mã chứng từ đã có trong quỹ.';
      const purchase = { id: sampleId('MC'), person, title: values.title, amount: Number(values.amount), reference: values.reference, approvals: [] };
      change(previous => ({ ...previous, purchases: [purchase, ...previous.purchases] }));
    }} />}
  </div>;
}

function ResidencePage({ person }: { person: PersonId }) {
  const { demo, change } = useDemo();
  const [editing, edit] = useState<string>();
  const [viewing, view] = useState<string>();
  const record = demo.residences.find(entry => entry.id === viewing && entry.person === person);
  const draft = demo.residences.find(entry => entry.id === editing && entry.person === person);
  const entries = demo.residences.filter(entry => entry.person === person);
  return <div className="workspace-page">
    <Heading title="Hồ sơ cư trú" description="Lưu nháp và theo dõi kiểm tra nội bộ đối với hồ sơ của bạn."
      action={<button className="ui-button primary" onClick={() => edit('new')}><Plus size={17} /> Tạo hồ sơ</button>} />
    <section className="product-panel"><div className="panel-head"><h2>Hồ sơ của tôi</h2><FolderOpen size={19} /></div>
      <Table columns={['Mã hồ sơ', 'Loại', 'Từ ngày', 'Đến ngày', 'Trạng thái', 'Thao tác']} rows={entries.map(entry => ({
        id: entry.id, cells: [entry.id, entry.type, formatDate(entry.start), formatDate(entry.end), <Status>{entry.status}</Status>, <button className="text-button" onClick={() => view(entry.id)}>Chi tiết</button>],
      }))} empty="Bạn chưa tạo hồ sơ cư trú." />
    </section>
    {record && !editing && <Details title={`${record.type} · ${record.id}`} close={() => view(undefined)} data={[
      ['Người khai', personName(person)], ['Thời gian', `${formatDate(record.start)} – ${formatDate(record.end)}`], ['Trạng thái', <Status>{record.status}</Status>],
      ['Ghi chú', record.note || '—'], ['Nhận xét kiểm tra', record.review || '—'],
    ]} actions={['Nháp', 'Cần bổ sung'].includes(record.status) ? <>
      <button className="ui-button" onClick={() => edit(record.id)}>Chỉnh sửa</button>
      <button className="ui-button primary" onClick={() => change(previous => ({ ...previous, residences: previous.residences.map(entry => entry.id === record.id ? { ...entry, status: 'Chờ kiểm tra' } : entry) }))}>Gửi kiểm tra</button>
    </> : record.status === 'Đã kiểm tra' ? <Link className="ui-button" to={`${root}/cu-tru/${record.id}/in`}>Xem bản in mẫu</Link> : undefined} />}
    {editing && <FormDialog title={draft ? 'Chỉnh sửa hồ sơ' : 'Tạo hồ sơ cư trú'} intro="Dùng thông tin giả để thử mẫu hồ sơ nội bộ." initial={draft} fields={[
      { key: 'type', label: 'Loại hồ sơ', type: 'select', options: ['Tạm trú', 'Tạm vắng'], multiline: true },
      { key: 'start', label: 'Từ ngày', type: 'date' }, { key: 'end', label: 'Đến ngày', type: 'date' },
      { key: 'note', label: 'Thông tin bổ sung', type: 'textarea', required: false },
    ]} close={() => edit(undefined)} submit="Lưu nháp" save={values => {
      if (values.end < values.start) return 'Ngày kết thúc phải từ ngày bắt đầu trở đi.';
      const next: Residence = { id: draft?.id ?? sampleId('CT'), person, type: values.type as Residence['type'], start: values.start, end: values.end, note: values.note, status: 'Nháp', review: draft?.review };
      change(previous => ({ ...previous, residences: draft ? previous.residences.map(entry => entry.id === draft.id ? next : entry) : [next, ...previous.residences] }));
      view(next.id);
    }} />}
  </div>;
}

function ResidencePrint({ person }: { person: PersonId }) {
  const { id } = useParams();
  const { demo } = useDemo();
  const record = demo.residences.find(entry => entry.id === id && entry.person === person && entry.status === 'Đã kiểm tra');
  if (!record) return <div className="product-panel"><Blank title="Bản in mẫu chưa sẵn sàng." /></div>;
  return <div className="workspace-page">
    <div className="print-control"><Link className="quiet-link" to={`${root}/cu-tru`}>Quay về hồ sơ</Link><button className="ui-button primary" onClick={() => window.print()}>In hoặc lưu PDF</button></div>
    <article className="product-panel residence-print">
      <p>BOARDINGHUB · BẢN MINH HỌA NỘI BỘ</p><h1>Thông tin {record.type.toLowerCase()}</h1>
      <dl className="details-list">
        <div><dt>Mã hồ sơ</dt><dd>{record.id}</dd></div><div><dt>Người khai</dt><dd>{personName(person)}</dd></div>
        <div><dt>Phòng</dt><dd>A101 · Khu trọ An Nhiên</dd></div><div><dt>Thời gian</dt><dd>{formatDate(record.start)} – {formatDate(record.end)}</dd></div>
        <div><dt>Thông tin bổ sung</dt><dd>{record.note || '—'}</dd></div><div><dt>Kết quả kiểm tra nội bộ</dt><dd>{record.review || record.status}</dd></div>
      </dl>
    </article>
  </div>;
}

function CheckoutPage({ person }: { person: PersonId }) {
  const { demo, change } = useDemo();
  const [form, setForm] = useState(false);
  const entries = demo.checkouts.filter(entry => entry.person === person);
  return <div className="workspace-page">
    <Heading title="Trả phòng" description={person === 'quan' ? 'Thông báo ngày dự kiến trả phòng và đối chiếu quyết toán.' : 'Theo dõi thông báo trả phòng bạn đã gửi.'}
      action={<button className="ui-button primary" onClick={() => setForm(true)}><Plus size={17} /> Báo ngày trả phòng</button>} />
    <section className="product-panel"><div className="panel-head"><h2>Yêu cầu của tôi</h2><ClipboardList size={19} /></div>
      {entries.length ? <div className="record-list">{entries.map(entry => <article className="record-row" key={entry.id}>
        <span className="icon-tile tone-violet"><CalendarDays size={18} /></span>
        <div><strong>{formatDate(entry.date)} · {entry.id}</strong><p>{entry.note}</p>{entry.assessment && <p>{entry.assessment}</p>}
          {person === 'quan' && entry.status === 'Sẵn sàng đối chiếu' && <p>Nợ cuối kỳ {money(entry.debt ?? 0)} · Khấu trừ đề nghị {money(entry.deduction ?? 0)} · Cọc mẫu {money(3000000)}</p>}
        </div><Status>{entry.status}</Status></article>)}</div> : <Blank title="Chưa có thông báo trả phòng." />}
    </section>
    {form && <FormDialog title="Thông báo trả phòng" fields={[
      { key: 'date', label: 'Ngày dự kiến trả', type: 'date', min: today(), multiline: true }, { key: 'note', label: 'Ghi chú bàn giao', type: 'textarea', required: false },
    ]} close={() => setForm(false)} submit="Gửi thông báo" save={values => {
      const entry: Checkout = { id: sampleId('TP'), person, date: values.date, note: values.note, status: 'Đã gửi' };
      change(previous => ({ ...previous, checkouts: [entry, ...previous.checkouts] }));
    }} />}
  </div>;
}
