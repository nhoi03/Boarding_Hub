package com.boardinghub.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    @Value("${BOARDINGHUB_ADMIN_EMAIL:}") private String email;
    @Value("${BOARDINGHUB_ADMIN_PASSWORD:}") private String password;
    public AdminBootstrap(UserRepository users, PasswordEncoder passwords) { this.users = users; this.passwords = passwords; }
    @Override public void run(ApplicationArguments args) {
        if (email.isBlank() && password.isBlank()) return;
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || email.length() > 254 || password.length() < 12)
            throw new IllegalStateException("Set a valid BOARDINGHUB_ADMIN_EMAIL and BOARDINGHUB_ADMIN_PASSWORD (12+ characters).");
        AccountService.validatePassword(password);
        String normalized = AccountService.normalize(email);
        if (!users.existsByEmail(normalized))
            users.saveAndFlush(new AppUser("Quản trị viên", normalized, passwords.encode(password), "ADMIN"));
        else if (!"ADMIN".equals(users.findByEmail(normalized).orElseThrow().role))
            throw new IllegalStateException("Admin bootstrap email already belongs to a user; choose another email.");
    }
}
