package xyz.antiz.urlShorter.dto.profile;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @NotBlank
    @Size(min = 2, max = 100)
    public String fullName;

    @NotBlank
    @Email
    public String email;
}
