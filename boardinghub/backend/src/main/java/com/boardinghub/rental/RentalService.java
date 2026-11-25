package com.boardinghub.rental;

import static com.boardinghub.rental.RentalRequests.*;
import java.math.*;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(isolation=Isolation.READ_COMMITTED)
public class RentalService {
    private final RentalRepository db;
    private final com.boardinghub.auth.UserRepository accounts;
    public RentalService(RentalRepository db,com.boardinghub.auth.UserRepository accounts) { this.db=db; this.accounts=accounts; }
    static Map<String,Object> row(Object... entries) {
        var result=new LinkedHashMap<String,Object>();
        for(int i=0;i<entries.length;i+=2) result.put(entries[i].toString(),entries[i+1]);
        return result;
    }
    static long number(Map<String,Object> row,String key) { return ((Number)row.get(key)).longValue(); }
    static BigDecimal money(Map<String,Object> row,String key) { return new BigDecimal(row.get(key).toString()); }
    static String text(Map<String,Object> row,String key) { return Objects.toString(row.get(key),""); }
    static LocalDate date(Map<String,Object> row,String key) { return LocalDate.parse(row.get(key).toString().substring(0,10)); }
    static BigDecimal rounded(BigDecimal amount) { return amount.setScale(2,RoundingMode.HALF_UP); }
    static void require(boolean condition,String message) { if(!condition) throw new ResponseStatusException(HttpStatus.CONFLICT,message); }
    private List<Map<String,Object>> children(String table,long owner,String key,long id) {
        return db.find(table,owner,key,id);
    }
    private Map<String,Object> contract(long owner,long id,String status) {
        var contract=db.one("contracts",owner,id,true);
        if(status!=null) require(text(contract,"status").equals(status),"Trạng thái hợp đồng không cho phép thao tác này.");
        return contract;
    }
    private BigDecimal sum(List<Map<String,Object>> rows,String key) { return rows.stream().map(item->money(item,key)).reduce(BigDecimal.ZERO,BigDecimal::add); }
    private BigDecimal deposit(long owner,long contractId) {
        return children("deposit_transactions",owner,"contract_id",contractId).stream()
            .map(item->text(item,"kind").equals("RECEIVE")?money(item,"amount"):money(item,"amount").negate())
            .reduce(BigDecimal.ZERO,BigDecimal::add);
    }
    private BigDecimal invoiceBalance(long owner,Map<String,Object> invoice) {
        long id=number(invoice,"id");
        return money(invoice,"total_amount").subtract(sum(children("payment_allocations",owner,"invoice_id",id),"amount"))
            .subtract(sum(children("deposit_allocations",owner,"invoice_id",id),"amount"));
    }
    @Transactional(readOnly=true)
    public Map<String,List<Map<String,Object>>> state(long owner) {
        var result=db.snapshot(owner);
        var allocated=new HashMap<Long,BigDecimal>();
        for(String table:List.of("payment_allocations","deposit_allocations")) for(var allocation:result.get(table))
            allocated.merge(number(allocation,"invoice_id"),money(allocation,"amount"),BigDecimal::add);
        var deposits=new HashMap<Long,BigDecimal>();
        for(var transaction:result.get("deposit_transactions")) deposits.merge(number(transaction,"contract_id"),
            text(transaction,"kind").equals("RECEIVE")?money(transaction,"amount"):money(transaction,"amount").negate(),BigDecimal::add);
        result.get("invoices").forEach(invoice->invoice.put("balance",money(invoice,"total_amount").subtract(allocated.getOrDefault(number(invoice,"id"),BigDecimal.ZERO))));
        result.get("contracts").forEach(contract->contract.put("deposit_balance",deposits.getOrDefault(number(contract,"id"),BigDecimal.ZERO)));
        return result;
    }
    @Transactional(readOnly=true)
    public Map<String,List<Map<String,Object>>> tenantState(String email) {
        // Match only the authenticated email, never a client-supplied person/account id.
        var people=db.tenantPersons(email);
        var result=new LinkedHashMap<String,List<Map<String,Object>>>();
        for(String name:List.of("rooms","contracts","persons","invoices","invoice_items","payments","payment_allocations","checkouts")) result.put(name,new ArrayList<>());
        for(var person:people) {
            long owner=number(person,"owner_id"),personId=number(person,"id");
            result.get("persons").add(person);
            for(var contract:children("contracts",owner,"person_id",personId)) {
                result.get("contracts").add(contract);
                var room=db.one("rooms",owner,number(contract,"room_id"),false);
                if(result.get("rooms").stream().noneMatch(item->number(item,"id")==number(room,"id"))) result.get("rooms").add(room);
                for(var invoice:children("invoices",owner,"contract_id",number(contract,"id"))) if(text(invoice,"status").equals("ISSUED")) {
                    invoice.put("balance",invoiceBalance(owner,invoice)); result.get("invoices").add(invoice);
                    result.get("invoice_items").addAll(children("invoice_items",owner,"invoice_id",number(invoice,"id")));
                }
                result.get("checkouts").addAll(children("checkouts",owner,"contract_id",number(contract,"id")));
            }
        }
        return result;
    }
    public long createRoom(long owner,Room input) {
        return db.insert("rooms",owner,row("property_name",input.propertyName().strip(),"room_number",input.roomNumber().strip(),"capacity",input.capacity(),"status","VACANT"));
    }
    public long createPerson(long owner,Person input) {
        String email=input.accountEmail()==null||input.accountEmail().isBlank()?null:input.accountEmail().strip().toLowerCase(Locale.ROOT);
        Long accountId=null;
        if(email!=null) {
            var profile=accounts.findByEmail(email).orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Email chưa có tài khoản người thuê. Hãy đăng ký tài khoản trước hoặc để trống email liên kết.")).profile();
            require(profile.role().equals("USER"),"Chỉ liên kết hồ sơ người thuê với tài khoản người dùng thường.");
            accountId=profile.id();
        }
        return db.insert("persons",owner,row("full_name",input.fullName().strip(),"phone",input.phone().strip(),"account_email",email,"account_id",accountId));
    }
    public long createContract(long owner,Contract input) {
        var room=db.one("rooms",owner,input.roomId(),true); db.one("persons",owner,input.personId(),false);
        require(text(room,"status").equals("VACANT"),"Phòng đang có người ở.");
        require(input.endDate()==null||!input.endDate().isBefore(input.startDate()),"Ngày kết thúc phải sau ngày bắt đầu.");
        long id=db.insert("contracts",owner,row("room_id",input.roomId(),"person_id",input.personId(),"start_date",input.startDate(),"end_date",input.endDate(),
            "rent_amount",input.rent(),"deposit_due",input.deposit(),"status","DRAFT"));
        db.insert("rent_rates",owner,row("contract_id",id,"effective_from",input.startDate(),"amount",input.rent()));
        for(var entry:Map.of("ELECTRIC",input.electricityPrice(),"WATER",input.waterPrice(),"FIXED",input.servicePrice()).entrySet()) {
            db.insert("contract_services",owner,row("contract_id",id,"service_type",entry.getKey(),"unit_price",entry.getValue(),"quantity",BigDecimal.ONE));
            db.insert("service_prices",owner,row("contract_id",id,"service_type",entry.getKey(),"effective_from",input.startDate(),"unit_price",entry.getValue()));
        }
        db.insert("occupancies",owner,row("contract_id",id,"person_id",input.personId(),"start_date",input.startDate(),"status","PLANNED"));
        return id;
    }
    public void receiveDeposit(long owner,long id,Deposit input) {
        var contract=contract(owner,id,"DRAFT");
        require(deposit(owner,id).add(input.amount()).compareTo(money(contract,"deposit_due"))<=0,"Cọc thực nhận vượt cọc phải nộp.");
        require(!input.reference().strip().toUpperCase(Locale.ROOT).startsWith("CHECKOUT-"),"Mã CHECKOUT- được dành cho chứng từ quyết toán tự động.");
        db.insert("deposit_transactions",owner,row("contract_id",id,"kind","RECEIVE","amount",input.amount(),"reference",input.reference().strip(),"transaction_date",input.date()));
    }
    private void reading(long owner,long id,Long period,String kind,String meter,BigDecimal previous,BigDecimal current,LocalDate at) {
        require(current.compareTo(previous)>=0,"Chỉ số "+meter+" phải từ chỉ số gần nhất trở lên.");
        db.insert("meter_readings",owner,row("contract_id",id,"period_id",period,"kind",kind,"meter_type",meter,
            "previous_value",previous,"current_value",current,"status",kind.equals("PERIOD")?"CONFIRMED":kind,"reading_date",at));
    }
    public void checkIn(long owner,long id,CheckIn input) {
        var contract=contract(owner,id,"DRAFT");
        require(children("handovers",owner,"contract_id",id).isEmpty(),"Đã có biên bản nhận phòng.");
        db.insert("handovers",owner,row("contract_id",id,"kind","CHECK_IN","notes",input.notes().strip(),"handover_date",date(contract,"start_date")));
        reading(owner,id,null,"CHECK_IN","ELECTRIC",input.electricity(),input.electricity(),date(contract,"start_date"));
        reading(owner,id,null,"CHECK_IN","WATER",input.water(),input.water(),date(contract,"start_date"));
    }
    public void activate(long owner,long id) {
        var contract=contract(owner,id,null);
        if(text(contract,"status").equals("ACTIVE")) return;
        require(text(contract,"status").equals("DRAFT"),"Chỉ kích hoạt hợp đồng nháp.");
        var room=db.one("rooms",owner,number(contract,"room_id"),true);
        require(text(room,"status").equals("VACANT"),"Phòng đã có hợp đồng khác đang hiệu lực.");
        require(!date(contract,"start_date").isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))),"Chưa đến ngày vào ở.");
        require(contract.get("end_date")==null||!date(contract,"end_date").isBefore(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))),"Hợp đồng đã quá ngày kết thúc.");
        require(deposit(owner,id).compareTo(money(contract,"deposit_due"))>=0,"Cần nhận đủ tiền cọc trước khi kích hoạt.");
        require(children("handovers",owner,"contract_id",id).stream().anyMatch(item->text(item,"kind").equals("CHECK_IN")),"Cần biên bản bàn giao và chỉ số đầu vào.");
        db.update("contracts",owner,id,row("status","ACTIVE")); db.update("rooms",owner,number(room,"id"),row("status","OCCUPIED"));
        for(var occupancy:children("occupancies",owner,"contract_id",id)) db.update("occupancies",owner,number(occupancy,"id"),row("status","ACTIVE"));
    }
    public long openPeriod(long owner,long id,Period input) {
        var contract=contract(owner,id,"ACTIVE");
        require(children("checkouts",owner,"contract_id",id).isEmpty(),"Đang quyết toán trả phòng; không mở thêm kỳ thu.");
        YearMonth month=YearMonth.parse(input.period());
        require(!month.isBefore(YearMonth.from(date(contract,"start_date"))),"Kỳ thu trước ngày vào ở.");
        require(!month.isAfter(YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh"))),"Không mở kỳ thu trong tương lai.");
        require(contract.get("end_date")==null||!month.isAfter(YearMonth.from(date(contract,"end_date"))),"Kỳ thu sau thời hạn hợp đồng.");
        var periods=children("billing_periods",owner,"contract_id",id);
        require(periods.stream().allMatch(item->text(item,"status").equals("LOCKED")),"Khóa kỳ trước trước khi mở kỳ mới.");
        require(periods.stream().allMatch(item->text(item,"period_key").compareTo(input.period())<0),"Kỳ mới phải sau kỳ gần nhất.");
        require(!input.dueDate().isBefore(month.atDay(1)),"Hạn thu phải từ đầu kỳ trở đi.");
        return db.insert("billing_periods",owner,row("contract_id",id,"period_key",input.period(),"due_date",input.dueDate(),"status","OPEN"));
    }
    private BigDecimal lastMeter(long owner,long id,String meter) {
        return children("meter_readings",owner,"contract_id",id).stream().filter(item->text(item,"meter_type").equals(meter))
            .max(Comparator.comparingLong(item->number(item,"id"))).map(item->money(item,"current_value"))
            .orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Thiếu chỉ số đầu vào."));
    }
    public void confirmReadings(long owner,long periodId,Readings input) {
        var period=db.one("billing_periods",owner,periodId,false); long id=number(period,"contract_id"); contract(owner,id,"ACTIVE");
        period=db.one("billing_periods",owner,periodId,true);
        require(text(period,"status").equals("OPEN"),"Kỳ thu đã khóa.");
        require(children("meter_readings",owner,"period_id",periodId).isEmpty(),"Đã xác nhận chỉ số kỳ này.");
        require(children("invoices",owner,"period_id",periodId).isEmpty(),"Đã tạo hóa đơn kỳ này.");
        LocalDate at=YearMonth.parse(text(period,"period_key")).atEndOfMonth();
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        if(at.isAfter(today)) at=today;
        reading(owner,id,periodId,"PERIOD","ELECTRIC",lastMeter(owner,id,"ELECTRIC"),input.electricity(),at);
        reading(owner,id,periodId,"PERIOD","WATER",lastMeter(owner,id,"WATER"),input.water(),at);
    }
    private BigDecimal price(long owner,long contract,String type,LocalDate at) {
        return children("service_prices",owner,"contract_id",contract).stream()
            .filter(item->text(item,"service_type").equals(type)&&!date(item,"effective_from").isAfter(at))
            .max(Comparator.comparing(item->date(item,"effective_from"))).map(item->money(item,"unit_price"))
            .orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Thiếu biểu giá hiệu lực."));
    }
    private void item(long owner,long invoice,String description,BigDecimal quantity,BigDecimal unitPrice) {
        db.insert("invoice_items",owner,row("invoice_id",invoice,"description",description,"quantity",quantity,"unit_price",unitPrice,"amount",rounded(quantity.multiply(unitPrice))));
    }
    private void total(long owner,long invoice) {
        db.update("invoices",owner,invoice,row("total_amount",sum(children("invoice_items",owner,"invoice_id",invoice),"amount")));
    }
    public long draftInvoice(long owner,long periodId) {
        var period=db.one("billing_periods",owner,periodId,false); long id=number(period,"contract_id"); contract(owner,id,"ACTIVE");
        require(text(period,"status").equals("OPEN"),"Kỳ thu đã khóa.");
        var existing=children("invoices",owner,"period_id",periodId); if(!existing.isEmpty()) return number(existing.getFirst(),"id");
        var readings=children("meter_readings",owner,"period_id",periodId);
        require(readings.size()==2,"Cần xác nhận chỉ số điện và nước.");
        LocalDate at=YearMonth.parse(text(period,"period_key")).atEndOfMonth();
        long invoice=db.insert("invoices",owner,row("contract_id",id,"period_id",periodId,"kind","REGULAR","period_key",text(period,"period_key"),"due_date",date(period,"due_date"),"status","DRAFT","total_amount",BigDecimal.ZERO));
        BigDecimal rent=children("rent_rates",owner,"contract_id",id).stream().filter(rate->!date(rate,"effective_from").isAfter(at))
            .max(Comparator.comparing(rate->date(rate,"effective_from"))).map(rate->money(rate,"amount")).orElseThrow();
        item(owner,invoice,"Tiền thuê tháng "+text(period,"period_key"),BigDecimal.ONE,rent);
        for(var meter:readings) item(owner,invoice,text(meter,"meter_type").equals("ELECTRIC")?"Điện (kWh)":"Nước (m³)",money(meter,"current_value").subtract(money(meter,"previous_value")),price(owner,id,text(meter,"meter_type"),at));
        item(owner,invoice,"Dịch vụ cố định",BigDecimal.ONE,price(owner,id,"FIXED",at)); total(owner,invoice); return invoice;
    }
    public void issue(long owner,long invoiceId) {
        var invoice=db.one("invoices",owner,invoiceId,false); long id=number(invoice,"contract_id"); contract(owner,id,"ACTIVE");
        invoice=db.one("invoices",owner,invoiceId,true);
        if(text(invoice,"status").equals("ISSUED")) return;
        if(text(invoice,"kind").equals("CHECKOUT")) {
            var checkout=children("checkouts",owner,"contract_id",id).getFirst();
            require(children("checkout_deductions",owner,"checkout_id",number(checkout,"id")).stream().allMatch(item->text(item,"status").equals("APPROVED")),"Cần duyệt tất cả khấu trừ trước khi phát hành.");
        }
        db.update("invoices",owner,invoiceId,row("status","ISSUED"));
    }
    public void pay(long owner,Payment input) {
        var invoice=db.one("invoices",owner,input.invoiceId(),false); long id=number(invoice,"contract_id"); contract(owner,id,null);
        invoice=db.one("invoices",owner,input.invoiceId(),true);
        require(text(invoice,"status").equals("ISSUED"),"Chỉ ghi thu hóa đơn đã phát hành.");
        require(input.amount().compareTo(invoiceBalance(owner,invoice))<=0,"Số tiền vượt công nợ còn lại.");
        long payment=db.insert("payments",owner,row("contract_id",id,"amount",input.amount(),"paid_at",input.date(),"reference",input.reference().strip()));
        db.insert("payment_allocations",owner,row("payment_id",payment,"invoice_id",input.invoiceId(),"amount",input.amount()));
    }
    public void lockPeriod(long owner,long periodId) {
        var period=db.one("billing_periods",owner,periodId,false); contract(owner,number(period,"contract_id"),"ACTIVE");
        var invoices=children("invoices",owner,"period_id",periodId);
        require(invoices.size()==1&&text(invoices.getFirst(),"status").equals("ISSUED"),"Cần phát hành hóa đơn trước khi khóa kỳ.");
        db.update("billing_periods",owner,periodId,row("status","LOCKED"));
    }
    public long beginCheckout(long owner,long id,Checkout input) {
        var contract=contract(owner,id,"ACTIVE");
        require(children("checkouts",owner,"contract_id",id).isEmpty(),"Hợp đồng đã có hồ sơ trả phòng.");
        require(!input.date().isBefore(date(contract,"start_date")),"Ngày trả trước ngày vào ở.");
        var periods=children("billing_periods",owner,"contract_id",id);
        require(periods.stream().allMatch(period->text(period,"status").equals("LOCKED")),"Phải phát hành và khóa các kỳ thu đang mở trước khi trả phòng.");
        for(var meter:children("meter_readings",owner,"contract_id",id)) require(!date(meter,"reading_date").isAfter(input.date()),"Ngày trả phải từ ngày chốt chỉ số gần nhất trở đi.");
        String month=YearMonth.from(input.date()).toString();
        if(periods.stream().anyMatch(period->text(period,"period_key").equals(month)))
            require(input.finalRent().signum()==0&&input.finalService().signum()==0,"Kỳ tháng này đã tính tiền thuê/dịch vụ. Khoản cuối kỳ phải bằng 0 để tránh tính trùng.");
        long checkout=db.insert("checkouts",owner,row("contract_id",id,"checkout_date",input.date(),"status","DRAFT",
            "debt_amount",0,"deduction_amount",0,"applied_amount",0,"refund_amount",0,"remaining_due",0));
        var electric=lastMeter(owner,id,"ELECTRIC"); var water=lastMeter(owner,id,"WATER");
        reading(owner,id,null,"CHECK_OUT","ELECTRIC",electric,input.electricity(),input.date());
        reading(owner,id,null,"CHECK_OUT","WATER",water,input.water(),input.date());
        db.insert("handovers",owner,row("contract_id",id,"kind","CHECK_OUT","notes",input.notes().strip(),"handover_date",input.date()));
        long invoice=db.insert("invoices",owner,row("contract_id",id,"kind","CHECKOUT","period_key",month,"due_date",input.date(),"status","DRAFT","total_amount",0));
        item(owner,invoice,"Tiền thuê cuối kỳ (đã đối chiếu)",BigDecimal.ONE,input.finalRent());
        item(owner,invoice,"Dịch vụ cuối kỳ (đã đối chiếu)",BigDecimal.ONE,input.finalService());
        item(owner,invoice,"Điện chốt trả phòng",input.electricity().subtract(electric),price(owner,id,"ELECTRIC",input.date()));
        item(owner,invoice,"Nước chốt trả phòng",input.water().subtract(water),price(owner,id,"WATER",input.date()));
        total(owner,invoice); return checkout;
    }
    private Map<String,Object> checkoutInvoice(long owner,long contract) {
        return children("invoices",owner,"contract_id",contract).stream().filter(item->text(item,"kind").equals("CHECKOUT")).findFirst().orElseThrow();
    }
    public long deduction(long owner,long checkoutId,Deduction input) {
        var checkout=db.one("checkouts",owner,checkoutId,false); contract(owner,number(checkout,"contract_id"),"ACTIVE");
        require(text(checkout,"status").equals("DRAFT"),"Quyết toán đã chốt.");
        require(text(checkoutInvoice(owner,number(checkout,"contract_id")),"status").equals("DRAFT"),"Hóa đơn cuối đã phát hành; không thêm khấu trừ.");
        return db.insert("checkout_deductions",owner,row("checkout_id",checkoutId,"description",input.description().strip(),"amount",input.amount(),"status","PENDING"));
    }
    public void approveDeduction(long owner,long deductionId) {
        var deduction=db.one("checkout_deductions",owner,deductionId,false);
        var checkout=db.one("checkouts",owner,number(deduction,"checkout_id"),false); contract(owner,number(checkout,"contract_id"),"ACTIVE");
        deduction=db.one("checkout_deductions",owner,deductionId,true);
        if(text(deduction,"status").equals("APPROVED")) return;
        var invoice=checkoutInvoice(owner,number(checkout,"contract_id"));
        require(text(invoice,"status").equals("DRAFT"),"Hóa đơn đã phát hành; không sửa khấu trừ.");
        db.update("checkout_deductions",owner,deductionId,row("status","APPROVED"));
        item(owner,number(invoice,"id"),"Khấu trừ: "+text(deduction,"description"),BigDecimal.ONE,money(deduction,"amount")); total(owner,number(invoice,"id"));
    }
    public void finalizeCheckout(long owner,long checkoutId) {
        var checkout=db.one("checkouts",owner,checkoutId,false); long id=number(checkout,"contract_id");
        var contract=contract(owner,id,null); checkout=db.one("checkouts",owner,checkoutId,true);
        if(text(checkout,"status").equals("FINALIZED")) return;
        require(text(contract,"status").equals("ACTIVE"),"Hợp đồng không còn hiệu lực.");
        var deductions=children("checkout_deductions",owner,"checkout_id",checkoutId);
        require(deductions.stream().allMatch(item->text(item,"status").equals("APPROVED")),"Còn khấu trừ chưa duyệt.");
        var invoices=children("invoices",owner,"contract_id",id);
        require(invoices.stream().allMatch(item->text(item,"status").equals("ISSUED")),"Cần phát hành tất cả hóa đơn trước quyết toán.");
        BigDecimal debt=invoices.stream().map(invoice->invoiceBalance(owner,invoice)).reduce(BigDecimal.ZERO,BigDecimal::add);
        BigDecimal available=deposit(owner,id), applied=available.min(debt), refund=available.subtract(applied), remaining=debt.subtract(applied);
        // Financial close is all-or-nothing: collect remaining debt before releasing this room.
        require(remaining.signum()==0,"Cọc không đủ cấn nợ. Cần ghi thu thêm "+remaining.toPlainString()+" trước khi chốt trả phòng.");
        if(applied.signum()>0) {
            long transaction=db.insert("deposit_transactions",owner,row("contract_id",id,"checkout_id",checkoutId,"kind","APPLY_TO_DEBT","amount",applied,
                "reference","CHECKOUT-"+checkoutId+"-APPLY","transaction_date",date(checkout,"checkout_date")));
            BigDecimal unallocated=applied;
            for(var invoice:invoices) {
                var allocation=invoiceBalance(owner,invoice).min(unallocated);
                if(allocation.signum()>0) db.insert("deposit_allocations",owner,row("transaction_id",transaction,"invoice_id",number(invoice,"id"),"amount",allocation));
                unallocated=unallocated.subtract(allocation);
            }
        }
        if(refund.signum()>0) db.insert("deposit_transactions",owner,row("contract_id",id,"checkout_id",checkoutId,"kind","REFUND","amount",refund,
            "reference","CHECKOUT-"+checkoutId+"-REFUND","transaction_date",date(checkout,"checkout_date")));
        db.update("checkouts",owner,checkoutId,row("status","FINALIZED","debt_amount",debt,"deduction_amount",sum(deductions,"amount"),
            "applied_amount",applied,"refund_amount",refund,"remaining_due",remaining));
        db.update("contracts",owner,id,row("status","TERMINATED","end_date",date(checkout,"checkout_date")));
        db.one("rooms",owner,number(contract,"room_id"),true); db.update("rooms",owner,number(contract,"room_id"),row("status","VACANT"));
        for(var occupancy:children("occupancies",owner,"contract_id",id)) db.update("occupancies",owner,number(occupancy,"id"),row("status","ENDED","end_date",date(checkout,"checkout_date")));
    }
}
