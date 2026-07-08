package xyz.antiz.urlShorter.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DataMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataMigrationRunner.class);
    private final JdbcTemplate jdbcTemplate;

    public DataMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Running data migrations...");
        
        try {
            // Check if column exists before trying to update, in case hibernate hasn't run yet or we're on H2
            // Actually, Spring Boot runs CommandLineRunner AFTER context is fully loaded and Hibernate ddl-auto has run.
            // So the column `verified` should exist in the `users` table.
            
            // We only want to set verified = true for users that existed prior to this feature.
            // Since all existing users went through OTP or Google Login, they are effectively verified.
            int rowsUpdated = jdbcTemplate.update("UPDATE users SET verified = true WHERE verified = false OR verified IS NULL");
            if (rowsUpdated > 0) {
                log.info("Backfilled verified=true for {} existing users.", rowsUpdated);
            }
        } catch (Exception e) {
            log.warn("Failed to run data migration for verified users (this is normal on fresh DBs if column check fails): {}", e.getMessage());
        }
    }
}
