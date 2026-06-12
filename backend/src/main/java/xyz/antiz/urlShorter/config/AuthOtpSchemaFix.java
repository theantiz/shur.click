package xyz.antiz.urlShorter.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuthOtpSchemaFix {

    private final JdbcTemplate jdbcTemplate;

    public AuthOtpSchemaFix(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void fixPurposeConstraint() {
        jdbcTemplate.execute("UPDATE auth_otp_challenges SET purpose = 'FORGOT_PASSWORD' WHERE purpose = 'FORGOT'");
        jdbcTemplate.execute("ALTER TABLE auth_otp_challenges DROP CONSTRAINT IF EXISTS auth_otp_challenges_purpose_check");
        jdbcTemplate.execute("""
                ALTER TABLE auth_otp_challenges
                ADD CONSTRAINT auth_otp_challenges_purpose_check
                CHECK (purpose IN ('REGISTER', 'LOGIN', 'FORGOT_PASSWORD', 'PROFILE_EMAIL_CHANGE'))
                """);
    }
}
