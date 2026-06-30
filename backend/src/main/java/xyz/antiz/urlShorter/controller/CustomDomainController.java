package xyz.antiz.urlShorter.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import xyz.antiz.urlShorter.entity.CustomDomain;
import xyz.antiz.urlShorter.service.CustomDomainService;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/domains")
public class CustomDomainController {

    private final CustomDomainService customDomainService;

    public CustomDomainController(CustomDomainService customDomainService) {
        this.customDomainService = customDomainService;
    }

    // DTOs are simple and keep the API stable
    public static class CreateDomainRequest {
        private String domain;
        public String getDomain() { return domain; }
        public void setDomain(String domain) { this.domain = domain; }
    }

    public static class DomainResponse {
        private Long id;
        private String domain;
        private String status;
        private String verificationToken; // show so user can configure DNS

        public DomainResponse(CustomDomain entity) {
            this.id = entity.getId();
            this.domain = entity.getDomain();
            this.status = entity.getStatus().name();
            this.verificationToken = entity.getVerificationToken();
        }

        public Long getId() { return id; }
        public String getDomain() { return domain; }
        public String getStatus() { return status; }
        public String getVerificationToken() { return verificationToken; }
    }

    @PostMapping
    public ResponseEntity<DomainResponse> createDomain(
            @RequestBody CreateDomainRequest request,
            @RequestAttribute("userId") Long userId
    ) {
        CustomDomain domain = customDomainService.addDomain(userId, request.getDomain());
        return ResponseEntity
                .created(URI.create("/api/domains/" + domain.getId()))
                .body(new DomainResponse(domain));
    }

    @GetMapping
    public List<DomainResponse> listDomains(
            @RequestAttribute("userId") Long userId
    ) {
        return customDomainService.listForUser(userId)
                .stream()
                .map(DomainResponse::new)
                .toList();
    }

    @PostMapping("/{id}/verify")
    public DomainResponse verifyDomain(
            @PathVariable Long id,
            @RequestAttribute("userId") Long userId
    ) {
        CustomDomain domain = customDomainService.verifyDomain(userId, id);
        return new DomainResponse(domain);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDomain(
            @PathVariable Long id,
            @RequestAttribute("userId") Long userId
    ) {
        customDomainService.deleteDomain(userId, id);
        return ResponseEntity.noContent().build();
    }
}
