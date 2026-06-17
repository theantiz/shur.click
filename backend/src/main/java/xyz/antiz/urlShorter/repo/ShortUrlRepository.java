package xyz.antiz.urlShorter.repo;

import xyz.antiz.urlShorter.entity.ShortUrl;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ShortUrlRepository extends JpaRepository<ShortUrl, Long> {
    Optional<ShortUrl> findByShortCode(String shortCode);
    Optional<ShortUrl> findByShortCodeAndUserId(String shortCode, Long userId);

    boolean existsByShortCode(String shortCode);

    List<ShortUrl> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);

    long countByGuestToken(String guestToken);

    List<ShortUrl> findByGuestTokenAndUserId(String guestToken, Long userId);

    void deleteByUserId(Long userId);

    @Modifying
    @Query("update ShortUrl s set s.clickCount = s.clickCount + 1, s.lastAccessedAt = :lastAccessedAt where s.id = :id")
    int incrementClickAndSetLastAccessedAt(@Param("id") Long id, @Param("lastAccessedAt") LocalDateTime lastAccessedAt);
}
