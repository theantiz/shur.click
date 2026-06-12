package xyz.antiz.urlShorter.dto.auth;

public class AuthResponse {
    public String token;
    public String tokenType = "Bearer";
    public Long userId;
    public String email;
    public String fullName;

    public AuthResponse(String token, Long userId, String email, String fullName) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
    }
}
