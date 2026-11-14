package com.boardinghub.task;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/operation-tasks")
public class OperationTaskController {
 private final OperationTaskService service;
 public OperationTaskController(OperationTaskService service){this.service=service;}
 @GetMapping public List<OperationTask> all(){return service.all();}
 @GetMapping("/{id}") public OperationTask one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public OperationTask create(@RequestBody OperationTask input){return service.create(input);}
 @PutMapping("/{id}") public OperationTask update(@PathVariable Long id,@RequestBody OperationTask input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
