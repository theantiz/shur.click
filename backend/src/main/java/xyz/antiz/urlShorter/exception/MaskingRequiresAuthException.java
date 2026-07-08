package xyz.antiz.urlShorter.exception;

public class MaskingRequiresAuthException extends RuntimeException {
    public MaskingRequiresAuthException(String message) {
        super(message);
    }
}
