package com.boardinghub.fund;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class FundEntryService {
 private final FundEntryRepository repo;
 public FundEntryService(FundEntryRepository repo){this.repo=repo;}
 public List<FundEntry> all(){return repo.findAll();}
 public FundEntry one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"FundEntry not found"));}
 public FundEntry create(FundEntry input){input.id=null;return repo.save(input);}
 public FundEntry update(Long id,FundEntry input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
