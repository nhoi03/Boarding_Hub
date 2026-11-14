package com.boardinghub.residence;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class ResidenceRecordService {
 private final ResidenceRecordRepository repo;
 public ResidenceRecordService(ResidenceRecordRepository repo){this.repo=repo;}
 public List<ResidenceRecord> all(){return repo.findAll();}
 public ResidenceRecord one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"ResidenceRecord not found"));}
 public ResidenceRecord create(ResidenceRecord input){input.id=null;return repo.save(input);}
 public ResidenceRecord update(Long id,ResidenceRecord input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
