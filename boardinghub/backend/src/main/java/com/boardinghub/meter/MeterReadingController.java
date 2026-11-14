package com.boardinghub.meter;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/meter-readings")
public class MeterReadingController {
 private final MeterReadingService service;
 public MeterReadingController(MeterReadingService service){this.service=service;}
 @GetMapping public List<MeterReading> all(){return service.all();}
 @GetMapping("/{id}") public MeterReading one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public MeterReading create(@RequestBody MeterReading input){return service.create(input);}
 @PutMapping("/{id}") public MeterReading update(@PathVariable Long id,@RequestBody MeterReading input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
