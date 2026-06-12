package xyz.antiz.urlShorter.controller.auth;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.antiz.urlShorter.dto.auth.AuthResponse;
import xyz.antiz.urlShorter.dto.auth.ForgotPasswordRequest;
import xyz.antiz.urlShorter.dto.auth.ForgotPasswordResponse;
import xyz.antiz.urlShorter.dto.auth.GoogleLoginRequest;
import xyz.antiz.urlShorter.dto.auth.LoginRequest;
import xyz.antiz.urlShorter.dto.auth.OtpInitResponse;
import xyz.antiz.urlShorter.dto.auth.RegisterRequest;
import xyz.antiz.urlShorter.dto.auth.ResetPasswordRequest;
import xyz.antiz.urlShorter.dto.auth.VerifyOtpRequest;
import xyz.antiz.urlShorter.service.auth.AuthService;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    // Legacy direct auth endpoints (kept for backward compatibility)
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(auth.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(auth.login(req));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest req) {
        return ResponseEntity.ok(auth.googleLogin(req));
    }

    // OTP-based auth endpoints
    @PostMapping("/register-init")
    public ResponseEntity<OtpInitResponse> registerInit(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(auth.registerInit(req));
    }

    @PostMapping("/register-verify")
    public ResponseEntity<AuthResponse> registerVerify(@Valid @RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(auth.registerVerify(req));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ForgotPasswordResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        return ResponseEntity.ok(auth.forgotPassword(req));
    }


    @PostMapping("/forgot-password-verify")
    public ResponseEntity<Map<String, String>> verifyForgotPasswordOtp(@Valid @RequestBody VerifyOtpRequest req) {
        String message = auth.verifyForgotPasswordOtp(req);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        String message = auth.resetPassword(req);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @DeleteMapping("/account")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @RequestAttribute(value = "userId", required = false) Long userId
    ) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        auth.deleteAccount(userId);
        return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));
    }
}
