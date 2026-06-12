package xyz.antiz.urlShorter.repo;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import xyz.antiz.urlShorter.entity.UrlClickEvent;

import java.util.List;

public interface UrlClickEventRepository extends JpaRepository<UrlClickEvent, Long> {

    long countByShortUrlId(Long shortUrlId);

    @Query("""
            select e.countryCode as countryCode, count(e) as clicks
            from UrlClickEvent e
            where e.shortUrlId = :shortUrlId
            group by e.countryCode
            order by count(e) desc
            """)
    List<CountryClickCount> summarizeCountries(@Param("shortUrlId") Long shortUrlId, Pageable pageable);

    interface CountryClickCount {
        String getCountryCode();
        Long getClicks();
    }
}
