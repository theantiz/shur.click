package xyz.antiz.urlShorter.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class VerifyOtpRequest {

    @NotBlank
    public String challengeId;

    @NotBlank
    @Size(min = 6, max = 6)
    public String otp;
}
