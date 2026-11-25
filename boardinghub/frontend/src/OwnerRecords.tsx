import { useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import { formatDate, matchText, money, sampleId, today, useDemo } from './demo';
import type { ModuleRecord } from './demo';
import { Details, FormDialog, Heading, Status, Table } from './ui';
import type { Field } from './ui';

type Module = {
  title: string; description: string; add: string; prefix: string; fields: Field[];
  columns: string[]; initial?: ModuleRecord[]; dateKeys?: string[]; moneyKeys?: string[];
  validate?: (next: ModuleRecord, records: ModuleRecord[]) => string | void;
};

const room: Field = { key: 'room', label: 'Phòng', type: 'select' };
const property: Field = { key: 'property', label: 'Khu trọ', type: 'select' };
const amount = (key: string, label: string): Field => ({ key, label, type: 'number', min: 0 });
const date = (key: string, label: string): Field => ({ key, label, type: 'date' });
const select = (key: string, label: string, options: string[]): Field => ({ key, label, type: 'select', options });
const note: Field = { key: 'note', label: 'Ghi chú', type: 'textarea', required: false };
const datesInOrder = (record: ModuleRecord) => record.end && record.end < record.start ? 'Ngày kết thúc phải từ ngày bắt đầu trở đi.' : undefined;

const modules: Record<string, Module> = {
  tenants: {
    title: 'Người thuê', description: 'Quản lý người ở, vai trò và thời gian cư trú theo phòng.', add: 'Thêm người thuê', prefix: 'NT',
    fields: [
      { key: 'name', label: 'Họ và tên' }, room, select('role', 'Vai trò', ['Đại diện', 'Ở cùng']),
      date('start', 'Ngày vào'), { ...date('end', 'Ngày ra'), required: false }, select('status', 'Trạng thái', ['Đang ở', 'Đã rời phòng']), note,
    ],
    columns: ['name', 'room', 'role', 'start', 'status'], dateKeys: ['start', 'end'],
    initial: [
      { id: 'NT-01', name: 'Trần Minh Quân', room: 'A101', role: 'Đại diện', start: '2026-08-15', status: 'Đang ở' },
      { id: 'NT-02', name: 'Lê Thị Mai', room: 'A101', role: 'Ở cùng', start: '2026-08-15', status: 'Đang ở' },
      { id: 'NT-03', name: 'Nguyễn Hoài An', room: 'A101', role: 'Ở cùng', start: '2026-08-15', status: 'Đang ở' },
      { id: 'NT-04', name: 'Phạm Văn Hùng', room: 'A102', role: 'Đại diện', start: '2026-09-01', status: 'Đang ở' },
    ],
    validate: next => datesInOrder(next) || (next.status === 'Đã rời phòng' && !next.end ? 'Nhập ngày ra của người thuê.' : undefined),
  },
  contracts: {
    title: 'Hợp đồng', description: 'Theo dõi người đại diện, thời hạn, giá thuê và tiền cọc.', add: 'Lập hợp đồng nháp', prefix: 'HD',
    fields: [
      room, { key: 'representative', label: 'Người đại diện' }, date('start', 'Ngày bắt đầu'), date('end', 'Ngày kết thúc'),
      amount('rent', 'Giá thuê mỗi tháng (₫)'), amount('deposit', 'Cọc phải nộp (₫)'), amount('received', 'Cọc thực nhận (₫)'),
      select('status', 'Trạng thái', ['Nháp', 'Đang hiệu lực', 'Đã kết thúc']), note,
    ],
    columns: ['room', 'representative', 'end', 'rent', 'received', 'status'], dateKeys: ['start', 'end'], moneyKeys: ['rent', 'deposit', 'received'],
    initial: [
      { id: 'HD-A101', room: 'A101', representative: 'Trần Minh Quân', start: '2026-08-15', end: '2027-08-14', rent: '3000000', deposit: '3000000', received: '3000000', status: 'Đang hiệu lực' },
      { id: 'HD-A102', room: 'A102', representative: 'Phạm Văn Hùng', start: '2026-09-01', end: '2027-08-31', rent: '3300000', deposit: '3300000', received: '3300000', status: 'Đang hiệu lực' },
    ],
    validate: (next, records) => datesInOrder(next) || (next.status === 'Đang hiệu lực' && records.some(record =>
      record.id !== next.id && record.status === 'Đang hiệu lực' && record.room === next.room && record.start <= next.end && record.end >= next.start)
      ? 'Thời hạn trùng một hợp đồng đang hiệu lực của phòng.' : undefined),
  },
  handovers: {
    title: 'Biên bản bàn giao', description: 'Ghi nhận biên bản nhận hoặc trả phòng.', add: 'Lập biên bản', prefix: 'BB',
    fields: [room, select('type', 'Loại bàn giao', ['Nhận phòng', 'Trả phòng']), date('date', 'Ngày bàn giao'), { ...note, label: 'Nội dung đối chiếu', required: true }],
    columns: ['room', 'type', 'date', 'note'], dateKeys: ['date'],
    initial: [{ id: 'BB-A101', room: 'A101', type: 'Nhận phòng', date: '2026-08-15', note: 'Bàn giao điều hòa, giường và nệm.' }],
  },
  assets: {
    title: 'Tài sản trong phòng', description: 'Lưu danh sách tài sản, số lượng và tình trạng khi bàn giao.', add: 'Thêm tài sản', prefix: 'TS',
    fields: [{ key: 'name', label: 'Tên tài sản' }, room, { key: 'quantity', label: 'Số lượng', type: 'number', min: 1 }, { key: 'condition', label: 'Tình trạng' }, note],
    columns: ['name', 'room', 'quantity', 'condition'],
    initial: [
      { id: 'TS-01', name: 'Điều hòa', room: 'A101', quantity: '1', condition: 'Hoạt động tốt' },
      { id: 'TS-02', name: 'Giường và nệm', room: 'A101', quantity: '2', condition: 'Hoạt động tốt' },
      { id: 'TS-03', name: 'Bình nóng lạnh', room: 'A102', quantity: '1', condition: 'Đang sử dụng' },
    ],
  },
  meters: {
    title: 'Chỉ số điện nước', description: 'Đối chiếu đầu kỳ, cuối kỳ và ghi riêng chỉ số nếu thay đồng hồ.', add: 'Ghi chỉ số', prefix: 'CS',
    fields: [
      room, select('type', 'Đồng hồ', ['Điện', 'Nước']), { key: 'period', label: 'Kỳ ghi', type: 'month' },
      amount('startValue', 'Chỉ số đầu'), amount('endValue', 'Chỉ số cuối'),
      { ...amount('oldEnd', 'Chỉ số cuối đồng hồ cũ'), required: false, hint: 'Chỉ điền khi thay đồng hồ.' },
      { ...amount('newStart', 'Chỉ số đầu đồng hồ mới'), required: false }, note,
    ],
    columns: ['room', 'type', 'period', 'startValue', 'endValue', 'usage'],
    initial: [
      { id: 'CS-01', room: 'A101', type: 'Điện', period: '2026-11', startValue: '1235', endValue: '1352', usage: '117' },
      { id: 'CS-02', room: 'A101', type: 'Nước', period: '2026-11', startValue: '345', endValue: '360', usage: '15' },
    ],
    validate: (next, records) => {
      if (records.some(record => record.id !== next.id && record.room === next.room && record.type === next.type && record.period === next.period)) return 'Chỉ số cho phòng, đồng hồ và kỳ này đã tồn tại.';
      const start = Number(next.startValue);
      const end = Number(next.endValue);
      if (next.oldEnd || next.newStart) {
        if (!next.oldEnd || !next.newStart) return 'Nhập đủ hai chỉ số khi thay đồng hồ.';
        if (Number(next.oldEnd) < start || end < Number(next.newStart)) return 'Chỉ số cuối phải từ chỉ số đầu của cùng đồng hồ trở lên.';
        next.usage = String(Number(next.oldEnd) - start + end - Number(next.newStart));
      } else {
        if (end < start) return 'Chỉ số cuối phải từ chỉ số đầu trở lên.';
        next.usage = String(end - start);
      }
    },
  },
  tariffs: {
    title: 'Biểu giá dịch vụ', description: 'Theo dõi đơn giá theo khu trọ và ngày hiệu lực.', add: 'Thêm biểu giá', prefix: 'BG',
    fields: [property, select('type', 'Dịch vụ', ['Điện', 'Nước', 'Internet', 'Vệ sinh', 'Giữ xe']), select('unit', 'Đơn vị tính', ['kWh', 'm³', 'phòng/tháng', 'người/tháng']),
      amount('price', 'Đơn giá (₫)'), date('start', 'Ngày hiệu lực'), note],
    columns: ['property', 'type', 'unit', 'price', 'start'], dateKeys: ['start'], moneyKeys: ['price'],
    initial: [
      { id: 'BG-01', property: 'An Nhiên', type: 'Điện', unit: 'kWh', price: '3500', start: '2026-08-01' },
      { id: 'BG-02', property: 'An Nhiên', type: 'Nước', unit: 'm³', price: '15000', start: '2026-08-01' },
    ],
    validate: (next, records) => records.some(record => record.id !== next.id && record.property === next.property && record.type === next.type && record.start === next.start) ? 'Dịch vụ đã có biểu giá tại mốc hiệu lực này.' : undefined,
  },
  expenses: {
    title: 'Chi phí vận hành', description: 'Ghi chi phí thực tế từ chứng từ của từng khu trọ.', add: 'Ghi khoản chi', prefix: 'CP',
    fields: [property, select('type', 'Loại chi', ['Bảo trì', 'Vệ sinh', 'Vật tư', 'Khác']), amount('amount', 'Số tiền (₫)'), { ...date('date', 'Ngày chi'), max: today() }, { key: 'reference', label: 'Mã chứng từ' }, note],
    columns: ['property', 'type', 'date', 'amount', 'reference'], dateKeys: ['date'], moneyKeys: ['amount'],
    initial: [{ id: 'CP-01', property: 'An Nhiên', type: 'Bảo trì', date: '2026-11-08', amount: '350000', reference: 'CP-AN-01', note: 'Thay phụ kiện vòi lavabo.' }],
    validate: (next, records) => records.some(record => record.id !== next.id && record.reference.toLowerCase() === next.reference.toLowerCase()) ? 'Mã chứng từ đã được ghi nhận.' : undefined,
  },
  tasks: {
    title: 'Nhắc việc', description: 'Theo dõi việc cần làm, hạn và tình trạng xử lý.', add: 'Thêm việc', prefix: 'NV',
    fields: [{ key: 'name', label: 'Công việc', multiline: true }, property, date('date', 'Hạn xử lý'), select('status', 'Trạng thái', ['Cần xử lý', 'Đang xử lý', 'Đã hoàn thành']), note],
    columns: ['name', 'property', 'date', 'status'], dateKeys: ['date'],
    initial: [
      { id: 'NV-01', property: 'An Nhiên', name: 'Ghi chỉ số điện nước cuối tháng', date: '2026-11-30', status: 'Cần xử lý' },
      { id: 'NV-02', property: 'Nhà Mộc', name: 'Kiểm tra phòng sau bảo trì', date: '2026-11-27', status: 'Đang xử lý' },
    ],
  },
  staff: {
    title: 'Phân công nhân viên', description: 'Xem và thử thiết lập phạm vi công việc cho từng khu.', add: 'Thêm phân công', prefix: 'PC',
    fields: [{ key: 'name', label: 'Tên nhân viên' }, property, select('scope', 'Nghiệp vụ', ['Quản lý phòng', 'Ghi chỉ số', 'Bảo trì', 'Báo cáo']),
      select('status', 'Trạng thái', ['Hoạt động', 'Ngừng phân công']), note],
    columns: ['name', 'property', 'scope', 'status'],
    initial: [{ id: 'PC-01', name: 'Nguyễn Việt Đức', property: 'An Nhiên', scope: 'Bảo trì', status: 'Hoạt động' }],
  },
};

export const initialExpenses = modules.expenses.initial ?? [];

export function OwnerProperties() {
  const { demo, change } = useDemo();
  const [editing, edit] = useState<number>();
  const [query, setQuery] = useState('');
  const existing = demo.properties.find(entry => entry.id === editing);
  const properties = demo.properties.filter(entry => matchText(`${entry.name} ${entry.address}`, query));
  return <div className="workspace-page">
    <Heading title="Khu trọ" description="Quản lý địa chỉ và số phòng của từng khu trọ."
      action={<button type="button" className="ui-button primary" onClick={() => edit(0)}><Plus size={17} /> Thêm khu trọ</button>} />
    <section className="product-panel">
      <div className="panel-head"><div><h2>Danh sách khu trọ</h2><p>{properties.length} khu trọ</p></div><input className="ui-input" aria-label="Tìm khu trọ" placeholder="Tên hoặc địa chỉ khu trọ" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <Table columns={['Khu trọ', 'Địa chỉ', 'Số phòng', 'Phòng trống', 'Thao tác']} rows={properties.map(entry => ({
        id: String(entry.id), cells: [<span className="table-name"><Building2 size={17} /> {entry.name}</span>, entry.address, demo.rooms.filter(room => room.propertyId === entry.id).length,
          demo.rooms.filter(room => room.propertyId === entry.id && room.status === 'AVAILABLE').length, <button className="text-button" onClick={() => edit(entry.id)}>Chỉnh sửa</button>],
      }))} />
    </section>
    {editing !== undefined && <FormDialog title={existing ? 'Chỉnh sửa khu trọ' : 'Thêm khu trọ'} fields={[
      { key: 'name', label: 'Tên khu trọ', multiline: true }, { key: 'address', label: 'Địa chỉ', multiline: true, maxLength: 250 },
    ]} initial={existing} close={() => edit(undefined)} save={values => {
      if (demo.properties.some(entry => entry.id !== editing && entry.name.toLowerCase() === values.name.toLowerCase())) return 'Tên khu trọ này đã được sử dụng.';
      change(previous => {
        const next = { id: existing?.id ?? Math.max(0, ...previous.properties.map(entry => entry.id)) + 1, name: values.name, address: values.address };
        const updatedModules = existing ? Object.fromEntries(Object.entries(previous.modules).map(([key, rows]) => [key, rows.map(row => row.property === existing.name ? { ...row, property: next.name } : row)])) : previous.modules;
        if (existing) for (const [key, config] of Object.entries(modules)) {
          if (!updatedModules[key] && config.initial?.some(row => row.property === existing.name)) {
            updatedModules[key] = config.initial.map(row => row.property === existing.name ? { ...row, property: next.name } : row);
          }
        }
        return { ...previous, properties: existing ? previous.properties.map(entry => entry.id === existing.id ? next : entry) : [...previous.properties, next], modules: updatedModules };
      });
    }} />}
  </div>;
}

const groups = {
  tenants: { title: 'Người thuê & hợp đồng', description: 'Theo dõi thành viên, điều khoản thuê và các khoản cọc của từng phòng.', tabs: ['tenants', 'contracts'] },
  assets: { title: 'Bàn giao tài sản', description: 'Đối chiếu tài sản khi nhận và trả phòng.', tabs: ['assets', 'handovers'] },
  utilities: { title: 'Điện nước & dịch vụ', description: 'Ghi chỉ số, quản lý biểu giá và kiểm tra mức tiêu thụ của từng phòng.', tabs: ['meters', 'tariffs'] },
  operations: { title: 'Vận hành', description: 'Theo dõi việc cần làm, chi phí vận hành và phân công nhân viên.', tabs: ['tasks', 'expenses', 'staff'] },
};

export function OwnerGroups({ group }: { group: keyof typeof groups }) {
  const config = groups[group];
  const [active, setActive] = useState(config.tabs[0]);
  return <div className="workspace-page">
    <Heading title={config.title} description={config.description} />
    <div className="workspace-tabs" aria-label="Chọn nội dung">
      {config.tabs.map(tab => <button key={tab} type="button" aria-pressed={active === tab} onClick={() => setActive(tab)}>{modules[tab].title}</button>)}
    </div>
    <OwnerRecords key={active} resource={active} />
  </div>;
}

function OwnerRecords({ resource }: { resource: string }) {
  const { demo, change } = useDemo();
  const [query, setQuery] = useState('');
  const [editing, edit] = useState<string>();
  const [viewing, view] = useState<string>();
  const config = modules[resource];
  const records = demo.modules[resource] ?? config.initial ?? [];
  const current = records.find(record => record.id === editing);
  const detail = records.find(record => record.id === viewing);
  const visible = records.filter(record => matchText(Object.values(record).join(' '), query));
  const fields = config.fields.map(field => field.options ? field : field.key === 'room'
    ? { ...field, options: demo.rooms.map(item => item.roomNumber) }
    : field.key === 'property' ? { ...field, options: demo.properties.map(item => item.name) } : field);
  const lookup = (key: string) => fields.find(field => field.key === key)?.label ?? 'Tiêu thụ';

  function value(record: ModuleRecord, key: string) {
    if (!record[key]) return '—';
    if (key === 'status') return <Status>{record[key]}</Status>;
    if (config.dateKeys?.includes(key)) return formatDate(record[key]);
    if (config.moneyKeys?.includes(key)) return money(Number(record[key]));
    if (key === 'usage') return `${record[key]} ${record.type === 'Điện' ? 'kWh' : 'm³'}`;
    return record[key];
  }

  function save(values: ModuleRecord) {
    const next = { ...values, id: current?.id ?? sampleId(config.prefix) };
    const error = config.validate?.(next, records);
    if (error) return error;
    change(previous => {
      const existing = previous.modules[resource] ?? config.initial ?? [];
      const rows = current ? existing.map(record => record.id === current.id ? next : record) : [next, ...existing];
      return { ...previous, modules: { ...previous.modules, [resource]: rows } };
    });
    view(next.id);
  }

  return <section className="product-panel">
    <div className="panel-head"><div><h2>{config.title}</h2><p>{config.description}</p></div>
      <div className="record-actions"><label className="table-search"><Search size={17} /><input aria-label="Tìm trong danh sách" placeholder="Tìm trong danh sách" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <button type="button" className="ui-button primary" onClick={() => edit('new')}><Plus size={16} /> {config.add}</button></div>
    </div>
    <Table columns={[...config.columns.map(lookup), 'Thao tác']} rows={visible.map(record => ({ id: record.id, cells: [
      ...config.columns.map(key => value(record, key)), <button className="text-button" onClick={() => view(record.id)}>Chi tiết</button>,
    ] }))} empty="Không tìm thấy bản ghi." />
    {detail && !editing && <Details title={`${config.title} · ${detail.id}`} data={fields.map(field => [field.label, value(detail, field.key)])}
      close={() => view(undefined)} actions={<button className="ui-button" onClick={() => edit(detail.id)}>Chỉnh sửa</button>} />}
    {editing && <FormDialog title={current ? `Chỉnh sửa ${current.id}` : config.add} fields={fields}
      initial={current ?? (resource === 'contracts' ? { status: 'Nháp', received: 0 } : undefined)} close={() => edit(undefined)} save={save} />}
  </section>;
}
