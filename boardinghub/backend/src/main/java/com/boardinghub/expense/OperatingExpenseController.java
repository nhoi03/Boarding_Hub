package com.boardinghub.expense;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/operating-expenses")
public class OperatingExpenseController {
 private final OperatingExpenseService service;
 public OperatingExpenseController(OperatingExpenseService service){this.service=service;}
 @GetMapping public List<OperatingExpense> all(){return service.all();}
 @GetMapping("/{id}") public OperatingExpense one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public OperatingExpense create(@RequestBody OperatingExpense input){return service.create(input);}
 @PutMapping("/{id}") public OperatingExpense update(@PathVariable Long id,@RequestBody OperatingExpense input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
