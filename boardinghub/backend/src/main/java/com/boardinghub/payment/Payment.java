package com.boardinghub.payment;
import jakarta.persistence.*;
@Entity @Table(name="payments")
public class Payment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="invoice_id")
 public Long invoiceId;
 @Column(name="amount")
 public java.math.BigDecimal amount;
 @Column(name="paid_at")
 public java.time.LocalDate paidAt;
 @Column(name="reference")
 public String reference;
}
