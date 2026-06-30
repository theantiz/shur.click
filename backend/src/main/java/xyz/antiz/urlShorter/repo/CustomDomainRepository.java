package xyz.antiz.urlShorter.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.antiz.urlShorter.entity.CustomDomain;

import java.util.List;
import java.util.Optional;

public interface CustomDomainRepository extends JpaRepository<CustomDomain, Long> {

    Optional<CustomDomain> findByDomain(String domain);

    List<CustomDomain> findByUserId(Long userId);

    Optional<CustomDomain> findByIdAndUserId(Long id, Long userId);

    boolean existsByDomain(String domain);

    boolean existsByUserId(Long userId);
}
