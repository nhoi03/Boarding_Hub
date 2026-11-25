package com.boardinghub.rental;

import static com.boardinghub.rental.RentalRequests.*;
import com.boardinghub.auth.AccountService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rental")
public class RentalController {
    private final RentalService service;
    private final AccountService accounts;
    public RentalController(RentalService service,AccountService accounts) { this.service=service; this.accounts=accounts; }
    private long owner(Authentication auth) { return accounts.profile(auth.getName()).id(); }
    @GetMapping("/state") public Object state(Authentication auth) { return service.state(owner(auth)); }
    @GetMapping("/my") public Object mine(Authentication auth) { return service.tenantState(auth.getName()); }
    @PostMapping("/rooms") public Object room(Authentication auth,@Valid @RequestBody Room input) { return Map.of("id",service.createRoom(owner(auth),input)); }
    @PostMapping("/persons") public Object person(Authentication auth,@Valid @RequestBody Person input) { return Map.of("id",service.createPerson(owner(auth),input)); }
    @PostMapping("/contracts") public Object contract(Authentication auth,@Valid @RequestBody Contract input) { return Map.of("id",service.createContract(owner(auth),input)); }
    @PostMapping("/contracts/{id}/deposit") public void deposit(Authentication auth,@PathVariable long id,@Valid @RequestBody Deposit input) { service.receiveDeposit(owner(auth),id,input); }
    @PostMapping("/contracts/{id}/check-in") public void checkIn(Authentication auth,@PathVariable long id,@Valid @RequestBody CheckIn input) { service.checkIn(owner(auth),id,input); }
    @PostMapping("/contracts/{id}/activate") public void activate(Authentication auth,@PathVariable long id) { service.activate(owner(auth),id); }
    @PostMapping("/contracts/{id}/periods") public Object period(Authentication auth,@PathVariable long id,@Valid @RequestBody Period input) { return Map.of("id",service.openPeriod(owner(auth),id,input)); }
    @PostMapping("/periods/{id}/readings") public void readings(Authentication auth,@PathVariable long id,@Valid @RequestBody Readings input) { service.confirmReadings(owner(auth),id,input); }
    @PostMapping("/periods/{id}/draft-invoice") public Object draft(Authentication auth,@PathVariable long id) { return Map.of("id",service.draftInvoice(owner(auth),id)); }
    @PostMapping("/invoices/{id}/issue") public void issue(Authentication auth,@PathVariable long id) { service.issue(owner(auth),id); }
    @PostMapping("/payments") public void pay(Authentication auth,@Valid @RequestBody Payment input) { service.pay(owner(auth),input); }
    @PostMapping("/periods/{id}/lock") public void lock(Authentication auth,@PathVariable long id) { service.lockPeriod(owner(auth),id); }
    @PostMapping("/contracts/{id}/checkout") public Object checkout(Authentication auth,@PathVariable long id,@Valid @RequestBody Checkout input) { return Map.of("id",service.beginCheckout(owner(auth),id,input)); }
    @PostMapping("/checkouts/{id}/deductions") public Object deduction(Authentication auth,@PathVariable long id,@Valid @RequestBody Deduction input) { return Map.of("id",service.deduction(owner(auth),id,input)); }
    @PostMapping("/deductions/{id}/approve") public void approve(Authentication auth,@PathVariable long id) { service.approveDeduction(owner(auth),id); }
    @PostMapping("/checkouts/{id}/finalize") public void finalizeCheckout(Authentication auth,@PathVariable long id) { service.finalizeCheckout(owner(auth),id); }
}
