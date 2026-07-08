package xyz.antiz.urlShorter.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.antiz.urlShorter.entity.MaskedUrlAudit;

@Repository
public interface MaskedUrlAuditRepository extends JpaRepository<MaskedUrlAudit, Long> {
    long countByUserId(Long userId);
}
