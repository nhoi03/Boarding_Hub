package com.boardinghub.property;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/properties")
public class PropertyController {
 private final PropertyRepository repo;
 public PropertyController(PropertyRepository repo){this.repo=repo;}
 @GetMapping public List<Property> all(){return repo.findAll();}
 @PostMapping public Property create(@Valid @RequestBody Property p){p.id=null;return repo.save(p);}
}
