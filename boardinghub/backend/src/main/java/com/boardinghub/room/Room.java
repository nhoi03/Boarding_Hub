package com.boardinghub.room;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
@Entity @Table(name="rooms")
public class Room {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(name="property_id",nullable=false) public Long propertyId;
 @NotBlank @Column(name="room_number",nullable=false) public String roomNumber;
 @Min(1) @Column(nullable=false) public Integer capacity;
 @DecimalMin("0.0") @Column(name="base_price",nullable=false) public BigDecimal basePrice;
 @Pattern(regexp="AVAILABLE|OCCUPIED|MAINTENANCE") @Column(nullable=false) public String status="AVAILABLE";
}
