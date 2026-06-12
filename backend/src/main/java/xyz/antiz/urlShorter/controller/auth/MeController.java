package xyz.antiz.urlShorter.controller.auth;

import jakarta.validation.Valid;
import xyz.antiz.urlShorter.entity.User;
import xyz.antiz.urlShorter.dto.auth.OtpInitResponse;
import xyz.antiz.urlShorter.dto.auth.VerifyOtpRequest;
import xyz.antiz.urlShorter.dto.profile.ChangePasswordRequest;
import xyz.antiz.urlShorter.dto.profile.UpdateProfileRequest;
import xyz.antiz.urlShorter.repo.UserRepository;
import xyz.antiz.urlShorter.service.auth.AuthService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MeController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthService auth;

    public MeController(UserRepository users, PasswordEncoder passwordEncoder, AuthService auth) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.auth = auth;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestAttribute(value = "userId", required = false) Long userId) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        User u = resolveUser(userId);

        return ResponseEntity.ok(Map.of(
                "id", u.getId(),
                "fullName", u.getFullName(),
                "email", u.getEmail()
        ));
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(
            @Valid @RequestBody UpdateProfileRequest req,
            @RequestAttribute(value = "userId", required = false) Long userId
    ) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        User u = resolveUser(userId);
        String normalizedEmail = req.email.toLowerCase().trim();

        if (!normalizedEmail.equals(u.getEmail()) && users.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email already registered");
        }

        u.setFullName(req.fullName.trim());
        users.save(u);

        if (!normalizedEmail.equals(u.getEmail())) {
            OtpInitResponse init = auth.initiateProfileEmailChange(userId, normalizedEmail);
            return ResponseEntity.ok(Map.of(
                    "message", "OTP sent to new email. Verify to complete email update.",
                    "challengeId", init.challengeId,
                    "pendingEmail", normalizedEmail,
                    "id", u.getId(),
                    "fullName", u.getFullName(),
                    "email", u.getEmail()
            ));
        }

        u.setEmail(normalizedEmail);
        users.save(u);

        return ResponseEntity.ok(Map.of(
                "message", "Profile updated successfully",
                "id", u.getId(),
                "fullName", u.getFullName(),
                "email", u.getEmail()
        ));
    }

    @PostMapping("/me/email/verify")
    public ResponseEntity<?> verifyProfileEmailChange(
            @Valid @RequestBody VerifyOtpRequest req,
            @RequestAttribute(value = "userId", required = false) Long userId
    ) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        User updated = auth.verifyProfileEmailChangeOtp(userId, req);
        return ResponseEntity.ok(Map.of(
                "message", "Email updated successfully",
                "id", updated.getId(),
                "fullName", updated.getFullName(),
                "email", updated.getEmail()
        ));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            @RequestAttribute(value = "userId", required = false) Long userId
    ) {
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        if (!req.newPassword.equals(req.confirmNewPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        User u = resolveUser(userId);
        if (!passwordEncoder.matches(req.currentPassword, u.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        u.setPasswordHash(passwordEncoder.encode(req.newPassword));
        users.save(u);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    private User resolveUser(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
