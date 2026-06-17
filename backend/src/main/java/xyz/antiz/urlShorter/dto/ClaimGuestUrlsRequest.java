package xyz.antiz.urlShorter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ClaimGuestUrlsRequest {

    @NotBlank
    @Size(min = 16, max = 80)
    public String guestToken;
}
