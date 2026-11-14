package com.boardinghub.invoice;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/invoices")
public class InvoiceController {
 private final InvoiceService service;
 public InvoiceController(InvoiceService service){this.service=service;}
 @GetMapping public List<Invoice> all(){return service.all();}
 @GetMapping("/{id}") public Invoice one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Invoice create(@RequestBody Invoice input){return service.create(input);}
 @PutMapping("/{id}") public Invoice update(@PathVariable Long id,@RequestBody Invoice input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
