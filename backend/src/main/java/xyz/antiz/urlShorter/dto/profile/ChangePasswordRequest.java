package xyz.antiz.urlShorter.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChangePasswordRequest {

    @NotBlank
    public String currentPassword;

    @NotBlank
    @Size(min = 8, max = 255)
    public String newPassword;

    @NotBlank
    public String confirmNewPassword;
}
