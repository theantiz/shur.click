package xyz.antiz.urlShorter.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ForgotPasswordRequest {

    @NotBlank
    @Email
    public String email;
}
