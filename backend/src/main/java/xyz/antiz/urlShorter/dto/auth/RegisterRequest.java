package xyz.antiz.urlShorter.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank
    @Size(min = 2, max = 120)
    public String fullName;

    @NotBlank
    @Email
    @Size(max = 190)
    public String email;

    @NotBlank
    @Size(min = 8, max = 72)
    public String password;

    @NotBlank
    @Size(min = 8, max = 72)
    public String confirmPassword;
}
