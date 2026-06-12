package xyz.antiz.urlShorter.dto.billing;

import jakarta.validation.constraints.NotBlank;

public class RazorpayVerifyRequest {
    @NotBlank
    public String razorpayOrderId;

    @NotBlank
    public String razorpayPaymentId;

    @NotBlank
    public String razorpaySignature;
}
