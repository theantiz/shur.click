package xyz.antiz.urlShorter.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Never require JWT for public endpoints / static assets.
        if (path.startsWith("/api/auth/")
                || path.equals("/api/auth")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.equals("/favicon.ico")
                || path.equals("/favicon-16x16.png")
                || path.equals("/favicon-32x32.png")
                || path.equals("/apple-touch-icon.png")
                || path.equals("/android-chrome-192x192.png")
                || path.equals("/android-chrome-512x512.png")
                || path.equals("/robots.txt")
                || path.equals("/sitemap.xml")
                || request.getMethod().equals("OPTIONS")) {

            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }


        String token = authHeader.substring(7);

        try {
            Long userId = jwtService.getUserId(token);
            String email = jwtService.getEmail(token);

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // We keep it simple: one default role
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));

                var auth = new UsernamePasswordAuthenticationToken(email, null, authorities);
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(auth);

                // attach userId for controllers if needed
                request.setAttribute("userId", userId);
            }
        } catch (Exception ignored) {
            log.warn("JWT validation failed: method={} path={} reason={}",
                    request.getMethod(), request.getRequestURI(), ignored.getClass().getSimpleName());
            // invalid/expired token => no auth set, request will be blocked by security if endpoint requires auth
        }

        filterChain.doFilter(request, response);
    }
}
