package xyz.antiz.urlShorter.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.antiz.urlShorter.entity.PromoCode;

import java.util.Optional;

public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {
    Optional<PromoCode> findByCodeIgnoreCase(String code);
}
