package xyz.antiz.urlShorter.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.antiz.urlShorter.dto.billing.BillingStatusResponse;
import xyz.antiz.urlShorter.dto.billing.RazorpayOrderResponse;
import xyz.antiz.urlShorter.dto.billing.RazorpayVerifyRequest;
import xyz.antiz.urlShorter.dto.billing.RedeemPromoRequest;
import xyz.antiz.urlShorter.dto.billing.RedeemPromoResponse;
import xyz.antiz.urlShorter.service.BillingService;
import xyz.antiz.urlShorter.service.RazorpayBillingService;

import java.util.Map;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    private final BillingService billing;
    private final RazorpayBillingService razorpayBilling;

    public BillingController(BillingService billing, RazorpayBillingService razorpayBilling) {
        this.billing = billing;
        this.razorpayBilling = razorpayBilling;
    }

    @GetMapping("/status")
    public ResponseEntity<BillingStatusResponse> status(@RequestAttribute("userId") Long userId) {
        return ResponseEntity.ok(billing.getStatus(userId));
    }

    @PostMapping("/razorpay-order")
    public ResponseEntity<RazorpayOrderResponse> createRazorpayOrder(@RequestAttribute("userId") Long userId) {
        return ResponseEntity.ok(razorpayBilling.createOrder(userId));
    }

    @PostMapping("/verify-payment")
    public ResponseEntity<Map<String, String>> verifyPayment(
            @RequestAttribute("userId") Long userId,
            @Valid @RequestBody RazorpayVerifyRequest req
    ) {
        razorpayBilling.verifyPayment(userId, req);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/redeem-promo")
    public ResponseEntity<RedeemPromoResponse> redeemPromo(
            @RequestAttribute("userId") Long userId,
            @Valid @RequestBody RedeemPromoRequest req
    ) {
        return ResponseEntity.ok(billing.redeemPromo(userId, req.getCode()));
    }
}
