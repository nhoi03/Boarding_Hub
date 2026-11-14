package com.boardinghub.expense;
import jakarta.persistence.*;
@Entity @Table(name="operating_expenses")
public class OperatingExpense {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="property_id")
 public Long propertyId;
 @Column(name="description")
 public String description;
 @Column(name="amount")
 public java.math.BigDecimal amount;
 @Column(name="spent_at")
 public java.time.LocalDate spentAt;
}
