package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "auth_otp_challenges")
public class AuthOtpChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String challengeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthOtpPurpose purpose;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 64)
    private String otpHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime usedAt;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(nullable = false)
    private int maxAttempts = 5;

    @Column(length = 120)
    private String pendingFullName;

    @Column(length = 255)
    private String pendingPasswordHash;

    private Long pendingUserId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public AuthOtpChallenge() {
    }

    public Long getId() {
        return id;
    }

    public String getChallengeId() {
        return challengeId;
    }

    public void setChallengeId(String challengeId) {
        this.challengeId = challengeId;
    }

    public AuthOtpPurpose getPurpose() {
        return purpose;
    }

    public void setPurpose(AuthOtpPurpose purpose) {
        this.purpose = purpose;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public void setOtpHash(String otpHash) {
        this.otpHash = otpHash;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public String getPendingFullName() {
        return pendingFullName;
    }

    public void setPendingFullName(String pendingFullName) {
        this.pendingFullName = pendingFullName;
    }

    public String getPendingPasswordHash() {
        return pendingPasswordHash;
    }

    public void setPendingPasswordHash(String pendingPasswordHash) {
        this.pendingPasswordHash = pendingPasswordHash;
    }

    public Long getPendingUserId() {
        return pendingUserId;
    }

    public void setPendingUserId(Long pendingUserId) {
        this.pendingUserId = pendingUserId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
