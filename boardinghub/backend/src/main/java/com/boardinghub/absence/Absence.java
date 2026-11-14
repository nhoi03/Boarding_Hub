package com.boardinghub.absence;
import jakarta.persistence.*;
@Entity @Table(name="absences")
public class Absence {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="tenant_id")
 public Long tenantId;
 @Column(name="start_date")
 public java.time.LocalDate startDate;
 @Column(name="end_date")
 public java.time.LocalDate endDate;
 @Column(name="status")
 public String status;
}
