import { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { formatDate, formatPeriod, invoiceBalance, invoicePaid, invoiceStatus, invoiceTotal, money, sampleId, tenantRoomId, today, useDemo } from './demo';
import type { Invoice } from './demo';
import { Details, FormDialog, Heading, Status, Table } from './ui';
import type { Field } from './ui';

export default function Invoices({ owner }: { owner: boolean }) {
  const { demo, change } = useDemo();
  const [selected, select] = useState<string>();
  const [dialog, setDialog] = useState<'draft' | 'publish' | 'receipt'>();
  const [query, setQuery] = useState('');
  const invoice = demo.invoices.find(entry => entry.id === selected);
  const visible = demo.invoices.filter(entry => (owner || (entry.roomId === tenantRoomId && entry.status === 'Đã phát hành')) && [entry.room, entry.period, entry.id].join(' ').toLowerCase().includes(query.toLowerCase()));
  const issued = visible.filter(entry => entry.status === 'Đã phát hành');
  const totalDue = issued.reduce((sum, entry) => sum + invoiceBalance(entry), 0);
  const totalPaid = issued.reduce((sum, entry) => sum + invoicePaid(entry), 0);

  const draftFields: Field[] = [
    { key: 'roomId', label: 'Phòng', type: 'select', options: demo.rooms.filter(room => room.status === 'OCCUPIED').map(room => ({
      value: String(room.id), label: `${room.roomNumber} · ${demo.properties.find(property => property.id === room.propertyId)?.name ?? ''}`,
    })) },
    { key: 'period', label: 'Kỳ thu', type: 'month' }, { key: 'due', label: 'Hạn thanh toán', type: 'date' },
    { key: 'rent', label: 'Tiền thuê (₫)', type: 'number', min: 0 }, { key: 'utilities', label: 'Điện nước (₫)', type: 'number', min: 0 },
    { key: 'service', label: 'Dịch vụ (₫)', type: 'number', min: 0 },
  ];
  const receiptFields: Field[] = [
    { key: 'amount', label: 'Số tiền thực nhận (₫)', type: 'number', min: 1 },
    { key: 'date', label: 'Ngày nhận', type: 'date', max: today() },
    { key: 'method', label: 'Phương thức', type: 'select', options: ['Chuyển khoản', 'Tiền mặt'] },
    { key: 'reference', label: 'Mã tham chiếu', maxLength: 60 },
  ];

  function saveDraft(values: Record<string, string>) {
    const room = demo.rooms.find(entry => entry.id === Number(values.roomId) && entry.status === 'OCCUPIED');
    if (!room) return 'Chọn một phòng đang cho thuê.';
    if (demo.invoices.some(entry => entry.roomId === room.id && entry.period === values.period)) return 'Phòng đã có hóa đơn cho kỳ này.';
    const record: Invoice = { id: sampleId('INV'), roomId: room.id, room: room.roomNumber, period: values.period, due: values.due, rent: Number(values.rent), utilities: Number(values.utilities), service: Number(values.service), status: 'Nháp', receipts: [] };
    if (!invoiceTotal(record)) return 'Tổng hóa đơn phải lớn hơn 0.';
    change(previous => ({ ...previous, invoices: [record, ...previous.invoices] }));
    select(record.id);
  }

  function saveReceipt(values: Record<string, string>) {
    if (!invoice || invoice.status !== 'Đã phát hành') return 'Hóa đơn cần được phát hành trước khi ghi thu.';
    if (demo.invoices.some(entry => entry.receipts.some(receipt => receipt.reference.toLowerCase() === values.reference.toLowerCase()))) return 'Mã tham chiếu này đã được ghi nhận.';
    const receipt = { id: sampleId('PT'), amount: Number(values.amount), date: values.date, method: values.method, reference: values.reference };
    change(previous => ({ ...previous, invoices: previous.invoices.map(entry => entry.id === invoice.id ? { ...entry, receipts: [...entry.receipts, receipt] } : entry) }));
  }

  return <div className="workspace-page">
    <Heading title={owner ? 'Hóa đơn & thu tiền' : 'Hóa đơn của tôi'} description={owner ? 'Lập hóa đơn theo kỳ, ghi số tiền thực nhận và đối chiếu công nợ.' : 'Theo dõi hóa đơn đã phát hành, khoản đã thu và số tiền còn lại của phòng A101.'}
      action={owner && <button type="button" className="ui-button primary" onClick={() => setDialog('draft')}><Plus size={17} /> Lập hóa đơn</button>} />
    <div className="summary-grid">
      <div className="product-panel summary-tile"><span>Hóa đơn đã phát hành</span><strong>{issued.length}</strong></div>
      <div className="product-panel summary-tile"><span>Số tiền đã ghi thu</span><strong>{money(totalPaid)}</strong></div>
      <div className="product-panel summary-tile"><span>Còn phải thu</span><strong>{money(totalDue)}</strong></div>
    </div>
    <section className="product-panel">
      <div className="panel-head"><div><h2>Danh sách hóa đơn</h2><p>{visible.length} hóa đơn</p></div><input className="ui-input" placeholder="Tìm theo mã, phòng hoặc kỳ" aria-label="Tìm hóa đơn" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <Table columns={['Hóa đơn', 'Kỳ thu', 'Hạn thanh toán', 'Tổng tiền', 'Còn phải thu', 'Trạng thái', 'Thao tác']} rows={visible.map(entry => ({
        id: entry.id,
        cells: [<span className="table-name"><Receipt size={16} /> {entry.id} · {entry.room}</span>, formatPeriod(entry.period), formatDate(entry.due), money(invoiceTotal(entry)), money(invoiceBalance(entry)), <Status>{invoiceStatus(entry)}</Status>, <button className="text-button" onClick={() => select(entry.id)}>Chi tiết</button>],
      }))} empty="Không tìm thấy hóa đơn." />
    </section>
    {invoice && !dialog && <Details title={`Hóa đơn ${invoice.id}`} close={() => select(undefined)} data={[
      ['Phòng và kỳ thu', `${invoice.room} · ${formatPeriod(invoice.period)}`], ['Hạn thanh toán', formatDate(invoice.due)], ['Trạng thái', <Status>{invoiceStatus(invoice)}</Status>],
      ['Tiền thuê', money(invoice.rent)], ['Điện nước', money(invoice.utilities)], ['Dịch vụ', money(invoice.service)], ['Tổng tiền', money(invoiceTotal(invoice))],
      ['Đã thu', money(invoicePaid(invoice))], ['Còn lại', money(invoiceBalance(invoice))],
      ...(invoicePaid(invoice) > invoiceTotal(invoice) ? [['Tiền nhận dư', money(invoicePaid(invoice) - invoiceTotal(invoice))] as [string, string]] : []),
      ['Phiếu thu', invoice.receipts.length ? <ul className="inline-list">{invoice.receipts.map(receipt => <li key={receipt.id}>{receipt.id} · {money(receipt.amount)} · {formatDate(receipt.date)} · {receipt.method} ({receipt.reference})</li>)}</ul> : 'Chưa có'],
    ]} actions={owner && (invoice.status === 'Nháp'
      ? <button className="ui-button primary" onClick={() => setDialog('publish')}>Phát hành hóa đơn</button>
      : <button className="ui-button primary" onClick={() => setDialog('receipt')}>Ghi nhận thu tiền</button>)} />}
    {dialog === 'draft' && <FormDialog title="Lập hóa đơn nháp" fields={draftFields} close={() => setDialog(undefined)} save={saveDraft} />}
    {dialog === 'receipt' && <FormDialog title="Ghi nhận thu tiền" fields={receiptFields} initial={{ date: today() }} close={() => setDialog(undefined)} save={saveReceipt} />}
    {dialog === 'publish' && invoice && <FormDialog title="Phát hành hóa đơn" intro={`${invoice.id} · ${money(invoiceTotal(invoice))}. Người thuê có thể xem hóa đơn này sau khi phát hành trong bản demo.`} fields={[]} submit="Xác nhận phát hành" close={() => setDialog(undefined)} save={() => {
      change(previous => ({ ...previous, invoices: previous.invoices.map(entry => entry.id === invoice.id ? { ...entry, status: 'Đã phát hành' } : entry) }));
    }} />}
  </div>;
}
