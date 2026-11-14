package com.boardinghub.listing;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class RoomListingService {
 private final RoomListingRepository repo;
 public RoomListingService(RoomListingRepository repo){this.repo=repo;}
 public List<RoomListing> all(){return repo.findAll();}
 public RoomListing one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"RoomListing not found"));}
 public RoomListing create(RoomListing input){input.id=null;return repo.save(input);}
 public RoomListing update(Long id,RoomListing input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
