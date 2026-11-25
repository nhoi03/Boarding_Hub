import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  districts, formatAppointment, formatDate, formatPeriod, invoiceBalance, invoicePaid, invoiceTotal,
  matchText, money, personName, roomPhotos, roomTypes, sampleId, tenantRoomId, useDemo,
} from './demo';
import type { Inquiry, Listing } from './demo';
import { Blank, Details, FormDialog, Heading, Status, Table } from './ui';
import type { Field } from './ui';
import { initialExpenses } from './OwnerRecords';

export function OwnerMarketplace() {
  const { demo, change } = useDemo();
  const [tab, setTab] = useState<'listings' | 'inquiries'>('listings');
  const [select, setSelect] = useState<string>();
  const [editing, edit] = useState(false);
  const [decision, setDecision] = useState<Inquiry['status']>();
  const listing = demo.listings.find(entry => entry.id === select);
  const inquiry = demo.inquiries.find(entry => entry.id === select);
  const listingAvailable = demo.rooms.some(room => room.id === listing?.roomId && room.status === 'AVAILABLE');
  const uniqueRooms = demo.rooms.filter(room => room.status === 'AVAILABLE' || room.id === listing?.roomId);
  const listingFields: Field[] = [
    { key: 'title', label: 'Tiêu đề tin', multiline: true },
    { key: 'roomId', label: 'Phòng', type: 'select', options: uniqueRooms.map(room => ({ value: String(room.id), label: `${room.roomNumber} · ${demo.properties.find(property => property.id === room.propertyId)?.name ?? ''}` })) },
    { key: 'district', label: 'Khu vực', type: 'select', options: districts },
    { key: 'address', label: 'Địa chỉ công khai', multiline: true },
    { key: 'type', label: 'Loại phòng', type: 'select', options: roomTypes },
    { key: 'price', label: 'Giá thuê mỗi tháng (₫)', type: 'number', min: 1 },
    { key: 'area', label: 'Diện tích (m²)', type: 'number', min: 1 },
    { key: 'photo', label: 'Ảnh minh họa', type: 'select', options: [{ value: 'studio', label: 'Studio ban công' }, { value: 'loft', label: 'Phòng gác lửng' }, { value: 'single', label: 'Phòng đơn' }] },
    { key: 'amenities', label: 'Tiện ích, cách nhau bằng dấu phẩy', multiline: true, required: false },
    { key: 'description', label: 'Mô tả công khai', type: 'textarea' },
  ];

  function saveListing(values: Record<string, string>) {
    const room = demo.rooms.find(entry => entry.id === Number(values.roomId));
    if (!room) return 'Chọn một phòng hợp lệ.';
    if (demo.listings.some(entry => entry.roomId === room.id && entry.id !== listing?.id && entry.status !== 'Đã đóng')) return 'Phòng đã có tin đang hoạt động.';
    const next: Listing = {
      id: listing?.id ?? sampleId('TIN').toLowerCase(), roomId: room.id, capacity: room.capacity,
      title: values.title, district: values.district, address: values.address, type: values.type,
      price: Number(values.price), area: Number(values.area), photo: values.photo as Listing['photo'],
      amenities: [...new Set(values.amenities.split(',').map(value => value.trim()).filter(Boolean))], description: values.description, status: 'Nháp',
    };
    change(previous => ({ ...previous, listings: listing ? previous.listings.map(entry => entry.id === listing.id ? next : entry) : [...previous.listings, next] }));
    setSelect(next.id);
  }

  function changeListingStatus(status: Listing['status']) {
    if (!listing) return;
    change(previous => ({ ...previous, listings: previous.listings.map(entry => entry.id === listing.id ? { ...entry, status } : entry) }));
  }

  return <div className="workspace-page">
    <Heading title="Tin phòng & lịch xem" description="Chuẩn bị tin cho thuê và phản hồi yêu cầu từ khách tìm phòng."
      action={<Link className="ui-button" to="/">Mở trang tìm phòng <ArrowUpRight size={16} /></Link>} />
    <div className="workspace-tabs" aria-label="Quản lý tin và lịch xem">
      <button aria-pressed={tab === 'listings'} onClick={() => { setTab('listings'); setSelect(undefined); }}>Tin phòng</button>
      <button aria-pressed={tab === 'inquiries'} onClick={() => { setTab('inquiries'); setSelect(undefined); }}>Yêu cầu & lịch xem <span>{demo.inquiries.filter(entry => entry.status === 'Mới').length}</span></button>
    </div>
    {tab === 'listings' ? <section className="product-panel">
      <div className="panel-head"><div><h2>Tin của khu trọ</h2><p>Tin đã công bố xuất hiện ở trang tìm phòng.</p></div><button className="ui-button primary" onClick={() => { setSelect(undefined); edit(true); }}><Plus size={17} /> Tạo tin phòng</button></div>
      <Table columns={['Tin phòng', 'Khu vực', 'Giá thuê', 'Trạng thái', 'Thao tác']} rows={demo.listings.map(entry => ({
        id: entry.id, cells: [<span className="table-name"><img className="table-thumbnail" src={roomPhotos[entry.photo]} alt="" />{entry.title}</span>, entry.district, money(entry.price), <Status>{entry.status}</Status>,
          <button className="text-button" onClick={() => setSelect(entry.id)}>Chi tiết</button>],
      }))} />
    </section> : <section className="product-panel">
      <div className="panel-head"><div><h2>Yêu cầu từ khách</h2><p>Giờ hẹn hiển thị theo giờ Việt Nam.</p></div><CalendarDays size={19} /></div>
      <Table columns={['Khách', 'Tin phòng', 'Ngày giờ đề nghị', 'Trạng thái', 'Thao tác']} rows={demo.inquiries.map(entry => ({
        id: entry.id, cells: [entry.name, entry.listingTitle, formatAppointment(entry.appointment), <Status>{entry.status}</Status>, <button className="text-button" onClick={() => setSelect(entry.id)}>Phản hồi</button>],
      }))} empty="Chưa có yêu cầu liên hệ hoặc hẹn xem." />
    </section>}
    {listing && !editing && <Details title={listing.title} close={() => setSelect(undefined)}
      data={[[ 'Trạng thái', <Status>{listing.status}</Status> ], ['Địa chỉ', listing.address], ['Mức giá', money(listing.price)], ['Phòng', `${listing.type} · ${listing.area} m² · ${listing.capacity} người`], ['Mô tả', listing.description]]}
      actions={<>
        {listing.status === 'Đang công bố' && <>{listingAvailable && <Link to={`/tim-phong/${listing.id}`} className="ui-button">Mở tin <ArrowUpRight size={15} /></Link>}<button className="ui-button" onClick={() => changeListingStatus('Đã đóng')}>Đóng tin</button></>}
        {(listing.status === 'Nháp' || listing.status === 'Đã đóng') && <button className="ui-button" onClick={() => edit(true)}>Chỉnh sửa</button>}
        {listing.status === 'Nháp' && <button className="ui-button primary" onClick={() => changeListingStatus('Chờ kiểm duyệt')}>Gửi kiểm duyệt</button>}
        {listing.status === 'Chờ kiểm duyệt' && <button className="ui-button" onClick={() => changeListingStatus('Nháp')}>Thu hồi về nháp</button>}
      </>} />}
    {editing && <FormDialog title={listing ? 'Chỉnh sửa tin phòng' : 'Tạo tin phòng'} initial={listing ? { ...listing, amenities: listing.amenities.join(', ') } : undefined} fields={listingFields} submit="Lưu nháp" close={() => edit(false)} save={saveListing} />}
    {inquiry && !decision && <Details title={`Yêu cầu ${inquiry.id}`} close={() => setSelect(undefined)} data={[
      ['Tin phòng', inquiry.listingTitle], ['Khách', inquiry.name], ['Điện thoại', inquiry.phone], ['Ngày giờ', formatAppointment(inquiry.appointment)],
      ['Lời nhắn', inquiry.note || '—'], ['Trạng thái', <Status>{inquiry.status}</Status>], ['Phản hồi đã lưu', inquiry.response || '—'],
    ]} actions={inquiry.status !== 'Đã từ chối' && <>
      <button className="ui-button" onClick={() => setDecision('Đã từ chối')}>Từ chối</button>
      <button className="ui-button" onClick={() => setDecision('Đề nghị đổi lịch')}>{inquiry.appointment ? 'Đổi lịch' : 'Đề nghị lịch'}</button>
      {inquiry.appointment && inquiry.status !== 'Đã xác nhận' && <button className="ui-button primary" onClick={() => setDecision('Đã xác nhận')}>Xác nhận lịch</button>}
      {!inquiry.appointment && <button className="ui-button primary" onClick={() => setDecision('Đã phản hồi')}>Trả lời khách</button>}
    </>} />}
    {inquiry && decision && <FormDialog title={decision === 'Đã xác nhận' ? 'Xác nhận lịch xem' : decision === 'Đã từ chối' ? 'Từ chối yêu cầu' : decision === 'Đã phản hồi' ? 'Trả lời khách' : 'Đề nghị ngày giờ khác'}
      intro={`${inquiry.name} · ${inquiry.listingTitle}`}
      fields={[
        ...(decision === 'Đề nghị đổi lịch' ? [{ key: 'appointment', label: 'Ngày giờ mới', type: 'datetime-local', multiline: true, hint: 'Giờ Việt Nam (GMT+7)' } as const] : []),
        { key: 'response', label: 'Lời nhắn cho khách', type: 'textarea', required: decision === 'Đã phản hồi' },
      ]}
      submit="Lưu phản hồi" close={() => setDecision(undefined)} save={values => {
        const appointment = values.appointment ?? inquiry.appointment;
        if ((decision === 'Đã xác nhận' || decision === 'Đề nghị đổi lịch') && Date.parse(`${appointment}+07:00`) <= Date.now()) return 'Ngày giờ đã qua. Hãy đề nghị một lịch mới.';
        change(previous => ({ ...previous, inquiries: previous.inquiries.map(entry => entry.id === inquiry.id ? { ...entry, status: decision, appointment, response: values.response } : entry) }));
      }} />}
  </div>;
}

export function OwnerService() {
  const { demo, change } = useDemo();
  const [id, setId] = useState<string>();
  const [editing, edit] = useState(false);
  const [filter, setFilter] = useState('');
  const active = demo.requests.find(entry => entry.id === id);
  const available = demo.requests.filter(entry => !filter || entry.type === filter);
  return <div className="workspace-page">
    <Heading title="Bảo trì & tranh chấp" description="Tiếp nhận sự cố, cập nhật tình trạng và gửi phản hồi cho người thuê." />
    <section className="product-panel">
      <div className="panel-head"><div><h2>Yêu cầu từ người thuê</h2><p>{available.length} yêu cầu</p></div>
        <select className="ui-input" aria-label="Lọc loại yêu cầu" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Tất cả yêu cầu</option><option>Báo hỏng</option><option>Tranh chấp</option></select></div>
      <Table columns={['Yêu cầu', 'Phòng', 'Người gửi', 'Ngày gửi', 'Trạng thái', 'Thao tác']} rows={available.map(entry => ({
        id: entry.id, cells: [entry.title, entry.room, personName(entry.person), formatDate(entry.created), <Status>{entry.status}</Status>, <button className="text-button" onClick={() => setId(entry.id)}>Chi tiết</button>],
      }))} empty="Chưa có yêu cầu thuộc loại này." />
    </section>
    {active && !editing && <Details title={active.title} close={() => setId(undefined)}
      data={[[ 'Mã yêu cầu', active.id ], ['Loại', active.type], ['Người gửi', personName(active.person)], ['Mô tả', active.description], ['Chứng từ liên quan', active.reference || '—'], ['Trạng thái', <Status>{active.status}</Status>], ['Phản hồi', active.response || '—']]}
      actions={<button className="ui-button primary" onClick={() => edit(true)}>Cập nhật xử lý</button>} />}
    {active && editing && <FormDialog title="Cập nhật xử lý" fields={[
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['Đã gửi', 'Đang xử lý', 'Đã hoàn thành'], multiline: true },
      { key: 'response', label: 'Phản hồi cho người thuê', type: 'textarea' },
    ]} initial={{ status: active.status, response: active.response ?? '' }} close={() => edit(false)} save={values => {
      const status = values.status as typeof active.status;
      change(previous => ({ ...previous, requests: previous.requests.map(entry => entry.id === active.id ? { ...entry, status, response: values.response } : entry) }));
    }} />}
  </div>;
}

export function OwnerResidence() {
  const { demo, change } = useDemo();
  const [id, setId] = useState<string>();
  const [editing, edit] = useState(false);
  const records = demo.residences.filter(entry => entry.status !== 'Nháp');
  const active = records.find(entry => entry.id === id);
  return <div className="workspace-page">
    <Heading title="Hồ sơ cư trú" description="Kiểm tra nội bộ những hồ sơ người thuê đã gửi." />
    <section className="product-panel"><div className="panel-head"><div><h2>Hồ sơ đã gửi</h2><p>{records.filter(entry => entry.status === 'Chờ kiểm tra').length} hồ sơ chờ kiểm tra</p></div></div>
      <Table columns={['Mã hồ sơ', 'Người khai', 'Loại', 'Khoảng thời gian', 'Trạng thái', 'Thao tác']} rows={records.map(entry => ({
        id: entry.id, cells: [entry.id, personName(entry.person), entry.type, `${formatDate(entry.start)} – ${formatDate(entry.end)}`, <Status>{entry.status}</Status>, <button className="text-button" onClick={() => setId(entry.id)}>Chi tiết</button>],
      }))} empty="Chưa có hồ sơ người thuê gửi kiểm tra." />
    </section>
    {active && !editing && <Details title={`Hồ sơ ${active.id}`} close={() => setId(undefined)} data={[
      ['Người khai', personName(active.person)], ['Loại hồ sơ', active.type], ['Khoảng thời gian', `${formatDate(active.start)} – ${formatDate(active.end)}`],
      ['Ghi chú', active.note || '—'], ['Trạng thái', <Status>{active.status}</Status>], ['Nhận xét', active.review || '—'],
    ]} actions={active.status === 'Chờ kiểm tra' && <button className="ui-button primary" onClick={() => edit(true)}>Nhận xét hồ sơ</button>} />}
    {active && editing && <FormDialog title="Nhận xét hồ sơ cư trú" fields={[
      { key: 'status', label: 'Kết quả kiểm tra nội bộ', type: 'select', options: ['Đã kiểm tra', 'Cần bổ sung'], multiline: true },
      { key: 'review', label: 'Nhận xét', type: 'textarea' },
    ]} close={() => edit(false)} save={values => {
      const status = values.status as typeof active.status;
      change(previous => ({ ...previous, residences: previous.residences.map(entry => entry.id === active.id ? { ...entry, status, review: values.review } : entry) }));
    }} />}
  </div>;
}

export function OwnerCheckout() {
  const { demo, change } = useDemo();
  const [id, setId] = useState<string>();
  const [editing, edit] = useState(false);
  const active = demo.checkouts.find(entry => entry.id === id);
  const balance = demo.invoices.filter(entry => entry.roomId === tenantRoomId && entry.status === 'Đã phát hành').reduce((sum, entry) => sum + invoiceBalance(entry), 0);
  return <div className="workspace-page">
    <Heading title="Trả phòng & quyết toán" description="Kiểm tra thông báo trả phòng và lập bảng đối chiếu nợ, khấu trừ và tiền cọc." />
    <section className="product-panel"><div className="panel-head"><h2>Thông báo trả phòng</h2></div>
      <Table columns={['Yêu cầu', 'Phòng', 'Người gửi', 'Ngày dự kiến', 'Trạng thái', 'Thao tác']} rows={demo.checkouts.map(entry => ({
        id: entry.id, cells: [entry.id, 'A101', personName(entry.person), formatDate(entry.date), <Status>{entry.status}</Status>, <button className="text-button" onClick={() => setId(entry.id)}>Chi tiết</button>],
      }))} empty="Chưa có thông báo trả phòng." />
    </section>
    {active && !editing && <Details title={`Trả phòng ${active.id}`} close={() => setId(undefined)} data={[
      ['Ngày dự kiến', formatDate(active.date)], ['Trạng thái', <Status>{active.status}</Status>], ['Ghi chú người thuê', active.note || '—'],
      ['Cọc mẫu đã nhận', money(3000000)], ['Nợ cuối kỳ đối chiếu', money(active.debt ?? balance)], ['Khấu trừ đề nghị', money(active.deduction ?? 0)],
      ['Biên bản đối chiếu', active.assessment || '—'],
      ...(active.status === 'Sẵn sàng đối chiếu' ? [[(active.debt ?? 0) + (active.deduction ?? 0) <= 3000000 ? 'Hoàn cọc dự kiến' : 'Thu thêm dự kiến', money(Math.abs(3000000 - (active.debt ?? 0) - (active.deduction ?? 0)))] as [string, string]] : []),
    ]} actions={<button className="ui-button primary" onClick={() => edit(true)}>Cập nhật đối chiếu</button>} />}
    {active && editing && <FormDialog title="Cập nhật đối chiếu trả phòng" fields={[
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['Đang kiểm tra', 'Sẵn sàng đối chiếu'], multiline: true },
      { key: 'debt', label: 'Nợ cuối kỳ (₫)', type: 'number', min: 0 },
      { key: 'deduction', label: 'Khấu trừ đề nghị (₫)', type: 'number', min: 0 },
      { key: 'assessment', label: 'Ghi chú chỉ số cuối và bàn giao', type: 'textarea' },
    ]} initial={{ status: active.status === 'Đã gửi' ? 'Đang kiểm tra' : active.status, debt: active.debt ?? balance, deduction: active.deduction ?? 0, assessment: active.assessment ?? '' }}
      close={() => edit(false)} save={values => {
        const status = values.status as typeof active.status;
        change(previous => ({ ...previous, checkouts: previous.checkouts.map(entry => entry.id === active.id ? { ...entry, status, debt: Number(values.debt), deduction: Number(values.deduction), assessment: values.assessment } : entry) }));
      }} />}
  </div>;
}

export function OwnerReports() {
  const { demo } = useDemo();
  const [property, setProperty] = useState('');
  const [period, setPeriod] = useState('2026-11');
  const selected = demo.properties.find(entry => String(entry.id) === property);
  const rooms = demo.rooms.filter(room => !selected || room.propertyId === selected.id);
  const invoices = demo.invoices.filter(entry => rooms.some(room => room.id === entry.roomId) && (!period || entry.period === period) && entry.status === 'Đã phát hành');
  const receipts = demo.invoices.filter(entry => rooms.some(room => room.id === entry.roomId) && entry.status === 'Đã phát hành')
    .flatMap(entry => entry.receipts.filter(receipt => !period || receipt.date.startsWith(period)).map(receipt => ({ ...receipt, room: entry.room, invoiceId: entry.id })));
  const expenses = (demo.modules.expenses ?? initialExpenses).filter(entry => (!selected || entry.property === selected.name) && (!period || entry.date.startsWith(period)));
  const summaries = [
    ['Phải thu theo kỳ', invoices.reduce((sum, entry) => sum + invoiceTotal(entry), 0)],
    ['Thực thu theo ngày nhận', receipts.reduce((sum, entry) => sum + entry.amount, 0)],
    ['Còn phải thu của kỳ', invoices.reduce((sum, entry) => sum + invoiceBalance(entry), 0)],
    ['Chi phí vận hành', expenses.reduce((sum, entry) => sum + Number(entry.amount), 0)],
  ] as const;
  const [query, setQuery] = useState('');
  return <div className="workspace-page">
    <Heading title="Báo cáo" description="Đối chiếu số liệu thu chi theo khu trọ và kỳ." />
    <div className="workspace-report-filters">
      <label>Khu trọ<select className="ui-input" value={property} onChange={event => setProperty(event.target.value)}><option value="">Tất cả khu trọ</option>{demo.properties.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      <label>Kỳ báo cáo<input type="month" className="ui-input" value={period} onChange={event => setPeriod(event.target.value)} /></label>
    </div>
    {invoices.length + receipts.length + expenses.length ? <>
      <div className="summary-grid four">{summaries.map(([label, value]) => <div className="product-panel summary-tile" key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div>
      <section className="product-panel"><div className="panel-head"><h2>Hóa đơn theo kỳ</h2><input className="ui-input" aria-label="Lọc chứng từ báo cáo" placeholder="Lọc theo phòng hoặc mã" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <Table columns={['Mã hóa đơn', 'Phòng', 'Kỳ', 'Phải thu', 'Đã thu', 'Còn lại']} rows={invoices.filter(entry => matchText(`${entry.id} ${entry.room}`, query)).map(entry => ({
          id: entry.id, cells: [entry.id, entry.room, formatPeriod(entry.period), money(invoiceTotal(entry)), money(invoicePaid(entry)), money(invoiceBalance(entry))],
        }))} />
      </section>
      <section className="product-panel"><div className="panel-head"><h2>Phiếu thu theo ngày nhận</h2></div><Table columns={['Phiếu thu', 'Ngày nhận', 'Hóa đơn', 'Phòng', 'Số tiền']} rows={receipts.map(entry => ({
        id: entry.id, cells: [entry.id, formatDate(entry.date), entry.invoiceId, entry.room, money(entry.amount)],
      }))} /></section>
      <section className="product-panel"><div className="panel-head"><h2>Chứng từ chi phí</h2></div><Table columns={['Mã chứng từ', 'Khu trọ', 'Loại chi', 'Ngày', 'Số tiền']} rows={expenses.map(entry => ({
        id: entry.id, cells: [entry.reference, entry.property, entry.type, formatDate(entry.date), money(Number(entry.amount))],
      }))} /></section>
    </> : <section className="product-panel"><Blank title="Chưa có dữ liệu cho khu trọ và kỳ đã chọn." /></section>}
  </div>;
}
