package xyz.antiz.urlShorter.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import xyz.antiz.urlShorter.dto.FeedbackRequest;

@Service
public class FeedbackEmailService {

    private final ResendEmailService resendEmailService;

    @Value("${app.feedback.to:}")
    private String feedbackTo;

    public FeedbackEmailService(ResendEmailService resendEmailService) {
        this.resendEmailService = resendEmailService;
    }

    public void sendFeedback(FeedbackRequest request) {
        if (feedbackTo == null || feedbackTo.isBlank()) {
            throw new IllegalStateException("Feedback recipient email is not configured");
        }

        String appName = resendEmailService.getAppName();
        resendEmailService.sendTextEmail(
                feedbackTo.trim(),
                "[" + appName + "] Beta feedback from " + request.name,
                buildBody(request),
                request.email
        );
    }

    private String buildBody(FeedbackRequest request) {
        return "New beta launch feedback received.\n\n"
                + "Name: " + request.name + "\n"
                + "Email: " + request.email + "\n\n"
                + "Message:\n"
                + request.message.trim()
                + "\n";
    }
}
