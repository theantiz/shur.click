package xyz.antiz.urlShorter.service;

import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import xyz.antiz.urlShorter.dto.billing.RazorpayOrderResponse;
import xyz.antiz.urlShorter.dto.billing.RazorpayVerifyRequest;
import xyz.antiz.urlShorter.entity.User;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Service
public class RazorpayBillingService {

    private final BillingService billing;
    private final String keyId;
    private final String keySecret;
    private final String currency;
    private final long proAmountSubunits;

    public RazorpayBillingService(
            BillingService billing,
            @Value("${app.razorpay.keyId:}") String keyId,
            @Value("${app.razorpay.keySecret:}") String keySecret,
            @Value("${app.razorpay.currency:INR}") String currency,
            @Value("${app.razorpay.proAmountSubunits:20000}") long proAmountSubunits
    ) {
        this.billing = billing;
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.currency = currency;
        this.proAmountSubunits = proAmountSubunits;
    }

    public RazorpayOrderResponse createOrder(Long userId) {
        ensureConfigured();
        User user = billing.getUser(userId);

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);

            JSONObject notes = new JSONObject();
            notes.put("userId", String.valueOf(userId));

            JSONObject options = new JSONObject();
            options.put("amount", proAmountSubunits);
            options.put("currency", currency);
            options.put("receipt", "pro_" + userId + "_" + System.currentTimeMillis());
            options.put("notes", notes);

            Order order = client.orders.create(options);
            return new RazorpayOrderResponse(
                    keyId,
                    order.get("id"),
                    proAmountSubunits,
                    currency,
                    "shur.click",
                    "Pro Plan - Monthly",
                    user.getEmail()
            );
        } catch (RazorpayException e) {
            throw new IllegalStateException("Failed to create Razorpay order", e);
        }
    }

    public void verifyPayment(Long userId, RazorpayVerifyRequest req) {
        ensureConfigured();
        String expected = hmacSha256(req.razorpayOrderId + "|" + req.razorpayPaymentId, keySecret);
        if (!expected.equals(req.razorpaySignature)) {
            throw new IllegalArgumentException("Invalid Razorpay signature");
        }

        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            Payment payment = client.payments.fetch(req.razorpayPaymentId);
            String status = payment.get("status");
            String orderId = payment.get("order_id");

            if (!req.razorpayOrderId.equals(orderId)) {
                throw new IllegalArgumentException("Payment order mismatch");
            }

            if (!"captured".equalsIgnoreCase(status) && !"authorized".equalsIgnoreCase(status)) {
                throw new IllegalArgumentException("Payment not completed");
            }
        } catch (RazorpayException e) {
            throw new IllegalStateException("Failed to verify Razorpay payment", e);
        }

        billing.activateProMonthlyByUserId(userId);
    }

    private void ensureConfigured() {
        if (keyId == null || keyId.isBlank()) {
            throw new IllegalStateException("Razorpay keyId is not configured");
        }
        if (keySecret == null || keySecret.isBlank()) {
            throw new IllegalStateException("Razorpay keySecret is not configured");
        }
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] digest = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute Razorpay signature", e);
        }
    }
}
