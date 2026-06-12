package xyz.antiz.urlShorter.dto.billing;

public class RazorpayOrderResponse {
    public String keyId;
    public String orderId;
    public long amount;
    public String currency;
    public String name;
    public String description;
    public String prefillEmail;

    public RazorpayOrderResponse(
            String keyId,
            String orderId,
            long amount,
            String currency,
            String name,
            String description,
            String prefillEmail
    ) {
        this.keyId = keyId;
        this.orderId = orderId;
        this.amount = amount;
        this.currency = currency;
        this.name = name;
        this.description = description;
        this.prefillEmail = prefillEmail;
    }
}
