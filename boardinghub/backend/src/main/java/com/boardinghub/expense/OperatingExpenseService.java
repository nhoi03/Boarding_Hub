package com.boardinghub.expense;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class OperatingExpenseService {
 private final OperatingExpenseRepository repo;
 public OperatingExpenseService(OperatingExpenseRepository repo){this.repo=repo;}
 public List<OperatingExpense> all(){return repo.findAll();}
 public OperatingExpense one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"OperatingExpense not found"));}
 public OperatingExpense create(OperatingExpense input){input.id=null;return repo.save(input);}
 public OperatingExpense update(Long id,OperatingExpense input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
