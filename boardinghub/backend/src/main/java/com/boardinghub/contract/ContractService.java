package com.boardinghub.contract;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class ContractService {
 private final ContractRepository repo;
 public ContractService(ContractRepository repo){this.repo=repo;}
 public List<Contract> all(){return repo.findAll();}
 public Contract one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Contract not found"));}
 public Contract create(Contract input){input.id=null;return repo.save(input);}
 public Contract update(Long id,Contract input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
