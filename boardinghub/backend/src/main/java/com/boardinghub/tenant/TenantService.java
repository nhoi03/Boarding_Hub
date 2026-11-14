package com.boardinghub.tenant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class TenantService {
 private final TenantRepository repo;
 public TenantService(TenantRepository repo){this.repo=repo;}
 public List<Tenant> all(){return repo.findAll();}
 public Tenant one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Tenant not found"));}
 public Tenant create(Tenant input){input.id=null;return repo.save(input);}
 public Tenant update(Long id,Tenant input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
