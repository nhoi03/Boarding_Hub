package com.boardinghub.asset;
import jakarta.persistence.*;
@Entity @Table(name="assets")
public class Asset {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="room_id")
 public Long roomId;
 @Column(name="name")
 public String name;
 @Column(name="quantity")
 public Integer quantity;
 @Column(name="condition_note")
 public String conditionNote;
}
