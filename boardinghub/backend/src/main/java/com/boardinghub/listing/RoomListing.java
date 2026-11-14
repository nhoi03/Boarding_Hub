package com.boardinghub.listing;
import jakarta.persistence.*;
@Entity @Table(name="room_listings")
public class RoomListing {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="room_id")
 public Long roomId;
 @Column(name="title")
 public String title;
 @Column(name="description")
 public String description;
 @Column(name="published")
 public Boolean published;
}
