package com.boardinghub.tenant;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/tenants")
public class TenantController {
 private final TenantService service;
 public TenantController(TenantService service){this.service=service;}
 @GetMapping public List<Tenant> all(){return service.all();}
 @GetMapping("/{id}") public Tenant one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Tenant create(@RequestBody Tenant input){return service.create(input);}
 @PutMapping("/{id}") public Tenant update(@PathVariable Long id,@RequestBody Tenant input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
