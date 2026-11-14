package com.boardinghub.payment;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/payments")
public class PaymentController {
 private final PaymentService service;
 public PaymentController(PaymentService service){this.service=service;}
 @GetMapping public List<Payment> all(){return service.all();}
 @GetMapping("/{id}") public Payment one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Payment create(@RequestBody Payment input){return service.create(input);}
 @PutMapping("/{id}") public Payment update(@PathVariable Long id,@RequestBody Payment input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
