package com.boardinghub.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;
    @Column(name = "full_name", nullable = false, length = 100)
    String fullName;
    @Column(nullable = false, unique = true, length = 254)
    String email;
    @Column(name = "password_hash", nullable = false, length = 100)
    String passwordHash;
    @Column(nullable = false, length = 10)
    String role = "USER";
    @Column(name = "created_at", nullable = false)
    Instant createdAt = Instant.now();

    protected AppUser() {}
    AppUser(String fullName, String email, String passwordHash, String role) {
        this.fullName = fullName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public record Profile(Long id, String fullName, String email, String role, Instant createdAt) {}
    public Profile profile() { return new Profile(id, fullName, email, role, createdAt); }
}
