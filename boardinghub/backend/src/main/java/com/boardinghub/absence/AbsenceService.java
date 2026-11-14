package com.boardinghub.absence;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class AbsenceService {
 private final AbsenceRepository repo;
 public AbsenceService(AbsenceRepository repo){this.repo=repo;}
 public List<Absence> all(){return repo.findAll();}
 public Absence one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Absence not found"));}
 public Absence create(Absence input){input.id=null;return repo.save(input);}
 public Absence update(Long id,Absence input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
