package com.boardinghub.auth;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AccountService accounts;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contexts;
    public AuthController(AccountService accounts, AuthenticationManager authenticationManager, SecurityContextRepository contexts) {
        this.accounts = accounts;
        this.authenticationManager = authenticationManager;
        this.contexts = contexts;
    }
    public record RegisterRequest(@NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(min = 8, max = 72) String password) {
        @Override public String toString() { return "RegisterRequest[credentials=REDACTED]"; }
    }
    public record LoginRequest(@NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 72) String password, @Pattern(regexp = "USER|OWNER|ADMIN") String accountType) {
        @Override public String toString() { return "LoginRequest[credentials=REDACTED]"; }
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public AppUser.Profile register(@Valid @RequestBody RegisterRequest input) {
        return accounts.register(input.fullName(), input.email(), input.password());
    }
    @PostMapping("/register-owner") @ResponseStatus(HttpStatus.CREATED)
    public AppUser.Profile registerOwner(@Valid @RequestBody RegisterRequest input) {
        return accounts.registerOwner(input.fullName(), input.email(), input.password());
    }
    @PostMapping("/login")
    public AppUser.Profile login(@Valid @RequestBody LoginRequest input, HttpServletRequest request, HttpServletResponse response) {
        AccountService.validatePassword(input.password());
        Authentication authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken.unauthenticated(AccountService.normalize(input.email()), input.password()));
        if (input.accountType() != null && authentication.getAuthorities().stream()
            .noneMatch(authority -> authority.getAuthority().equals("ROLE_" + input.accountType())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản không thuộc loại đăng nhập đã chọn.");
        request.getSession();
        request.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        new HttpSessionCsrfTokenRepository().saveToken(null, request, response);
        return accounts.profile(authentication.getName());
    }
    @GetMapping("/me")
    public AppUser.Profile me(Authentication authentication) { return accounts.profile(authentication.getName()); }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
    }
}
