package com.boardinghub.residence;
import jakarta.persistence.*;
@Entity @Table(name="residence_records")
public class ResidenceRecord {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="tenant_id")
 public Long tenantId;
 @Column(name="record_type")
 public String recordType;
 @Column(name="start_date")
 public java.time.LocalDate startDate;
 @Column(name="end_date")
 public java.time.LocalDate endDate;
 @Column(name="status")
 public String status;
}
