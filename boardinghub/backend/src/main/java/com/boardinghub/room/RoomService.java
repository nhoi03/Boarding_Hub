package com.boardinghub.room;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.boardinghub.property.PropertyRepository;
@Service
public class RoomService {
 private final RoomRepository rooms;
 private final PropertyRepository properties;
 public RoomService(RoomRepository rooms, PropertyRepository properties){this.rooms=rooms;this.properties=properties;}
 public List<Room> all(){return rooms.findAll();}
 public Room one(Long id){return rooms.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Room not found"));}
 public Room create(Room room){
  if(room.propertyId==null || !properties.existsById(room.propertyId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Property does not exist");
  room.id=null; return rooms.save(room);
 }
 public Room update(Long id, Room input){
  Room existing=one(id);
  if(input.propertyId==null || !properties.existsById(input.propertyId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Property does not exist");
  existing.propertyId=input.propertyId;existing.roomNumber=input.roomNumber;existing.capacity=input.capacity;existing.basePrice=input.basePrice;existing.status=input.status;
  return rooms.save(existing);
 }
 public void delete(Long id){rooms.delete(one(id));}
}
