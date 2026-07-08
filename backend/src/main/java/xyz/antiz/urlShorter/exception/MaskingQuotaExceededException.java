package xyz.antiz.urlShorter.exception;

public class MaskingQuotaExceededException extends RuntimeException {
    public MaskingQuotaExceededException(String message) {
        super(message);
    }
}
