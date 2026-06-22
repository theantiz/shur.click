package xyz.antiz.urlShorter.dto.billing;

import jakarta.validation.constraints.NotBlank;

public class RedeemPromoRequest {

    @NotBlank(message = "Promo code must not be blank")
    private String code;

    public RedeemPromoRequest() {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
