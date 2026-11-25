package com.boardinghub.rental;

import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.constraints.*;

public final class RentalRequests {
    private RentalRequests() {}
    public record Room(@NotBlank @Size(max=150) String propertyName, @NotBlank @Size(max=30) String roomNumber, @Min(1) @Max(100) int capacity) {}
    public record Person(@NotBlank @Size(max=150) String fullName, @NotBlank @Size(max=30) String phone, @Email @Size(max=254) String accountEmail) {}
    public record Contract(@Positive long roomId, @Positive long personId, @NotNull LocalDate startDate, LocalDate endDate,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal rent,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal deposit,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal electricityPrice,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal waterPrice,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal servicePrice) {}
    public record Deposit(@NotNull @DecimalMin("0.01") @Digits(integer=12,fraction=2) BigDecimal amount,
        @NotBlank @Size(max=100) String reference, @NotNull @PastOrPresent LocalDate date) {}
    public record CheckIn(@NotNull @DecimalMin("0") @Digits(integer=12,fraction=3) BigDecimal electricity,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=3) BigDecimal water, @NotBlank @Size(max=1000) String notes) {}
    public record Period(@NotBlank @Pattern(regexp="\\d{4}-(0[1-9]|1[0-2])") String period, @NotNull LocalDate dueDate) {}
    public record Readings(@NotNull @DecimalMin("0") @Digits(integer=12,fraction=3) BigDecimal electricity,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=3) BigDecimal water) {}
    public record Payment(@Positive long invoiceId, @NotNull @DecimalMin("0.01") @Digits(integer=12,fraction=2) BigDecimal amount,
        @NotBlank @Size(max=100) String reference, @NotNull @PastOrPresent LocalDate date) {}
    public record Checkout(@NotNull @PastOrPresent LocalDate date,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=3) BigDecimal electricity,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=3) BigDecimal water,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal finalRent,
        @NotNull @DecimalMin("0") @Digits(integer=12,fraction=2) BigDecimal finalService,
        @NotBlank @Size(max=1000) String notes) {}
    public record Deduction(@NotBlank @Size(max=250) String description,
        @NotNull @DecimalMin("0.01") @Digits(integer=12,fraction=2) BigDecimal amount) {}
}
