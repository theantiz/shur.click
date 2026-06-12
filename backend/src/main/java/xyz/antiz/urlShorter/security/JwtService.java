package xyz.antiz.urlShorter.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtService {

    private final SecretKey key;
    private final int expMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expMinutes}") int expMinutes
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expMinutes = expMinutes;
    }

    public String createToken(Long userId, String email) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(expMinutes * 60L);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    private Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getUserId(String token) {
        return Long.parseLong(parse(token).getSubject());
    }

    public String getEmail(String token) {
        Object e = parse(token).get("email");
        return e == null ? null : e.toString();
    }
}
