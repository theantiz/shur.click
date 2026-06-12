package xyz.antiz.urlShorter.dto.auth;

import jakarta.validation.constraints.NotBlank;

public class GoogleLoginRequest {

    @NotBlank
    public String idToken;
}
