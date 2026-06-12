package xyz.antiz.urlShorter.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.antiz.urlShorter.dto.FeedbackRequest;
import xyz.antiz.urlShorter.service.FeedbackEmailService;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackEmailService feedbackEmailService;

    public FeedbackController(FeedbackEmailService feedbackEmailService) {
        this.feedbackEmailService = feedbackEmailService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> submitFeedback(@Valid @RequestBody FeedbackRequest request) {
        feedbackEmailService.sendFeedback(request);
        return ResponseEntity.ok(Map.of("message", "Thanks for your feedback. We received it."));
    }
}
