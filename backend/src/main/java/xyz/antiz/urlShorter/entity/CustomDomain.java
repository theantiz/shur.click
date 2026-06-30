package xyz.antiz.urlShorter.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "custom_domains")
public class CustomDomain {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, unique = true)
    private String domain; // e.g. "links.theirbrand.com"

    @Column(nullable = false)
    private String verificationToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DomainStatus status = DomainStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant verifiedAt;

    public CustomDomain() {
    }

    public CustomDomain(Long userId, String domain, String verificationToken) {
        this.userId = userId;
        this.domain = domain;
        this.verificationToken = verificationToken;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getVerificationToken() {
        return verificationToken;
    }

    public void setVerificationToken(String verificationToken) {
        this.verificationToken = verificationToken;
    }

    public DomainStatus getStatus() {
        return status;
    }

    public void setStatus(DomainStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(Instant verifiedAt) {
        this.verifiedAt = verifiedAt;
    }
}