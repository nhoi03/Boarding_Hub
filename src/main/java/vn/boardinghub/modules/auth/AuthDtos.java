package vn.boardinghub.modules.auth;
import jakarta.validation.constraints.*;
public final class AuthDtos {private AuthDtos(){} public record RegisterRequest(@NotBlank @Email String email,@NotBlank @Size(min=8,max=72) String password,@NotBlank @Size(max=120) String fullName){} public record LoginRequest(@NotBlank @Email String email,@NotBlank String password){} public record AuthResponse(String accessToken,String tokenType,long expiresIn,String userEmail,String fullName){} }
