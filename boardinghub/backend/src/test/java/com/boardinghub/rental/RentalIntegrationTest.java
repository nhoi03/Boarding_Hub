package com.boardinghub.rental;

import static com.boardinghub.rental.RentalRequests.*;
import static com.boardinghub.rental.RentalService.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.boardinghub.auth.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:rental;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password=",
    "spring.flyway.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop","BOARDINGHUB_ADMIN_EMAIL=","BOARDINGHUB_ADMIN_PASSWORD="})
@AutoConfigureMockMvc
@Sql(scripts={"classpath:db/mysql/V2__rental_workflows.sql","classpath:db/mysql/V3__rental_access_indexes.sql"},executionPhase=Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class RentalIntegrationTest {
    @Autowired RentalService service;
    @Autowired RentalRepository db;
    @Autowired AccountService accounts;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    long owner;
    final LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    final LocalDate start=today.minusMonths(2).withDayOfMonth(1);
    static BigDecimal bd(String value) { return new BigDecimal(value); }
    @BeforeEach void clean() {
        for(String table:List.of("deposit_allocations","deposit_transactions","payment_allocations","payments","invoice_items","checkout_deductions","checkouts","invoices","meter_readings","billing_periods","handovers","occupancies","service_prices","contract_services","rent_rates","contracts","persons","rooms")) jdbc.update("DELETE FROM rental_"+table);
        users.deleteAll(); owner=accounts.registerOwner("Owner","owner@example.com","password123").id();
        accounts.register("Tenant","tenant@example.com","password123");
    }
    long draft(String deposit) {
        long room=service.createRoom(owner,new Room("Nhà A","A"+UUID.randomUUID().toString().substring(0,8),2));
        return draftInRoom(room,deposit);
    }
    long draftInRoom(long room,String deposit) {
        long person=service.createPerson(owner,new Person("Người thuê","0901234567","tenant@example.com"));
        return service.createContract(owner,new Contract(room,person,start,start.plusYears(1),bd("1000000"),bd(deposit),bd("3500"),bd("15000"),bd("100000")));
    }
    void prepare(long id,String deposit) {
        if(bd(deposit).signum()>0)service.receiveDeposit(owner,id,new Deposit(bd(deposit),"DEPOSIT-"+id,today));
        service.checkIn(owner,id,new CheckIn(bd("100"),bd("10"),"Bàn giao đủ tài sản"));
    }
    long active(String deposit) { long id=draft(deposit);prepare(id,deposit);service.activate(owner,id);return id; }
    long bill(long contract) {
        String month=YearMonth.from(today.minusMonths(1)).toString();
        long period=service.openPeriod(owner,contract,new RentalRequests.Period(month,today));
        service.confirmReadings(owner,period,new Readings(bd("110"),bd("12")));
        long invoice=service.draftInvoice(owner,period);service.issue(owner,invoice);service.lockPeriod(owner,period);return invoice;
    }
    @Test void completeLifecyclePreservesLedgerAndClosesRoomExactlyOnce() {
        long contract=active("5000000");long invoice=bill(contract);
        assertThat(money(db.one("invoices",owner,invoice,false),"total_amount")).isEqualByComparingTo("1165000");
        service.pay(owner,new Payment(invoice,bd("165000"),"RECEIPT-1",today));
        long checkout=service.beginCheckout(owner,contract,new Checkout(today,bd("115"),bd("13"),bd("1000000"),bd("100000"),"Đối chiếu trả phòng"));
        long deduction=service.deduction(owner,checkout,new Deduction("Sửa khóa",bd("100000")));
        service.approveDeduction(owner,deduction);service.approveDeduction(owner,deduction);
        long finalInvoice=db.all("invoices",owner).stream().filter(row->text(row,"kind").equals("CHECKOUT")).mapToLong(row->number(row,"id")).findFirst().orElseThrow();
        service.issue(owner,finalInvoice);service.finalizeCheckout(owner,checkout);service.finalizeCheckout(owner,checkout);
        var state=service.state(owner);var settled=db.one("checkouts",owner,checkout,false);
        assertThat(money(settled,"applied_amount")).isEqualByComparingTo("2232500");
        assertThat(money(settled,"refund_amount")).isEqualByComparingTo("2767500");
        assertThat(state.get("invoices")).allSatisfy(row->assertThat(money(row,"balance")).isZero());
        assertThat(state.get("contracts").getFirst().get("status")).isEqualTo("TERMINATED");
        assertThat(state.get("rooms").getFirst().get("status")).isEqualTo("VACANT");
        assertThat(state.get("occupancies").getFirst().get("status")).isEqualTo("ENDED");
        assertThat(state.get("deposit_transactions")).hasSize(3);
        assertThat(money(state.get("contracts").getFirst(),"deposit_balance")).isZero();
    }
    @Test void activationRequiresDepositAndHandoverAndIsIdempotent() {
        long id=draft("5000000");
        assertThatThrownBy(()->service.activate(owner,id)).isInstanceOf(ResponseStatusException.class);
        assertThat(db.one("contracts",owner,id,false).get("status")).isEqualTo("DRAFT");
        prepare(id,"5000000");service.activate(owner,id);service.activate(owner,id);
        assertThat(db.all("occupancies",owner)).hasSize(1);assertThat(db.all("deposit_transactions",owner)).hasSize(1);
    }
    @Test void ownerIsolationAndTenantVisibilityAreEnforcedByServer() throws Exception {
        long contract=active("0");
        long another=accounts.registerOwner("Another","another@example.com","password123").id();
        assertThat(service.state(another).get("contracts")).isEmpty();
        assertThatThrownBy(()->service.activate(another,contract)).isInstanceOf(ResponseStatusException.class);
        assertThat(service.tenantState("unrelated@example.com").get("contracts")).isEmpty();
        mvc.perform(get("/api/v1/rental/state").with(user("tenant@example.com").roles("USER"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/rental/my").with(user("tenant@example.com").roles("USER"))).andExpect(status().isOk()).andExpect(jsonPath("$.contracts.length()").value(1));
        mvc.perform(get("/api/v1/rental/my").with(user("other@example.com").roles("USER"))).andExpect(status().isOk()).andExpect(jsonPath("$.contracts.length()").value(0));
    }
    @Test void readingsCannotGoBackwardAndIssuedSnapshotsCannotChange() {
        long id=active("0");long period=service.openPeriod(owner,id,new RentalRequests.Period(YearMonth.from(today.minusMonths(1)).toString(),today));
        assertThatThrownBy(()->service.confirmReadings(owner,period,new Readings(bd("99"),bd("11")))).isInstanceOf(ResponseStatusException.class);
        assertThat(db.all("meter_readings",owner)).hasSize(2);
        service.confirmReadings(owner,period,new Readings(bd("110"),bd("12")));long invoice=service.draftInvoice(owner,period);
        assertThat(service.draftInvoice(owner,period)).isEqualTo(invoice);service.issue(owner,invoice);service.issue(owner,invoice);
        assertThatThrownBy(()->service.confirmReadings(owner,period,new Readings(bd("999"),bd("999")))).isInstanceOf(ResponseStatusException.class);
        assertThat(money(db.one("invoices",owner,invoice,false),"total_amount")).isEqualByComparingTo("1165000");
        assertThat(db.all("invoice_items",owner)).hasSize(4);
    }
    @Test void paymentsCannotOverpayOrReuseReferences() {
        long id=active("0"),invoice=bill(id);
        assertThatThrownBy(()->service.pay(owner,new Payment(invoice,bd("2000000"),"TOO-MUCH",today))).isInstanceOf(ResponseStatusException.class);
        service.pay(owner,new Payment(invoice,bd("500000"),"SAME",today));
        assertThatThrownBy(()->service.pay(owner,new Payment(invoice,bd("100000"),"SAME",today))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(db.all("payments",owner)).hasSize(1);
        assertThat(money(service.state(owner).get("invoices").getFirst(),"balance")).isEqualByComparingTo("665000");
    }
    @Test void insufficientDepositDoesNotPartiallyFinalizeAndAllowsRemainingDebtCollection() {
        long id=active("100000");long invoice=bill(id);
        long checkout=service.beginCheckout(owner,id,new Checkout(today,bd("110"),bd("12"),bd("0"),bd("0"),"Bàn giao"));
        long finalInvoice=db.all("invoices",owner).stream().filter(row->text(row,"kind").equals("CHECKOUT")).mapToLong(row->number(row,"id")).findFirst().orElseThrow();service.issue(owner,finalInvoice);
        assertThatThrownBy(()->service.finalizeCheckout(owner,checkout)).isInstanceOf(ResponseStatusException.class);
        assertThat(db.all("deposit_transactions",owner)).hasSize(1);
        assertThat(db.one("contracts",owner,id,false).get("status")).isEqualTo("ACTIVE");
        service.pay(owner,new Payment(invoice,bd("1065000"),"REMAINING",today));service.finalizeCheckout(owner,checkout);
        assertThat(db.one("checkouts",owner,checkout,false).get("status")).isEqualTo("FINALIZED");
    }
    @Test void pendingDeductionsBlockIssueAndApprovedDeductionsCannotBeAddedAfterIssue() {
        long id=active("1000000");long checkout=service.beginCheckout(owner,id,new Checkout(today,bd("100"),bd("10"),bd("0"),bd("0"),"Bàn giao"));
        long invoice=db.all("invoices",owner).getFirst().get("id") instanceof Number value?value.longValue():0;
        long deduction=service.deduction(owner,checkout,new Deduction("Sửa chữa",bd("100000")));
        assertThatThrownBy(()->service.issue(owner,invoice)).isInstanceOf(ResponseStatusException.class);
        service.approveDeduction(owner,deduction);service.issue(owner,invoice);
        assertThatThrownBy(()->service.deduction(owner,checkout,new Deduction("Khoản thêm",bd("1000")))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void concurrentActivationCannotOccupyOneRoomTwice() throws Exception {
        long first=draft("0");long room=number(db.one("contracts",owner,first,false),"room_id");long second=draftInRoom(room,"0");prepare(first,"0");prepare(second,"0");
        int successes=concurrent(()->service.activate(owner,first),()->service.activate(owner,second));
        assertThat(successes).isEqualTo(1);
        assertThat(db.all("contracts",owner).stream().filter(row->text(row,"status").equals("ACTIVE")).count()).isEqualTo(1);
    }
    @Test void concurrentPaymentsCannotExceedInvoiceBalance() throws Exception {
        long id=active("0"),invoice=bill(id);
        int successes=concurrent(()->service.pay(owner,new Payment(invoice,bd("700000"),"CONCURRENT-A",today)),()->service.pay(owner,new Payment(invoice,bd("700000"),"CONCURRENT-B",today)));
        assertThat(successes).isEqualTo(1);assertThat(db.all("payments",owner)).hasSize(1);
        assertThat(money(service.state(owner).get("invoices").getFirst(),"balance")).isEqualByComparingTo("465000");
    }
    int concurrent(Runnable first,Runnable second) throws Exception {
        try(var executor=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);var results=new ArrayList<Future<Boolean>>();
            for(var task:List.of(first,second))results.add(executor.submit(()->{start.await();try{task.run();return true;}catch(ResponseStatusException expected){return false;}}));
            start.countDown();int successes=0;for(var result:results)if(result.get(15,TimeUnit.SECONDS))successes++;return successes;
        }
    }
}
