// src/main/java/xyz/antiz/urlShorter/repo/ShortUrlRepository.java
package xyz.antiz.urlShorter.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import xyz.antiz.urlShorter.entity.ShortUrl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ShortUrlRepository extends JpaRepository<ShortUrl, Long> {

    Optional<ShortUrl> findByShortCode(String shortCode);

    Optional<ShortUrl> findByShortCodeAndUserId(String shortCode, Long userId);

    boolean existsByShortCode(String shortCode);

    boolean existsByShortCodeAndShortBaseUrlAndIdNot(String shortCode, String shortBaseUrl, Long id);

    long countByUserId(Long userId);

    long countByGuestToken(String guestToken);

    List<ShortUrl> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<ShortUrl> findByGuestTokenAndUserId(String guestToken, Long userId);

    @Modifying
    @Query("update ShortUrl s " +
            "set s.clickCount = s.clickCount + 1, " +
            "    s.lastAccessedAt = :lastAccessedAt " +
            "where s.id = :id")
    void incrementClickAndSetLastAccessedAt(@Param("id") Long id,
                                            @Param("lastAccessedAt") LocalDateTime lastAccessedAt);

    void deleteByUserId(Long userId);


}
