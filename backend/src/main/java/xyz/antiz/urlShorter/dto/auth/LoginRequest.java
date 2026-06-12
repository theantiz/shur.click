package xyz.antiz.urlShorter.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @NotBlank
    @Email
    public String email;

    @NotBlank
    public String password;
}
