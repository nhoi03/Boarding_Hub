package com.boardinghub.maintenance;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/maintenance-requests")
public class MaintenanceRequestController {
 private final MaintenanceRequestService service;
 public MaintenanceRequestController(MaintenanceRequestService service){this.service=service;}
 @GetMapping public List<MaintenanceRequest> all(){return service.all();}
 @GetMapping("/{id}") public MaintenanceRequest one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public MaintenanceRequest create(@RequestBody MaintenanceRequest input){return service.create(input);}
 @PutMapping("/{id}") public MaintenanceRequest update(@PathVariable Long id,@RequestBody MaintenanceRequest input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
