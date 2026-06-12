package xyz.antiz.urlShorter.dto.auth;

public class OtpInitResponse {
    public String message;
    public String challengeId;
    public OtpInitResponse(String message, String challengeId) {
        this.message = message;
        this.challengeId = challengeId;
    }

}
