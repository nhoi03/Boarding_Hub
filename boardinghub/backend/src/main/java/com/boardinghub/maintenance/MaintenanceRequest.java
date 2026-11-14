package com.boardinghub.maintenance;
import jakarta.persistence.*;
@Entity @Table(name="maintenance_requests")
public class MaintenanceRequest {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="room_id")
 public Long roomId;
 @Column(name="title")
 public String title;
 @Column(name="description")
 public String description;
 @Column(name="status")
 public String status;
}
