package xyz.antiz.urlShorter.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ResetPasswordRequest {

    @NotBlank
    public String challengeId;

    @NotBlank
    @Size(min = 6, max = 6)
    public String otp;

    @NotBlank
    @Size(min = 8, max = 255)
    public String password;

    @NotBlank
    public String confirmPassword;
}
