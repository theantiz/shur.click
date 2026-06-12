package xyz.antiz.urlShorter.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.antiz.urlShorter.entity.PasswordResetToken;
import xyz.antiz.urlShorter.entity.User;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
    void deleteByUserAndUsedAtIsNull(User user);
    void deleteByUser(User user);
}
