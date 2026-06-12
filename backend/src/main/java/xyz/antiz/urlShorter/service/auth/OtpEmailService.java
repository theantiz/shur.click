package xyz.antiz.urlShorter.service.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import xyz.antiz.urlShorter.service.ResendEmailService;

@Service
public class OtpEmailService {

    private final ResendEmailService resendEmailService;

    @Value("${app.mail.appName:shur.click}")
    private String appName;

    @Value("${app.public.base-url:https://shur.click}")
    private String baseUrl;

    public OtpEmailService(ResendEmailService resendEmailService) {
        this.resendEmailService = resendEmailService;
    }

    public void sendOtp(String toEmail, String otp, String purposeLabel) {
        resendEmailService.sendTextEmail(toEmail, getSubject(purposeLabel), buildBody(otp, purposeLabel));
    }

    private String getSubject(String purposeLabel) {
        return "[" + appName + "] Your verification code for " + capitalize(purposeLabel);
    }

    private String buildBody(String otp, String purposeLabel) {
        return
                "Hello,\n" +
                "\n" +
                "We received a request to verify your email for " + capitalize(purposeLabel) + ".\n" +
                "\n" +
                "Verification code: " + otp + "\n" +
                "\n" +
                "This code expires in 5 minutes.\n" +
                "If you did not request this, you can ignore this email.\n" +
                "\n" +
                "For your security, never share this code.\n" +
                "\n" +
                "Need help? Contact us at support@antiz.xyz\n" +
                "\n" +
                "Thank you for using " + appName + "!\n" +
                "\n" +
                "Best regards,\n" +
                "The " + appName + " Team\n" +
                baseUrl;
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty())
            return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
    }
}
