package com.boardinghub.dashboard;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import com.boardinghub.room.RoomRepository;
@RestController @RequestMapping("/api/v1/dashboard")
public class DashboardController {
 private final RoomRepository rooms;
 public DashboardController(RoomRepository rooms){this.rooms=rooms;}
 @GetMapping("/summary") public Map<String,Long> summary(){
  var list=rooms.findAll();
  return Map.of("total",(long)list.size(),"occupied",list.stream().filter(r->"OCCUPIED".equals(r.status)).count(),"available",list.stream().filter(r->"AVAILABLE".equals(r.status)).count(),"maintenance",list.stream().filter(r->"MAINTENANCE".equals(r.status)).count());
 }
}
