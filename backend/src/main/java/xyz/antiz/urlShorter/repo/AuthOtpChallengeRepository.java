package xyz.antiz.urlShorter.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.antiz.urlShorter.entity.AuthOtpChallenge;
import xyz.antiz.urlShorter.entity.AuthOtpPurpose;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthOtpChallengeRepository extends JpaRepository<AuthOtpChallenge, Long> {
    Optional<AuthOtpChallenge> findByChallengeIdAndUsedAtIsNull(String challengeId);
    void deleteByEmailAndPurposeAndUsedAtIsNull(String email, AuthOtpPurpose purpose);
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
    void deleteByEmail(String email);
}
