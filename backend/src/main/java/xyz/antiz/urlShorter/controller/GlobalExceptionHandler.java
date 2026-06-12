package xyz.antiz.urlShorter.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> badRequest(IllegalArgumentException ex, HttpServletRequest request) {
        log.warn("Bad request: method={} path={} message={}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> conflict(IllegalStateException ex, HttpServletRequest request) {
        log.warn("Conflict: method={} path={} message={}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validationError(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: method={} path={} message={}", request.getMethod(), request.getRequestURI(), message);
        return build(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> invalidJson(HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("Invalid JSON: method={} path={}", request.getMethod(), request.getRequestURI());
        return build(HttpStatus.BAD_REQUEST, "Invalid request body", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> dataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Data integrity violation: method={} path={}", request.getMethod(), request.getRequestURI());
        return build(HttpStatus.CONFLICT, "Database constraint violation", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> accessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access denied: method={} path={}", request.getMethod(), request.getRequestURI());
        return build(HttpStatus.FORBIDDEN, "Access denied", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> unknown(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception: method={} path={}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", request);
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", status.value(),
                "error", message,
                "path", request.getRequestURI()
        ));
    }
}
