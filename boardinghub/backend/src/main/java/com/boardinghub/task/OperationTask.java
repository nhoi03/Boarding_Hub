package com.boardinghub.task;
import jakarta.persistence.*;
@Entity @Table(name="operation_tasks")
public class OperationTask {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
 public Long id;
 @Column(name="title")
 public String title;
 @Column(name="due_date")
 public java.time.LocalDate dueDate;
 @Column(name="status")
 public String status;
}
