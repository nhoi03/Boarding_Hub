package com.boardinghub.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService implements UserDetailsService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    public AccountService(UserRepository users, PasswordEncoder passwords) {
        this.users = users;
        this.passwords = passwords;
    }
    public static String normalize(String email) { return email.strip().toLowerCase(Locale.ROOT); }
    public static void validatePassword(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu tối đa 72 byte UTF-8.");
    }
    @Transactional
    public AppUser.Profile register(String name, String email, String password) {
        return registerAccount(name, email, password, "USER");
    }
    @Transactional
    public AppUser.Profile registerOwner(String name, String email, String password) {
        return registerAccount(name, email, password, "OWNER");
    }
    private AppUser.Profile registerAccount(String name, String email, String password, String role) {
        validatePassword(password);
        String normalized = normalize(email);
        if (users.existsByEmail(normalized))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được đăng ký.");
        return users.saveAndFlush(new AppUser(name.strip(), normalized, passwords.encode(password), role)).profile();
    }
    public AppUser.Profile profile(String email) {
        return users.findByEmail(normalize(email)).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập lại.")).profile();
    }
    @Override public UserDetails loadUserByUsername(String email) {
        AppUser account = users.findByEmail(normalize(email))
            .orElseThrow(() -> new UsernameNotFoundException("Tài khoản không tồn tại"));
        return User.withUsername(account.email).password(account.passwordHash).roles(account.role).build();
    }
}
