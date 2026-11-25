package com.boardinghub.auth;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthErrors {
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<?> authentication() { return ResponseEntity.status(401).body(Map.of("message", "Email hoặc mật khẩu không đúng.")); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation() { return ResponseEntity.badRequest().body(Map.of("message", "Kiểm tra họ tên, email và mật khẩu (tối thiểu 8 ký tự).")); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> duplicate() { return ResponseEntity.status(409).body(Map.of("message", "Email đã được đăng ký.")); }
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message", error.getReason() == null ? "Yêu cầu không hợp lệ." : error.getReason()));
    }
}
