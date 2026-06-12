package xyz.antiz.urlShorter.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class FeedbackRequest {

    @NotBlank
    @Size(min = 2, max = 120)
    public String name;

    @NotBlank
    @Email
    @Size(max = 190)
    public String email;

    @NotBlank
    @Size(min = 10, max = 3000)
    public String message;
}
