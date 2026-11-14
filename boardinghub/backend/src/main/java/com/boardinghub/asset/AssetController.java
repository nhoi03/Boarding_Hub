package com.boardinghub.asset;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/assets")
public class AssetController {
 private final AssetService service;
 public AssetController(AssetService service){this.service=service;}
 @GetMapping public List<Asset> all(){return service.all();}
 @GetMapping("/{id}") public Asset one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Asset create(@RequestBody Asset input){return service.create(input);}
 @PutMapping("/{id}") public Asset update(@PathVariable Long id,@RequestBody Asset input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
