package com.boardinghub.fund;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/fund-entries")
public class FundEntryController {
 private final FundEntryService service;
 public FundEntryController(FundEntryService service){this.service=service;}
 @GetMapping public List<FundEntry> all(){return service.all();}
 @GetMapping("/{id}") public FundEntry one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public FundEntry create(@RequestBody FundEntry input){return service.create(input);}
 @PutMapping("/{id}") public FundEntry update(@PathVariable Long id,@RequestBody FundEntry input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
