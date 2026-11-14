package com.boardinghub.meter;
import jakarta.persistence.*;
@Entity @Table(name="meter_readings")
public class MeterReading {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="room_id")
 public Long roomId;
 @Column(name="period")
 public String period;
 @Column(name="meter_type")
 public String meterType;
 @Column(name="previous_value")
 public java.math.BigDecimal previousValue;
 @Column(name="current_value")
 public java.math.BigDecimal currentValue;
}
