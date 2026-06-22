package xyz.antiz.urlShorter.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import xyz.antiz.urlShorter.entity.PromoCode;
import xyz.antiz.urlShorter.repo.PromoCodeRepository;

/**
 * Seeds promo codes into the database on startup.
 *
 * Configure via the PROMO_CODES environment variable (or application.properties):
 *   PROMO_CODES=CODE1:2,CODE2:1,CODE3:2
 *
 * Format: <CODE>:<durationMonths>  (comma-separated)
 * If a code already exists in the DB it is skipped (idempotent).
 */
@Component
public class PromoCodeInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PromoCodeInitializer.class);

    @Value("${app.promo.codes:LAUNCH2025:2,BETA2MO:2}")
    private String promoCodes;

    private final PromoCodeRepository promoCodeRepository;

    public PromoCodeInitializer(PromoCodeRepository promoCodeRepository) {
        this.promoCodeRepository = promoCodeRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (promoCodes == null || promoCodes.isBlank()) return;

        for (String entry : promoCodes.split(",")) {
            entry = entry.trim();
            if (entry.isEmpty()) continue;

            String[] parts = entry.split(":");
            if (parts.length < 2) {
                log.warn("PromoCodeInitializer: skipping malformed entry '{}' (expected CODE:months)", entry);
                continue;
            }

            String code = parts[0].trim().toUpperCase();
            int months;
            try {
                months = Integer.parseInt(parts[1].trim());
            } catch (NumberFormatException e) {
                log.warn("PromoCodeInitializer: skipping entry '{}' — invalid months value", entry);
                continue;
            }

            boolean exists = promoCodeRepository.findByCodeIgnoreCase(code).isPresent();
            if (!exists) {
                PromoCode promo = new PromoCode(code, months, -1); // unlimited uses by default
                promoCodeRepository.save(promo);
                log.info("PromoCodeInitializer: seeded promo code '{}' ({} months)", code, months);
            } else {
                log.debug("PromoCodeInitializer: promo code '{}' already exists, skipping", code);
            }
        }
    }
}
