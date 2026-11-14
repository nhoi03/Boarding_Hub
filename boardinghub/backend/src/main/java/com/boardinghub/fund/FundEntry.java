package com.boardinghub.fund;
import jakarta.persistence.*;
@Entity @Table(name="fund_entries")
public class FundEntry {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="room_id")
 public Long roomId;
 @Column(name="description")
 public String description;
 @Column(name="amount")
 public java.math.BigDecimal amount;
 @Column(name="status")
 public String status;
}
