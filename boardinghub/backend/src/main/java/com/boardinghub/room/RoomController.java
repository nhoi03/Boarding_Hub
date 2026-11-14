package com.boardinghub.room;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/rooms")
public class RoomController {
 private final RoomService service;
 public RoomController(RoomService service){this.service=service;}
 @GetMapping public List<Room> all(){return service.all();}
 @GetMapping("/{id}") public Room one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Room create(@Valid @RequestBody Room room){return service.create(room);}
 @PutMapping("/{id}") public Room update(@PathVariable Long id,@Valid @RequestBody Room room){return service.update(id,room);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
