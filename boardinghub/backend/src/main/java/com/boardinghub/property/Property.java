package com.boardinghub.property;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
@Entity @Table(name="properties")
public class Property {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @NotBlank @Column(nullable=false) public String name;
 @Column(nullable=false) public String address="";
}
