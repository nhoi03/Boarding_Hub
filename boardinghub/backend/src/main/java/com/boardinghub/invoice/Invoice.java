package com.boardinghub.invoice;
import jakarta.persistence.*;
@Entity @Table(name="invoices")
public class Invoice {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="contract_id")
 public Long contractId;
 @Column(name="period")
 public String period;
 @Column(name="total_amount")
 public java.math.BigDecimal totalAmount;
 @Column(name="status")
 public String status;
}
