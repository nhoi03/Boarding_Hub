package com.boardinghub.listing;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/room-listings")
public class RoomListingController {
 private final RoomListingService service;
 public RoomListingController(RoomListingService service){this.service=service;}
 @GetMapping public List<RoomListing> all(){return service.all();}
 @GetMapping("/{id}") public RoomListing one(@PathVariable Long id){return service.one(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public RoomListing create(@RequestBody RoomListing input){return service.create(input);}
 @PutMapping("/{id}") public RoomListing update(@PathVariable Long id,@RequestBody RoomListing input){return service.update(id,input);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
