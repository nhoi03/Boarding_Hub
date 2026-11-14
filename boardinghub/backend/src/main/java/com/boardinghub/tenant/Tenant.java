package com.boardinghub.tenant;
import jakarta.persistence.*;
@Entity @Table(name="tenants")
public class Tenant {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="full_name")
 public String fullName;
 @Column(name="phone")
 public String phone;
 @Column(name="email")
 public String email;
}
