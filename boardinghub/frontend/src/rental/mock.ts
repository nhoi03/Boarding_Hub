import { blankState, n, s } from './types';
import type { BoardingHubApi, CommandData, RentalRow, RentalState, TableName } from './types';

// Explicit demo adapter. It never falls back from a failed HTTP request or modifies server data.
export function mockApi(owner:number):BoardingHubApi {
  const key=`boardinghub-rental-mock-v1:${owner}`;
  const read=():RentalState=>{const value=localStorage.getItem(key);return value?{...blankState(),...JSON.parse(value)}:blankState();};
  return {
    state:async()=>read(),
    execute:async(path,input={})=>{
      const state=read();
      const result=transition(state,owner,path,input);
      localStorage.setItem(key,JSON.stringify(state));
      return result;
    },
  };
}
export function transition(state:RentalState,owner:number,path:string,input:CommandData):{id?:number} {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
  const check=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);};
  const add=(table:TableName,values:Record<string,string|number|null>)=>{
    const record={id:Math.max(0,...state[table].map(row=>row.id))+1,owner_id:owner,...values} as RentalRow;
    state[table].push(record);return record;
  };
  const one=(table:TableName,id:number)=>{const row=state[table].find(row=>row.id===id);if(!row)throw new Error('Không tìm thấy bản ghi.');return row;};
  const children=(table:TableName,key:string,id:number)=>state[table].filter(row=>n(row,key)===id);
  const sum=(rows:RentalRow[],key:string)=>money(rows.reduce((total,row)=>total+n(row,key),0));
  const balance=(invoice:RentalRow)=>money(n(invoice,'total_amount')-sum(children('payment_allocations','invoice_id',invoice.id),'amount')-sum(children('deposit_allocations','invoice_id',invoice.id),'amount'));
  const deposit=(id:number)=>money(children('deposit_transactions','contract_id',id).reduce((total,row)=>total+(s(row,'kind')==='RECEIVE'?1:-1)*n(row,'amount'),0));
  const update=()=>{state.invoices.forEach(row=>row.balance=balance(row));state.contracts.forEach(row=>row.deposit_balance=deposit(row.id));};
  const last=(id:number,type:string)=>n(children('meter_readings','contract_id',id).filter(row=>s(row,'meter_type')===type).slice(-1)[0],'current_value');
  const price=(id:number,type:string)=>n(children('contract_services','contract_id',id).find(row=>s(row,'service_type')===type),'unit_price');
  const item=(invoice:number,description:string,quantity:number,unit_price:number)=>add('invoice_items',{invoice_id:invoice,description,quantity,unit_price,amount:money(quantity*unit_price)});
  const total=(invoice:RentalRow)=>invoice.total_amount=sum(children('invoice_items','invoice_id',invoice.id),'amount');
  const meter=(id:number,period_id:number|null,kind:string,meter_type:string,current:number,date:string)=>{
    const previous=kind==='CHECK_IN'?current:last(id,meter_type);
    check(current>=previous,'Chỉ số cuối phải từ chỉ số gần nhất trở lên.');
    return add('meter_readings',{contract_id:id,period_id,kind,meter_type,previous_value:previous,current_value:current,status:kind==='PERIOD'?'CONFIRMED':kind,reading_date:date});
  };
  const reference=(table:'payments'|'deposit_transactions',value:string)=>check(!state[table].some(row=>s(row,'reference')===value),'Mã tham chiếu đã tồn tại.');
  const [resource,idText,action]=path.split('/');const id=Number(idText);let created:number|undefined;
  if(resource==='rooms') {
    check(!state.rooms.some(row=>s(row,'property_name')===input.propertyName&&s(row,'room_number')===input.roomNumber),'Tên phòng đã tồn tại.');
    created=add('rooms',{property_name:String(input.propertyName),room_number:String(input.roomNumber),capacity:Number(input.capacity),status:'VACANT'}).id;
  } else if(resource==='persons') created=add('persons',{full_name:String(input.fullName),phone:String(input.phone),account_email:String(input.accountEmail||'')}).id;
  else if(resource==='contracts'&&!idText) {
    const room=one('rooms',Number(input.roomId));one('persons',Number(input.personId));
    check(room.status==='VACANT','Phòng đang có người ở.');check(!input.endDate||input.endDate>=input.startDate,'Ngày kết thúc không hợp lệ.');
    const contract=add('contracts',{room_id:room.id,person_id:Number(input.personId),start_date:String(input.startDate),end_date:input.endDate?String(input.endDate):null,rent_amount:Number(input.rent),deposit_due:Number(input.deposit),status:'DRAFT'});created=contract.id;
    add('rent_rates',{contract_id:created,effective_from:String(input.startDate),amount:Number(input.rent)});
    for(const [type,key] of [['ELECTRIC','electricityPrice'],['WATER','waterPrice'],['FIXED','servicePrice']]) {
      add('contract_services',{contract_id:created,service_type:type,unit_price:Number(input[key]),quantity:1});
      add('service_prices',{contract_id:created,service_type:type,unit_price:Number(input[key]),effective_from:String(input.startDate)});
    }
    add('occupancies',{contract_id:created,person_id:Number(input.personId),start_date:String(input.startDate),end_date:null,status:'PLANNED'});
  } else if(resource==='contracts') {
    const contract=one('contracts',id);
    if(action==='deposit') {
      check(contract.status==='DRAFT','Chỉ nhận cọc cho hợp đồng nháp.');check(Number(input.amount)>0&&deposit(id)+Number(input.amount)<=n(contract,'deposit_due'),'Số cọc vượt mức cần thu.');
      reference('deposit_transactions',String(input.reference));add('deposit_transactions',{contract_id:id,checkout_id:null,kind:'RECEIVE',amount:Number(input.amount),reference:String(input.reference),transaction_date:String(input.date)});
    } else if(action==='check-in') {
      check(contract.status==='DRAFT'&&!children('handovers','contract_id',id).length,'Đã bàn giao hoặc hợp đồng không còn nháp.');
      add('handovers',{contract_id:id,kind:'CHECK_IN',notes:String(input.notes),handover_date:s(contract,'start_date')});
      meter(id,null,'CHECK_IN','ELECTRIC',Number(input.electricity),s(contract,'start_date'));meter(id,null,'CHECK_IN','WATER',Number(input.water),s(contract,'start_date'));
    } else if(action==='activate') {
      if(contract.status==='ACTIVE')return {};
      check(contract.status==='DRAFT'&&children('handovers','contract_id',id).length&&deposit(id)>=n(contract,'deposit_due'),'Cần đủ cọc và biên bản bàn giao.');
      check(s(contract,'start_date')<=today&&(!contract.end_date||s(contract,'end_date')>=today),'Chưa đến ngày vào ở hoặc hợp đồng đã hết hạn.');
      const room=one('rooms',n(contract,'room_id'));check(room.status==='VACANT','Phòng đã có hợp đồng hiệu lực.');
      contract.status='ACTIVE';room.status='OCCUPIED';children('occupancies','contract_id',id).forEach(row=>row.status='ACTIVE');
    } else if(action==='periods') {
      check(contract.status==='ACTIVE'&&!children('checkouts','contract_id',id).length,'Hợp đồng không thể mở kỳ thu.');
      const periods=children('billing_periods','contract_id',id);
      check(String(input.period)>=s(contract,'start_date').slice(0,7)&&String(input.period)<=today.slice(0,7),'Kỳ thu ngoài phạm vi cho phép.');
      check(periods.every(row=>row.status==='LOCKED'&&s(row,'period_key')<String(input.period)),'Phải khóa kỳ trước và chọn kỳ mới hơn.');
      created=add('billing_periods',{contract_id:id,period_key:String(input.period),due_date:String(input.dueDate),status:'OPEN'}).id;
    } else if(action==='checkout') {
      check(contract.status==='ACTIVE'&&!children('checkouts','contract_id',id).length,'Không thể lập hồ sơ trả phòng.');
      check(String(input.date)>=s(contract,'start_date')&&String(input.date)<=today,'Ngày trả phòng không hợp lệ.');
      const periods=children('billing_periods','contract_id',id);check(periods.every(row=>row.status==='LOCKED'),'Cần khóa tất cả kỳ thu.');
      check(children('meter_readings','contract_id',id).every(row=>s(row,'reading_date')<=String(input.date)),'Ngày trả trước ngày chốt gần nhất.');
      check(!periods.some(row=>s(row,'period_key')===String(input.date).slice(0,7))||Number(input.finalRent)+Number(input.finalService)===0,'Kỳ này đã tính tiền thuê/dịch vụ.');
      const electric=last(id,'ELECTRIC'),water=last(id,'WATER');
      created=add('checkouts',{contract_id:id,checkout_date:String(input.date),status:'DRAFT',debt_amount:0,deduction_amount:0,applied_amount:0,refund_amount:0,remaining_due:0}).id;
      meter(id,null,'CHECK_OUT','ELECTRIC',Number(input.electricity),String(input.date));meter(id,null,'CHECK_OUT','WATER',Number(input.water),String(input.date));
      add('handovers',{contract_id:id,kind:'CHECK_OUT',notes:String(input.notes),handover_date:String(input.date)});
      const invoice=add('invoices',{contract_id:id,period_id:null,kind:'CHECKOUT',period_key:String(input.date).slice(0,7),due_date:String(input.date),status:'DRAFT',total_amount:0});
      item(invoice.id,'Tiền thuê cuối kỳ',1,Number(input.finalRent));item(invoice.id,'Dịch vụ cuối kỳ',1,Number(input.finalService));
      item(invoice.id,'Điện chốt trả phòng',Number(input.electricity)-electric,price(id,'ELECTRIC'));item(invoice.id,'Nước chốt trả phòng',Number(input.water)-water,price(id,'WATER'));total(invoice);
    } else throw new Error('Thao tác chưa được hỗ trợ.');
  } else if(resource==='periods') {
    const period=one('billing_periods',id),cid=n(period,'contract_id');check(one('contracts',cid).status==='ACTIVE','Hợp đồng không còn hiệu lực.');
    if(action==='readings') {
      check(period.status==='OPEN'&&!children('meter_readings','period_id',id).length,'Kỳ đã khóa hoặc đã ghi chỉ số.');
      const end=new Date(Number(s(period,'period_key').slice(0,4)),Number(s(period,'period_key').slice(5)),0).getDate();const at=`${s(period,'period_key')}-${end}`;const date=at>today?today:at;
      meter(cid,id,'PERIOD','ELECTRIC',Number(input.electricity),date);meter(cid,id,'PERIOD','WATER',Number(input.water),date);
    } else if(action==='draft-invoice') {
      const existing=children('invoices','period_id',id)[0];if(existing)return {id:existing.id};
      const readings=children('meter_readings','period_id',id);check(period.status==='OPEN'&&readings.length===2,'Cần chốt điện nước trước.');
      const invoice=add('invoices',{contract_id:cid,period_id:id,kind:'REGULAR',period_key:s(period,'period_key'),due_date:s(period,'due_date'),status:'DRAFT',total_amount:0});created=invoice.id;
      item(invoice.id,'Tiền thuê tháng',1,n(one('contracts',cid),'rent_amount'));
      readings.forEach(row=>item(invoice.id,s(row,'meter_type')==='ELECTRIC'?'Điện (kWh)':'Nước (m³)',n(row,'current_value')-n(row,'previous_value'),price(cid,s(row,'meter_type'))));
      item(invoice.id,'Dịch vụ cố định',1,price(cid,'FIXED'));total(invoice);
    } else if(action==='lock') {check(children('invoices','period_id',id).some(row=>row.status==='ISSUED'),'Cần phát hành hóa đơn.');period.status='LOCKED';}
    else throw new Error('Thao tác chưa được hỗ trợ.');
  } else if(resource==='invoices'&&action==='issue') {
    const invoice=one('invoices',id);check(one('contracts',n(invoice,'contract_id')).status==='ACTIVE','Hợp đồng không còn hiệu lực.');
    if(invoice.kind==='CHECKOUT') {
      const checkout=children('checkouts','contract_id',n(invoice,'contract_id'))[0];check(children('checkout_deductions','checkout_id',checkout.id).every(row=>row.status==='APPROVED'),'Cần duyệt tất cả khấu trừ.');
    }
    invoice.status='ISSUED';
  } else if(resource==='payments') {
    const invoice=one('invoices',Number(input.invoiceId));check(invoice.status==='ISSUED'&&Number(input.amount)>0&&Number(input.amount)<=balance(invoice),'Số tiền vượt công nợ hoặc hóa đơn chưa phát hành.');
    reference('payments',String(input.reference));const payment=add('payments',{contract_id:n(invoice,'contract_id'),amount:Number(input.amount),reference:String(input.reference),paid_at:String(input.date)});
    add('payment_allocations',{payment_id:payment.id,invoice_id:invoice.id,amount:Number(input.amount)});
  } else if(resource==='checkouts') {
    const checkout=one('checkouts',id),cid=n(checkout,'contract_id'),invoice=children('invoices','contract_id',cid).find(row=>row.kind==='CHECKOUT')!;
    if(action==='deductions') {
      check(checkout.status==='DRAFT'&&invoice.status==='DRAFT','Quyết toán/hóa đơn đã phát hành.');created=add('checkout_deductions',{checkout_id:id,description:String(input.description),amount:Number(input.amount),status:'PENDING'}).id;
    } else if(action==='finalize') {
      if(checkout.status==='FINALIZED')return {};
      const invoices=children('invoices','contract_id',cid),deductions=children('checkout_deductions','checkout_id',id);
      check(invoices.every(row=>row.status==='ISSUED')&&deductions.every(row=>row.status==='APPROVED'),'Cần phát hành hóa đơn và duyệt khấu trừ.');
      const debt=money(invoices.reduce((value,row)=>value+balance(row),0)),available=deposit(cid);check(debt<=available,'Cọc không đủ cấn nợ. Cần ghi thu thêm trước khi quyết toán.');
      const applied=Math.min(debt,available),refund=money(available-applied);
      if(applied>0){const transaction=add('deposit_transactions',{contract_id:cid,checkout_id:id,kind:'APPLY_TO_DEBT',amount:applied,reference:`CHECKOUT-${id}-APPLY`,transaction_date:s(checkout,'checkout_date')});let left=applied;for(const inv of invoices){const amount=Math.min(left,balance(inv));if(amount>0)add('deposit_allocations',{transaction_id:transaction.id,invoice_id:inv.id,amount});left=money(left-amount);}}
      if(refund>0)add('deposit_transactions',{contract_id:cid,checkout_id:id,kind:'REFUND',amount:refund,reference:`CHECKOUT-${id}-REFUND`,transaction_date:s(checkout,'checkout_date')});
      Object.assign(checkout,{status:'FINALIZED',debt_amount:debt,deduction_amount:sum(deductions,'amount'),applied_amount:applied,refund_amount:refund,remaining_due:0});
      const contract=one('contracts',cid);contract.status='TERMINATED';contract.end_date=checkout.checkout_date;one('rooms',n(contract,'room_id')).status='VACANT';children('occupancies','contract_id',cid).forEach(row=>{row.status='ENDED';row.end_date=checkout.checkout_date;});
    } else throw new Error('Thao tác chưa được hỗ trợ.');
  } else if(resource==='deductions'&&action==='approve') {
    const deduction=one('checkout_deductions',id);if(deduction.status==='APPROVED')return {};
    const checkout=one('checkouts',n(deduction,'checkout_id')),invoice=children('invoices','contract_id',n(checkout,'contract_id')).find(row=>row.kind==='CHECKOUT')!;
    check(checkout.status==='DRAFT'&&invoice.status==='DRAFT','Quyết toán/hóa đơn đã chốt.');deduction.status='APPROVED';item(invoice.id,`Khấu trừ: ${s(deduction,'description')}`,1,n(deduction,'amount'));total(invoice);
  } else throw new Error('Thao tác chưa được hỗ trợ.');
  update();return {id:created};
}
