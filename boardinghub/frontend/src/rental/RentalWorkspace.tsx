import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Popconfirm, Segmented, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { useAuth, authError } from '../auth';
import { Heading, Table } from '../ui';
import type { Field } from '../ui';
import { money, today } from '../demo';
import { httpApi } from './http';
import { mockApi } from './mock';
import { blankState, n, s } from './types';
import type { CommandData, RentalRow } from './types';
import { RentalForm } from './RentalForm';
import type { RentalDialog } from './RentalForm';
import './rental.css';

const statuses:Record<string,string>={DRAFT:'Nháp',ACTIVE:'Đang hiệu lực',TERMINATED:'Đã kết thúc',VACANT:'Phòng trống',OCCUPIED:'Đang ở',OPEN:'Đang mở',LOCKED:'Đã khóa',ISSUED:'Đã phát hành',PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',FINALIZED:'Đã quyết toán',RECEIVE:'Nhận cọc',APPLY_TO_DEBT:'Cấn cọc vào nợ',REFUND:'Hoàn cọc'};
const badge=(value:string)=><Tag color={['ACTIVE','ISSUED','FINALIZED','VACANT','APPROVED','LOCKED'].includes(value)?'green':'blue'}>{statuses[value]||value}</Tag>;
const amount=(key:string,label:string,min=0):Field=>({key,label,type:'number',min,max:999999999999.99,step:'0.01'});
const meter=(key:string,label:string,min=0):Field=>({key,label,type:'number',min,max:999999999999.999,step:'0.001'});
const date=(key:string,label:string,max?:string):Field=>({key,label,type:'date',max});
const ref=():Field=>({key:'reference',label:'Mã tham chiếu duy nhất',maxLength:100});
const reference=()=>`PT-${crypto.randomUUID().slice(0,12)}`;
const names={moveIn:'Vào ở & hợp đồng',billing:'Kỳ thu & hóa đơn',checkout:'Trả phòng & quyết toán'};
type Section=keyof typeof names;

export default function RentalWorkspace({section}:{section:Section}) {
  const {user}=useAuth();
  const {message}=App.useApp();
  const queryClient=useQueryClient();
  const [mode,setMode]=useState<'http'|'mock'>('http');
  const [selected,setSelected]=useState<number>();
  const [selectedInvoice,setSelectedInvoice]=useState<number>();
  const [dialog,setDialog]=useState<RentalDialog>();
  const adapter=useMemo(()=>mode==='http'?httpApi:mockApi(user!.id),[mode,user?.id]);
  const queryKey=['rental',user?.id,mode];
  const query=useQuery({queryKey,queryFn:()=>adapter.state(),enabled:!!user});
  const state=query.data||blankState();
  const mutation=useMutation({
    mutationFn:({path,data}:{path:string;data?:CommandData})=>adapter.execute(path,data),
    onSuccess:async(result,variables)=>{
      if(variables.path==='contracts'&&result.id)setSelected(result.id);
      await queryClient.invalidateQueries({queryKey});
      void message.success('Đã lưu và cập nhật dữ liệu.');
    },
  });
  const busy=mutation.isPending;
  const execute=(path:string,data?:CommandData)=>mutation.mutateAsync({path,data});
  const act=(path:string)=>{void execute(path).catch(()=>{});};
  const form=(title:string,path:string,fields:Field[],initial?:Record<string,string|number>,intro?:string)=>setDialog({title,path,fields,initial,intro});
  const contract=state.contracts.find(row=>row.id===selected)||state.contracts[state.contracts.length-1];
  const cid=contract?.id||0;
  const room=state.rooms.find(row=>row.id===n(contract,'room_id'));
  const person=state.persons.find(row=>row.id===n(contract,'person_id'));
  const periods=state.billing_periods.filter(row=>n(row,'contract_id')===cid);
  const period=periods[periods.length-1];
  const invoices=state.invoices.filter(row=>n(row,'contract_id')===cid);
  const checkout=state.checkouts.find(row=>n(row,'contract_id')===cid);
  const checkoutInvoice=invoices.find(row=>s(row,'kind')==='CHECKOUT');
  const deductions=state.checkout_deductions.filter(row=>n(row,'checkout_id')===checkout?.id);
  const active=s(contract,'status')==='ACTIVE';
  const draft=s(contract,'status')==='DRAFT';
  const handover=state.handovers.find(row=>n(row,'contract_id')===cid&&s(row,'kind')==='CHECK_IN');
  const remainingDeposit=Math.max(0,n(contract,'deposit_due')-n(contract,'deposit_balance'));
  const periodInvoice=invoices.find(row=>n(row,'period_id')===period?.id);
  const readings=state.meter_readings.filter(row=>n(row,'period_id')===period?.id&&n(row,'contract_id')===cid);
  const last=(type:string)=>{const rows=state.meter_readings.filter(row=>n(row,'contract_id')===cid&&s(row,'meter_type')===type);return n(rows[rows.length-1],'current_value');};
  const outstanding=invoices.reduce((total,row)=>total+n(row,'balance'),0);
  const funds=n(contract,'deposit_balance');
  const invoice=state.invoices.find(row=>row.id===selectedInvoice&&n(row,'contract_id')===cid);
  const chooseInvoice=(row:RentalRow)=>setSelectedInvoice(row.id);
  function paymentForm(row:RentalRow) {
    form(`Ghi thu hóa đơn #${row.id}`,'payments',[
      {key:'invoiceId',label:'Hóa đơn',type:'select',options:[{value:String(row.id),label:`#${row.id} · Còn ${money(n(row,'balance'))}`}]},
      {...amount('amount','Số tiền thực nhận (₫)',0.01),max:n(row,'balance')},date('date','Ngày thu',today()),ref(),
    ],{invoiceId:row.id,amount:n(row,'balance'),date:today(),reference:reference()},'Chỉ ghi tiền đã thực nhận. Có thể thu một phần; hệ thống tự phân bổ và cập nhật công nợ.');
  }
  const invoiceTable=<Table columns={['Hóa đơn','Kỳ / loại','Tổng tiền','Còn nợ','Trạng thái','Thao tác']} rows={invoices.map(row=>({id:String(row.id),cells:[
    `#${row.id}`,`${s(row,'period_key')} · ${s(row,'kind')==='CHECKOUT'?'Trả phòng':'Định kỳ'}`,money(n(row,'total_amount')),money(n(row,'balance')),badge(s(row,'status')),
    <div className="record-actions"><button className="text-button" onClick={()=>chooseInvoice(row)}>Chi tiết</button>
      {s(row,'status')==='DRAFT'?<button disabled={busy} className="text-button" onClick={()=>act(`invoices/${row.id}/issue`)}>Phát hành</button>
        :n(row,'balance')>0&&<button disabled={busy} className="text-button" onClick={()=>paymentForm(row)}>Ghi thu</button>}</div>,
  ]}))}/>;
  return <div className="workspace-page rental-page">
    <Heading title={names[section]} description="Vào ở → thu tiền theo kỳ → trả phòng. Các bước sau chỉ mở khi đủ điều kiện của bước trước."
      action={<div className="record-actions"><Segmented value={mode} onChange={value=>{setMode(value as 'http'|'mock');setSelected(undefined);setSelectedInvoice(undefined);mutation.reset();}}
        options={[{value:'http',label:'Dữ liệu thật'},{value:'mock',label:'Dùng thử riêng'}]} disabled={busy}/><button className="ui-button" disabled={query.isFetching} onClick={()=>void query.refetch()} aria-label="Tải lại dữ liệu"><RefreshCw size={16}/></button></div>}/>
    <nav className="rental-flow-nav" aria-label="Luồng quản lý thuê">
      <Link to="/tenants" aria-current={section==='moveIn'?'page':undefined}>1. Vào ở</Link><ArrowRight size={16}/>
      <Link to="/invoices" aria-current={section==='billing'?'page':undefined}>2. Mỗi kỳ thu</Link><ArrowRight size={16}/>
      <Link to="/checkout" aria-current={section==='checkout'?'page':undefined}>3. Trả phòng</Link>
    </nav>
    {mode==='mock'&&<Alert type="warning" showIcon title="Chế độ dùng thử — chỉ lưu trong trình duyệt theo tài khoản này; không ghi vào MySQL."/>}
    {query.isError?<Alert type="error" showIcon title={authError(query.error)} description="Dữ liệu thật chưa tải được. Bấm tải lại sau khi kiểm tra kết nối; hệ thống không tự chuyển sang dữ liệu mẫu."/>:query.isPending?<p role="status">Đang tải hồ sơ thuê…</p>:<>
      {mutation.isError&&!dialog&&<Alert closable onClose={()=>mutation.reset()} type="error" showIcon title={authError(mutation.error)}/>}
      {section==='moveIn'&&<section className="product-panel"><div className="panel-head"><div><h2>Chuẩn bị hồ sơ</h2><p>{state.rooms.length} phòng · {state.persons.length} người thuê</p></div><div className="record-actions">
        <button className="ui-button" disabled={busy} onClick={()=>form('Thêm phòng','rooms',[{key:'propertyName',label:'Tên khu trọ',maxLength:150},{key:'roomNumber',label:'Số phòng',maxLength:30},{key:'capacity',label:'Sức chứa',type:'number',step:'1',min:1,max:100}],{capacity:2})}><Plus size={16}/>Phòng</button>
        <button className="ui-button" disabled={busy} onClick={()=>form('Thêm người thuê','persons',[{key:'fullName',label:'Họ tên',maxLength:150},{key:'phone',label:'Điện thoại',type:'tel',maxLength:30},{key:'accountEmail',label:'Email tài khoản người thuê',required:false,maxLength:254,hint:'Chỉ liên kết với tài khoản người thuê đã đăng ký và được bạn đối chiếu danh tính. Có thể để trống nếu chưa có tài khoản.'}])}><Plus size={16}/>Người thuê</button>
        <button className="ui-button primary" disabled={busy||!state.rooms.some(row=>s(row,'status')==='VACANT')||!state.persons.length} onClick={()=>form('Lập hợp đồng nháp','contracts',[
          {key:'roomId',label:'Phòng trống',type:'select',options:state.rooms.filter(row=>s(row,'status')==='VACANT').map(row=>({value:String(row.id),label:`${s(row,'property_name')} · ${s(row,'room_number')}`}))},
          {key:'personId',label:'Người đại diện',type:'select',options:state.persons.map(row=>({value:String(row.id),label:s(row,'full_name')}))},
          date('startDate','Ngày bắt đầu'),{...date('endDate','Ngày kết thúc'),required:false},amount('rent','Tiền thuê mỗi tháng (₫)'),amount('deposit','Cọc phải nộp (₫)'),
          amount('electricityPrice','Đơn giá điện / kWh (₫)'),amount('waterPrice','Đơn giá nước / m³ (₫)'),amount('servicePrice','Dịch vụ cố định / tháng (₫)'),
        ],{startDate:today(),rent:3000000,deposit:3000000,electricityPrice:3500,waterPrice:15000,servicePrice:100000},'Lưu điều khoản thuê, biểu giá và lượt ở dự kiến. Tiền thuê định kỳ tính trọn tháng; tiền cuối kỳ được đối chiếu riêng khi trả phòng.')}><Plus size={16}/>Lập hợp đồng</button>
      </div></div>
      <Table columns={['Khu trọ','Phòng','Sức chứa','Trạng thái']} rows={state.rooms.map(row=>({id:String(row.id),cells:[s(row,'property_name'),s(row,'room_number'),n(row,'capacity'),badge(s(row,'status'))]}))}/>
      {!state.rooms.length&&<p>Thêm phòng và người thuê, sau đó lập hợp đồng nháp để bắt đầu.</p>}
      </section>}
      <section className="product-panel"><div className="rental-contract-picker"><label>Hợp đồng đang xử lý<select value={cid||''} onChange={event=>{setSelected(Number(event.target.value));setSelectedInvoice(undefined);mutation.reset();}} disabled={!state.contracts.length||busy}>
        {!state.contracts.length&&<option value="">Chưa có hợp đồng</option>}
        {state.contracts.map(row=><option key={row.id} value={row.id}>#{row.id} · {s(state.rooms.find(room=>room.id===n(row,'room_id')),'room_number')} · {s(state.persons.find(person=>person.id===n(row,'person_id')),'full_name')} · {statuses[s(row,'status')]}</option>)}
      </select></label>{contract&&badge(s(contract,'status'))}</div>
      {contract&&<div className="rental-contract-info"><span><b>{s(room,'property_name')} · {s(room,'room_number')}</b><small>{s(person,'full_name')} · {s(person,'phone')}</small></span>
        <span><small>Thời hạn</small>{s(contract,'start_date')} → {s(contract,'end_date')||'Không xác định'}</span><span><small>Giá thuê</small>{money(n(contract,'rent_amount'))}/tháng</span></div>}
      </section>
      {!contract&&section!=='moveIn'&&<Alert type="info" title="Chưa có hợp đồng" description={<Link to="/tenants">Mở luồng vào ở để tạo phòng, người thuê và hợp đồng.</Link>}/>}
      {contract&&section==='moveIn'&&<>
        <div className="rental-summary"><article className="product-panel"><small>Cọc phải nộp</small><strong>{money(n(contract,'deposit_due'))}</strong></article><article className="product-panel"><small>Cọc đang giữ</small><strong>{money(funds)}</strong></article><article className="product-panel"><small>Bàn giao nhận phòng</small><strong>{handover?'Đã lập biên bản':'Chưa bàn giao'}</strong></article></div>
        <section className="product-panel"><h2>Hoàn tất vào ở</h2><div className="rental-actions">
          <button disabled={busy||!draft||remainingDeposit<=0} className="ui-button" onClick={()=>form('Ghi nhận tiền cọc',`contracts/${cid}/deposit`,[{...amount('amount','Cọc thực nhận (₫)',0.01),max:remainingDeposit},date('date','Ngày nhận cọc',today()),ref()],{amount:remainingDeposit,date:today(),reference:reference()},'Chỉ xác nhận khoản tiền cọc đã thực nhận. Hệ thống từ chối mã tham chiếu trùng và khoản thu vượt cọc phải nộp.')}>1. Nhận tiền cọc</button>
          <button disabled={busy||!draft||!!handover} className="ui-button" onClick={()=>form('Bàn giao & chỉ số nhận phòng',`contracts/${cid}/check-in`,[meter('electricity','Chỉ số điện đầu'),meter('water','Chỉ số nước đầu'),{key:'notes',label:'Tài sản và tình trạng bàn giao',type:'textarea',maxLength:1000}],{electricity:0,water:0})}>2. Lập bàn giao & chỉ số</button>
          <Popconfirm title="Xác nhận vào ở và chuyển phòng sang đang ở?" onConfirm={()=>execute(`contracts/${cid}/activate`)} disabled={!draft||busy||remainingDeposit>0||!handover}><button disabled={!draft||busy||remainingDeposit>0||!handover} className="ui-button primary">3. Kích hoạt hợp đồng</button></Popconfirm>
        </div><p className="rental-note">Cần đủ cọc, biên bản và chỉ số đầu vào; ngày bắt đầu phải đến hạn. Kích hoạt đồng thời cập nhật hợp đồng, lượt ở và phòng.</p>
        {active&&<Link className="quiet-link" to="/invoices">Hợp đồng đã hiệu lực — chuyển sang kỳ thu <ArrowRight size={16}/></Link>}</section>
        <section className="product-panel"><h2>Giá dịch vụ theo hợp đồng</h2><Table columns={['Dịch vụ','Đơn giá']} rows={state.contract_services.filter(row=>n(row,'contract_id')===cid).map(row=>({id:String(row.id),cells:[s(row,'service_type')==='ELECTRIC'?'Điện / kWh':s(row,'service_type')==='WATER'?'Nước / m³':'Cố định / tháng',money(n(row,'unit_price'))]}))}/></section>
      </>}
      {contract&&section==='billing'&&<>
        <section className="product-panel"><div className="panel-head"><div><h2>Kỳ thu</h2><p>Mở kỳ → xác nhận chỉ số → lập nháp → phát hành → khóa kỳ.</p></div>
          <button className="ui-button primary" disabled={busy||!active||!!checkout||periods.some(row=>s(row,'status')!=='LOCKED')} onClick={()=>form('Mở kỳ thu',`contracts/${cid}/periods`,[{key:'period',label:'Tháng thu',type:'month',min:s(contract,'start_date').slice(0,7),max:today().slice(0,7)},date('dueDate','Hạn thanh toán')],{period:today().slice(0,7),dueDate:today()})}><Plus size={16}/>Mở kỳ</button></div>
          <Table columns={['Kỳ','Hạn thu','Trạng thái']} rows={periods.map(row=>({id:String(row.id),cells:[s(row,'period_key'),s(row,'due_date'),badge(s(row,'status'))]}))}/>
          {period&&<div className="rental-actions"><span>Kỳ gần nhất: <b>{s(period,'period_key')}</b></span>
            <button className="ui-button" disabled={busy||!active||s(period,'status')!=='OPEN'||!!readings.length} onClick={()=>form('Xác nhận chỉ số cuối kỳ',`periods/${period.id}/readings`,[meter('electricity','Điện cuối kỳ',last('ELECTRIC')),meter('water','Nước cuối kỳ',last('WATER'))],{electricity:last('ELECTRIC'),water:last('WATER')},'Chỉ số được xác nhận một lần. Chỉ số đầu tự lấy từ lần chốt trước; không sửa sau khi đã lập hóa đơn.')}>Xác nhận điện nước</button>
            <button className="ui-button" disabled={busy||!active||s(period,'status')!=='OPEN'||readings.length!==2||!!periodInvoice} onClick={()=>act(`periods/${period.id}/draft-invoice`)}>Lập hóa đơn nháp</button>
            <button className="ui-button" disabled={busy||!active||s(period,'status')==='LOCKED'||s(periodInvoice,'status')!=='ISSUED'} onClick={()=>act(`periods/${period.id}/lock`)}>Khóa kỳ</button>
          </div>}
        </section>
        <section className="product-panel"><div className="panel-head"><h2>Hóa đơn & công nợ</h2><strong>{money(outstanding)} còn phải thu</strong></div>{invoiceTable}</section>
      </>}
      {contract&&section==='checkout'&&<>
        {!checkout?<section className="product-panel"><h2>Chuẩn bị trả phòng</h2><p>Phát hành và khóa các kỳ đang mở trước khi chốt chỉ số cuối. Tiền thuê và dịch vụ cuối kỳ phải được đối chiếu với người thuê; nhập 0 nếu tháng đó đã tính đủ.</p>
          <button className="ui-button primary" disabled={busy||!active||periods.some(row=>s(row,'status')!=='LOCKED')} onClick={()=>form('Lập hồ sơ trả phòng',`contracts/${cid}/checkout`,[date('date','Ngày trả phòng',today()),meter('electricity','Điện chốt trả',last('ELECTRIC')),meter('water','Nước chốt trả',last('WATER')),amount('finalRent','Tiền thuê cuối kỳ còn phải tính (₫)'),amount('finalService','Dịch vụ cuối kỳ còn phải tính (₫)'),{key:'notes',label:'Nội dung đối chiếu tài sản khi trả',type:'textarea',maxLength:1000}],{date:today(),electricity:last('ELECTRIC'),water:last('WATER'),finalRent:0,finalService:0},'Chỉ tính lượng điện nước sau lần chốt gần nhất. Nếu tháng đã có hóa đơn định kỳ thì tiền thuê/dịch vụ cuối kỳ phải bằng 0 để tránh thu trùng.')}>Lập trả phòng & chỉ số cuối</button>
        </section>:<>
          <div className="rental-summary"><article className="product-panel"><small>Cọc đang giữ</small><strong>{money(funds)}</strong></article><article className="product-panel"><small>{s(checkout,'status')==='FINALIZED'?'Đã cấn nợ':'Nợ cần đối chiếu (gồm khấu trừ đã duyệt)'}</small><strong>{money(s(checkout,'status')==='FINALIZED'?n(checkout,'applied_amount'):outstanding)}</strong></article><article className="product-panel"><small>{s(checkout,'status')==='FINALIZED'?'Đã hoàn cọc':'Dự kiến hoàn cọc'}</small><strong>{money(s(checkout,'status')==='FINALIZED'?n(checkout,'refund_amount'):Math.max(0,funds-outstanding))}</strong></article></div>
          <section className="product-panel"><div className="panel-head"><div><h2>Khấu trừ trả phòng</h2><p>Khoản được duyệt sẽ thành dòng chi tiết trong hóa đơn cuối; không bị tính thêm lần thứ hai khi cấn cọc.</p></div>
            <button className="ui-button" disabled={busy||s(checkout,'status')!=='DRAFT'||s(checkoutInvoice,'status')!=='DRAFT'} onClick={()=>form('Đề nghị khấu trừ',`checkouts/${checkout.id}/deductions`,[{key:'description',label:'Lý do và chứng từ đối chiếu',maxLength:250},amount('amount','Số tiền (₫)',0.01)])}><Plus size={16}/>Khấu trừ</button></div>
            <Table columns={['Nội dung','Số tiền','Trạng thái','Thao tác']} rows={deductions.map(row=>({id:String(row.id),cells:[s(row,'description'),money(n(row,'amount')),badge(s(row,'status')),s(row,'status')==='PENDING'?<button disabled={busy} className="text-button" onClick={()=>act(`deductions/${row.id}/approve`)}>Duyệt khấu trừ</button>:'Đã vào hóa đơn']}))}/>
          </section>
          <section className="product-panel"><h2>Đối chiếu hóa đơn trước quyết toán</h2>{invoiceTable}</section>
          <section className="product-panel"><div className="panel-head"><h2>Chốt trả phòng</h2>{badge(s(checkout,'status'))}</div>
            {s(checkout,'status')==='DRAFT'?<>
              {outstanding>funds&&<Alert type="warning" showIcon title={`Cọc chưa đủ cấn nợ. Cần ghi thu thêm ít nhất ${money(outstanding-funds)} trên các hóa đơn trước khi chốt.`}/>}
              <p>Ngày trả: {s(checkout,'checkout_date')}. Khi xác nhận, hệ thống phân bổ cọc vào các hóa đơn, ghi hoàn phần dư, kết thúc lượt ở và trả phòng về trạng thái trống.</p>
              <Popconfirm title="Đã đối chiếu công nợ và thực hiện hoàn tiền cọc còn dư?" description="Thao tác ghi nhận quyết toán; không tự chuyển tiền ngân hàng." onConfirm={()=>execute(`checkouts/${checkout.id}/finalize`)}>
                <button className="ui-button primary" disabled={busy||invoices.some(row=>s(row,'status')!=='ISSUED')||deductions.some(row=>s(row,'status')!=='APPROVED')||outstanding>funds}>Xác nhận hoàn cọc & chốt trả phòng</button>
              </Popconfirm>
            </>:<p className="rental-success">Đã quyết toán. Hợp đồng kết thúc, lượt ở đã đóng và phòng đã trống. Các chứng từ được giữ lại để đối chiếu.</p>}
          </section>
        </>}
      </>}
      {contract&&<section className="product-panel"><h2>Lịch sử cọc</h2><Table columns={['Ngày','Nghiệp vụ','Số tiền','Tham chiếu']} rows={state.deposit_transactions.filter(row=>n(row,'contract_id')===cid).map(row=>({id:String(row.id),cells:[s(row,'transaction_date'),badge(s(row,'kind')),money(n(row,'amount')),s(row,'reference')]}))}/></section>}
      {invoice&&<section className="product-panel"><div className="panel-head"><h2>Chi tiết hóa đơn #{invoice.id}</h2><button className="text-button" onClick={()=>setSelectedInvoice(undefined)}>Đóng</button></div>
        <Table columns={['Khoản thu','Số lượng','Đơn giá','Thành tiền']} rows={state.invoice_items.filter(row=>n(row,'invoice_id')===invoice.id).map(row=>({id:String(row.id),cells:[s(row,'description'),n(row,'quantity'),money(n(row,'unit_price')),money(n(row,'amount'))]}))}/>
        <p>Tổng: <b>{money(n(invoice,'total_amount'))}</b> · Còn phải thu: <b>{money(n(invoice,'balance'))}</b></p>
        <h3>Phân bổ thanh toán</h3><Table columns={['Phiếu thu','Số tiền phân bổ','Ngày','Tham chiếu']} rows={state.payment_allocations.filter(row=>n(row,'invoice_id')===invoice.id).map(row=>{const payment=state.payments.find(payment=>payment.id===n(row,'payment_id'));return {id:String(row.id),cells:[`#${n(row,'payment_id')}`,money(n(row,'amount')),s(payment,'paid_at'),s(payment,'reference')]};})}/>
      </section>}
    </>}
    {dialog&&<RentalForm key={dialog.path} dialog={dialog} busy={busy} close={()=>{setDialog(undefined);mutation.reset();}} save={(path,data)=>execute(path,data)}/>}
  </div>;
}
