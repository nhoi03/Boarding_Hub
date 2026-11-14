package com.boardinghub.meter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class MeterReadingService {
 private final MeterReadingRepository repo;
 public MeterReadingService(MeterReadingRepository repo){this.repo=repo;}
 public List<MeterReading> all(){return repo.findAll();}
 public MeterReading one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"MeterReading not found"));}
 public MeterReading create(MeterReading input){input.id=null;return repo.save(input);}
 public MeterReading update(Long id,MeterReading input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
