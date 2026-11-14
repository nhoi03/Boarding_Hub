package com.boardinghub.maintenance;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class MaintenanceRequestService {
 private final MaintenanceRequestRepository repo;
 public MaintenanceRequestService(MaintenanceRequestRepository repo){this.repo=repo;}
 public List<MaintenanceRequest> all(){return repo.findAll();}
 public MaintenanceRequest one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"MaintenanceRequest not found"));}
 public MaintenanceRequest create(MaintenanceRequest input){input.id=null;return repo.save(input);}
 public MaintenanceRequest update(Long id,MaintenanceRequest input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
