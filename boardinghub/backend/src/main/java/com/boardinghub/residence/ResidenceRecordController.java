package com.boardinghub.residence;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/residence-records")
public class ResidenceRecordController {
 private final ResidenceRecordService service;
 public ResidenceRecordController(ResidenceRecordService service){this.service=service;}
 @GetMapping public List<ResidenceRecord> all(){return service.all();}
 @GetMapping("/{id}") public ResidenceRecord one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public ResidenceRecord create(@RequestBody ResidenceRecord input){return service.create(input);}
 @PutMapping("/{id}") public ResidenceRecord update(@PathVariable Long id,@RequestBody ResidenceRecord input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
