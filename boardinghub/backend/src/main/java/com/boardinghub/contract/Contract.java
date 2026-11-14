package com.boardinghub.contract;
import jakarta.persistence.*;
@Entity @Table(name="contracts")
public class Contract {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="room_id")
 public Long roomId;
 @Column(name="tenant_id")
 public Long tenantId;
 @Column(name="start_date")
 public java.time.LocalDate startDate;
 @Column(name="end_date")
 public java.time.LocalDate endDate;
 @Column(name="rent_amount")
 public java.math.BigDecimal rentAmount;
 @Column(name="status")
 public String status;
}
