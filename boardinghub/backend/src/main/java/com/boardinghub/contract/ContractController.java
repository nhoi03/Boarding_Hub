package com.boardinghub.contract;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/contracts")
public class ContractController {
 private final ContractService service;
 public ContractController(ContractService service){this.service=service;}
 @GetMapping public List<Contract> all(){return service.all();}
 @GetMapping("/{id}") public Contract one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Contract create(@RequestBody Contract input){return service.create(input);}
 @PutMapping("/{id}") public Contract update(@PathVariable Long id,@RequestBody Contract input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
