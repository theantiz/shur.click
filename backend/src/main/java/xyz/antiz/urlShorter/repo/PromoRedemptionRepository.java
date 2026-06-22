package xyz.antiz.urlShorter.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.antiz.urlShorter.entity.PromoRedemption;

public interface PromoRedemptionRepository extends JpaRepository<PromoRedemption, Long> {
    boolean existsByUserIdAndPromoCodeId(Long userId, Long promoCodeId);
}
