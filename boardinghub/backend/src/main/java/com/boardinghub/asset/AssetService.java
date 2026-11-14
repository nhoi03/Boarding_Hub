package com.boardinghub.asset;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class AssetService {
 private final AssetRepository repo;
 public AssetService(AssetRepository repo){this.repo=repo;}
 public List<Asset> all(){return repo.findAll();}
 public Asset one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Asset not found"));}
 public Asset create(Asset input){input.id=null;return repo.save(input);}
 public Asset update(Long id,Asset input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
