package xyz.antiz.urlShorter.service.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.antiz.urlShorter.dto.auth.AuthResponse;
import xyz.antiz.urlShorter.dto.auth.ForgotPasswordRequest;
import xyz.antiz.urlShorter.dto.auth.ForgotPasswordResponse;
import xyz.antiz.urlShorter.dto.auth.GoogleLoginRequest;
import xyz.antiz.urlShorter.dto.auth.LoginRequest;
import xyz.antiz.urlShorter.dto.auth.OtpInitResponse;
import xyz.antiz.urlShorter.dto.auth.RegisterRequest;
import xyz.antiz.urlShorter.dto.auth.ResetPasswordRequest;
import xyz.antiz.urlShorter.dto.auth.VerifyOtpRequest;
import xyz.antiz.urlShorter.entity.AuthOtpChallenge;
import xyz.antiz.urlShorter.entity.AuthOtpPurpose;
import xyz.antiz.urlShorter.entity.User;
import xyz.antiz.urlShorter.repo.AuthOtpChallengeRepository;
import xyz.antiz.urlShorter.repo.PasswordResetTokenRepository;
import xyz.antiz.urlShorter.repo.ShortUrlRepository;
import xyz.antiz.urlShorter.repo.UserRepository;
import xyz.antiz.urlShorter.security.JwtService;
import xyz.antiz.urlShorter.service.EmailDeliveryException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final int OTP_TTL_MINUTES = 5;
    private static final int OTP_MAX_ATTEMPTS = 5;
    private static final String FORGOT_PASSWORD_MESSAGE = "OTP sent successfully";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthOtpChallengeRepository otpChallenges;
    private final OtpEmailService otpEmailService;
    private final ShortUrlRepository shortUrls;
    private final PasswordResetTokenRepository passwordResetTokens;

    @Value("${app.auth.google.clientId:249537386676-1b3dkci1si4h0p79lt3v1470jug2a2j3.apps.googleusercontent.com}")
    private String googleClientId;

    public AuthService(
            UserRepository users,
            PasswordEncoder encoder,
            JwtService jwt,
            AuthOtpChallengeRepository otpChallenges,
            OtpEmailService otpEmailService,
            ShortUrlRepository shortUrls,
            PasswordResetTokenRepository passwordResetTokens
    ) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.otpChallenges = otpChallenges;
        this.otpEmailService = otpEmailService;
        this.shortUrls = shortUrls;
        this.passwordResetTokens = passwordResetTokens;
    }

    // Legacy direct auth endpoints (kept for compatibility)
    public AuthResponse register(RegisterRequest req) {
        String email = req.email.toLowerCase().trim();

        if (!req.password.equals(req.confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (users.existsByEmail(email)) {
            log.warn("Register blocked: existing email={}", maskEmail(email));
            throw new IllegalArgumentException("Email already registered");
        }

        String hash = encoder.encode(req.password);
        User u = users.save(new User(req.fullName.trim(), email, hash));
        log.info("Register successful: userId={} email={}", u.getId(), maskEmail(u.getEmail()));

        String token = jwt.createToken(u.getId(), u.getEmail());
        return new AuthResponse(token, u.getId(), u.getEmail(), u.getFullName());
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.email.toLowerCase().trim();

        User u = users.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Login failed: email not found={}", maskEmail(email));
                    return new IllegalArgumentException("Invalid email or password");
                });

        if (!encoder.matches(req.password, u.getPasswordHash())) {
            log.warn("Login failed: invalid password email={} userId={}", maskEmail(email), u.getId());
            throw new IllegalArgumentException("Invalid email or password");
        }

        log.info("Login successful: userId={} email={}", u.getId(), maskEmail(u.getEmail()));
        String token = jwt.createToken(u.getId(), u.getEmail());
        return new AuthResponse(token, u.getId(), u.getEmail(), u.getFullName());
    }

    public AuthResponse googleLogin(GoogleLoginRequest req) {
        if (googleClientId == null || googleClientId.isBlank()) {
            log.error("Google login blocked: clientId is not configured");
            throw new IllegalStateException("Google login is not configured");
        }

        GoogleIdToken idToken;
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    JacksonFactory.getDefaultInstance()
            )
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            idToken = verifier.verify(req.idToken.trim());
        } catch (Exception ex) {
            log.warn("Google login failed: token verification error={}", ex.getClass().getSimpleName());
            throw new IllegalArgumentException("Invalid Google token");
        }

        if (idToken == null) {
            log.warn("Google login failed: verifier returned null token");
            throw new IllegalArgumentException("Invalid Google token");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        Object emailVerified = payload.get("email_verified");
        if (!(emailVerified instanceof Boolean verified) || !verified) {
            log.warn("Google login failed: email not verified");
            throw new IllegalArgumentException("Google email is not verified");
        }

        String email = payload.getEmail();
        if (email == null || email.isBlank()) {
            log.warn("Google login failed: email missing in token");
            throw new IllegalArgumentException("Google account email is missing");
        }
        String normalizedEmail = email.toLowerCase().trim();

        String fullName = (String) payload.get("name");
        if (fullName == null || fullName.isBlank()) {
            fullName = "Google User";
        }
        String normalizedFullName = fullName.trim();

        User user = users.findByEmail(normalizedEmail).orElse(null);
        boolean created = false;
        if (user == null) {
            user = users.save(new User(
                    normalizedFullName,
                    normalizedEmail,
                    encoder.encode(UUID.randomUUID().toString())
            ));
            created = true;
        }
        log.info("Google login successful: userId={} email={} created={}", user.getId(), maskEmail(user.getEmail()), created);

        String token = jwt.createToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName());
    }

    public OtpInitResponse registerInit(RegisterRequest req) {
        String email = req.email.toLowerCase().trim();

        if (!req.password.equals(req.confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (users.existsByEmail(email)) {
            log.warn("Register init blocked: existing email={}", maskEmail(email));
            throw new IllegalArgumentException("Email already registered");
        }

        String passwordHash = encoder.encode(req.password);
        return createOtpChallenge(email, AuthOtpPurpose.REGISTER, req.fullName.trim(), passwordHash, null);
    }

    public AuthResponse registerVerify(VerifyOtpRequest req) {
        AuthOtpChallenge challenge = verifyOtpChallenge(req, AuthOtpPurpose.REGISTER, true);

        if (users.existsByEmail(challenge.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        if (challenge.getPendingFullName() == null || challenge.getPendingPasswordHash() == null) {
            throw new IllegalArgumentException("Invalid OTP challenge state");
        }

        User user = users.save(new User(challenge.getPendingFullName(), challenge.getEmail(), challenge.getPendingPasswordHash()));
        String token = jwt.createToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName());
    }

    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest req) {
        String email = req.email.toLowerCase().trim();

        User user = users.findByEmail(email).orElse(null);
        if (user == null) {
            log.warn("Forgot password failed: email not found={}", maskEmail(email));
            throw new IllegalArgumentException("Email does not exist. Register now.");
        }

        OtpInitResponse init = createOtpChallenge(email, AuthOtpPurpose.FORGOT_PASSWORD, null, null, user.getId());
        log.info("Forgot password OTP sent: userId={} email={} challengeId={}", user.getId(), maskEmail(email), init.challengeId);
        return new ForgotPasswordResponse(FORGOT_PASSWORD_MESSAGE, init.challengeId);

    }

    public String verifyForgotPasswordOtp(VerifyOtpRequest req) {
        verifyOtpChallenge(req, AuthOtpPurpose.FORGOT_PASSWORD, false);
        log.info("Forgot password OTP verified: challengeId={}", req.challengeId.trim());
        return "OTP verified successfully";
    }

    public OtpInitResponse initiateProfileEmailChange(Long userId, String newEmail) {
        OtpInitResponse init = createOtpChallenge(newEmail, AuthOtpPurpose.PROFILE_EMAIL_CHANGE, null, null, userId);
        log.info("Profile email change OTP sent: userId={} newEmail={} challengeId={}",
                userId, maskEmail(newEmail), init.challengeId);
        return init;
    }

    public User verifyProfileEmailChangeOtp(Long userId, VerifyOtpRequest req) {
        AuthOtpChallenge challenge = verifyOtpChallenge(req, AuthOtpPurpose.PROFILE_EMAIL_CHANGE, true);
        if (challenge.getPendingUserId() == null || !challenge.getPendingUserId().equals(userId)) {
            log.warn("Profile email change verify failed: challenge does not belong to user userId={} challengeId={}",
                    userId, req.challengeId.trim());
            throw new IllegalArgumentException("OTP challenge does not belong to current user");
        }

        User user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String newEmail = challenge.getEmail().toLowerCase().trim();
        if (!newEmail.equals(user.getEmail()) && users.existsByEmail(newEmail)) {
            throw new IllegalArgumentException("Email already registered");
        }
        user.setEmail(newEmail);
        users.save(user);
        log.info("Profile email updated: userId={} newEmail={}", userId, maskEmail(newEmail));
        return user;
    }

    public String resetPassword(ResetPasswordRequest req) {
        if (!req.password.equals(req.confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        VerifyOtpRequest verifyReq = new VerifyOtpRequest();
        verifyReq.challengeId = req.challengeId;
        verifyReq.otp = req.otp;

        AuthOtpChallenge challenge = verifyOtpChallenge(verifyReq, AuthOtpPurpose.FORGOT_PASSWORD, true);

        User user;
        if (challenge.getPendingUserId() != null) {
            user = users.findById(challenge.getPendingUserId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
        } else {
            user = users.findByEmail(challenge.getEmail())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
        }

        user.setPasswordHash(encoder.encode(req.password));
        users.save(user);
        log.info("Password reset successful: userId={} email={}", user.getId(), maskEmail(user.getEmail()));

        return "Password reset successful";
    }

    public void deleteAccount(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        shortUrls.deleteByUserId(userId);
        passwordResetTokens.deleteByUser(user);
        otpChallenges.deleteByEmail(user.getEmail());
        users.delete(user);
        log.info("Account deleted: userId={} email={}", userId, maskEmail(user.getEmail()));
    }

    private OtpInitResponse createOtpChallenge(
            String email,
            AuthOtpPurpose purpose,
            String pendingFullName,
            String pendingPasswordHash,
            Long pendingUserId
    ) {
        otpChallenges.deleteByExpiresAtBefore(LocalDateTime.now());
        otpChallenges.deleteByEmailAndPurposeAndUsedAtIsNull(email, purpose);
        otpChallenges.flush();

        String otp = generateOtpCode();
        AuthOtpChallenge challenge = new AuthOtpChallenge();
        challenge.setChallengeId(UUID.randomUUID().toString().replace("-", ""));
        challenge.setPurpose(purpose);
        challenge.setEmail(email);
        challenge.setOtpHash(sha256(otp));
        challenge.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES));
        challenge.setAttempts(0);
        challenge.setMaxAttempts(OTP_MAX_ATTEMPTS);
        challenge.setPendingFullName(pendingFullName);
        challenge.setPendingPasswordHash(pendingPasswordHash);
        challenge.setPendingUserId(pendingUserId);

        try {
            otpChallenges.saveAndFlush(challenge);
        } catch (DataIntegrityViolationException ex) {
            log.warn("OTP challenge creation failed: email={} purpose={} reason=constraint", maskEmail(email), purpose);
            throw new IllegalStateException("Could not create OTP challenge. Please try again.");
        }

        try {
            otpEmailService.sendOtp(email, otp, purposeLabel(purpose));
        } catch (EmailDeliveryException ex) {
            otpChallenges.delete(challenge);
            otpChallenges.flush();
            log.warn("OTP email send failed: email={} purpose={} reason={}", maskEmail(email), purpose, ex.getClass().getSimpleName());
            throw new IllegalStateException("Failed to send OTP email. Please try again.");
        }

        return new OtpInitResponse(
                "OTP sent successfully",
                challenge.getChallengeId()
        );

    }

    private AuthOtpChallenge verifyOtpChallenge(
            VerifyOtpRequest req,
            AuthOtpPurpose expectedPurpose,
            boolean markUsedOnSuccess
    ) {
        AuthOtpChallenge challenge = otpChallenges.findByChallengeIdAndUsedAtIsNull(req.challengeId.trim())
                .orElseThrow(() -> {
                    log.warn("OTP verify failed: challenge not found challengeId={}", req.challengeId.trim());
                    return new IllegalArgumentException("Invalid or expired OTP challenge");
                });

        if (challenge.getPurpose() != expectedPurpose) {
            log.warn("OTP verify failed: purpose mismatch challengeId={} expected={} actual={}",
                    req.challengeId.trim(), expectedPurpose, challenge.getPurpose());
            throw new IllegalArgumentException("OTP challenge purpose mismatch");
        }

        if (challenge.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("OTP verify failed: expired challengeId={}", req.challengeId.trim());
            throw new IllegalArgumentException("OTP has expired");
        }

        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            log.warn("OTP verify failed: attempts exceeded challengeId={}", req.challengeId.trim());
            throw new IllegalArgumentException("Maximum OTP attempts exceeded");
        }

        String otpHash = sha256(req.otp.trim());
        if (!otpHash.equals(challenge.getOtpHash())) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
                challenge.setUsedAt(LocalDateTime.now());
            }
            otpChallenges.save(challenge);
            log.warn("OTP verify failed: invalid OTP challengeId={} attempts={}/{}",
                    req.challengeId.trim(), challenge.getAttempts(), challenge.getMaxAttempts());
            throw new IllegalArgumentException("Invalid OTP");
        }

        if (markUsedOnSuccess) {
            challenge.setUsedAt(LocalDateTime.now());
            otpChallenges.save(challenge);
        }
        log.info("OTP verified: challengeId={} purpose={} markUsed={}", req.challengeId.trim(), expectedPurpose, markUsedOnSuccess);
        return challenge;
    }

    private String generateOtpCode() {
        int number = ThreadLocalRandom.current().nextInt(0, 1_000_000);
        return String.format("%06d", number);
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String purposeLabel(AuthOtpPurpose purpose) {
        return switch (purpose) {
            case LOGIN -> "login";
            case REGISTER -> "signup";
            case FORGOT_PASSWORD -> "password reset";
            case PROFILE_EMAIL_CHANGE -> "profile email change";
        };
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) return "<empty>";
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}
