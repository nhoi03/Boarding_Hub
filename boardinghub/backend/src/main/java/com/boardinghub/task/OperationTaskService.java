package com.boardinghub.task;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class OperationTaskService {
 private final OperationTaskRepository repo;
 public OperationTaskService(OperationTaskRepository repo){this.repo=repo;}
 public List<OperationTask> all(){return repo.findAll();}
 public OperationTask one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"OperationTask not found"));}
 public OperationTask create(OperationTask input){input.id=null;return repo.save(input);}
 public OperationTask update(Long id,OperationTask input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
