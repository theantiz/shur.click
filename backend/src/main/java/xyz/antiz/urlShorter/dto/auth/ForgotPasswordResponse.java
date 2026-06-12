package xyz.antiz.urlShorter.dto.auth;

public class ForgotPasswordResponse {
    public final String message;
    public final String challengeId;

    public ForgotPasswordResponse(String message, String challengeId) {
        this.message = message;
        this.challengeId = challengeId;
    }
}

