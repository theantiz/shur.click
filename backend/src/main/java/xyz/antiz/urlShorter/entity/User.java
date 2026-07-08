package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private PlanTier planTier = PlanTier.FREE;

    @Column(name = "pro_expires_at")
    private LocalDateTime proExpiresAt;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean verified = false;

    public User() {
    }

    public User(Long id, String email, String passwordHash, String fullName, LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.password = passwordHash;
        this.name = fullName;
        this.fullName = fullName;
        this.createdAt = createdAt;
        this.planTier = PlanTier.FREE;
        this.verified = true; // explicitly verified when creating via this constructor (often social login)
    }

    public User(String fullName, String email, String passwordHash) {
        this.name = fullName;
        this.fullName = fullName;
        this.email = email;
        this.passwordHash = passwordHash;
        this.password = passwordHash;
        this.createdAt = LocalDateTime.now();
        this.planTier = PlanTier.FREE;
        this.verified = false; // assume false initially for raw register, wait for OTP
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
        this.password = passwordHash;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
        if (this.passwordHash == null || this.passwordHash.isBlank()) {
            this.passwordHash = password;
        }
    }

    public String getFullName() {
        return fullName != null ? fullName : name;
    }

    public void setFullName(String fullName) {
        this.name = fullName;
        this.fullName = fullName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
        if (this.fullName == null || this.fullName.isBlank()) {
            this.fullName = name;
        }
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public PlanTier getPlanTier() {
        return planTier == null ? PlanTier.FREE : planTier;
    }

    public void setPlanTier(PlanTier planTier) {
        this.planTier = planTier == null ? PlanTier.FREE : planTier;
    }

    public LocalDateTime getProExpiresAt() {
        return proExpiresAt;
    }

    public void setProExpiresAt(LocalDateTime proExpiresAt) {
        this.proExpiresAt = proExpiresAt;
    }

    public boolean isProActive() {
        return getPlanTier() == PlanTier.PRO && proExpiresAt != null && proExpiresAt.isAfter(LocalDateTime.now());
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

}
