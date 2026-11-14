package com.boardinghub.absence;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/absences")
public class AbsenceController {
 private final AbsenceService service;
 public AbsenceController(AbsenceService service){this.service=service;}
 @GetMapping public List<Absence> all(){return service.all();}
 @GetMapping("/{id}") public Absence one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Absence create(@RequestBody Absence input){return service.create(input);}
 @PutMapping("/{id}") public Absence update(@PathVariable Long id,@RequestBody Absence input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
