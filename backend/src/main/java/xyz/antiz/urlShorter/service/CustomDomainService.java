package xyz.antiz.urlShorter.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import xyz.antiz.urlShorter.entity.CustomDomain;
import xyz.antiz.urlShorter.entity.DomainStatus;
import xyz.antiz.urlShorter.repo.CustomDomainRepository;

import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.InitialDirContext;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Hashtable;
import java.util.List;
import java.util.Optional;

@Service
public class CustomDomainService {

    private final CustomDomainRepository customDomainRepository;
    private final BillingService billingService;

    public CustomDomainService(CustomDomainRepository customDomainRepository,
                               BillingService billingService) {
        this.customDomainRepository = customDomainRepository;
        this.billingService = billingService;
    }

    /**
     * Create a new custom domain for a Pro user.
     * - Enforces active Pro subscription.
     * - Normalizes + validates domain.
     * - Generates verification token and stores as PENDING.
     */
    @Transactional
    public CustomDomain addDomain(Long userId, String rawDomain) {
        if (!billingService.isProActive(userId)) {
            throw new IllegalStateException("Custom domains require an active Pro plan.");
        }

        String domain = normalize(rawDomain);
        validateDomainFormat(domain);

        if (customDomainRepository.existsByUserId(userId)) {
            throw new IllegalStateException("Only one custom domain is allowed per Pro account.");
        }

        if (customDomainRepository.existsByDomain(domain)) {
            throw new IllegalStateException("This domain is already in use.");
        }

        String token = generateToken();
        CustomDomain entity = new CustomDomain(userId, domain, token);
        return customDomainRepository.save(entity);
    }

    /**
     * List all custom domains for a user.
     */
    @Transactional(readOnly = true)
    public List<CustomDomain> listForUser(Long userId) {
        return customDomainRepository.findByUserId(userId);
    }

    /**
     * Delete a domain owned by this user.
     */
    @Transactional
    public void deleteDomain(Long userId, Long domainId) {
        CustomDomain domain = customDomainRepository.findByIdAndUserId(domainId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Domain not found."));
        customDomainRepository.delete(domain);
    }

    /**
     * Trigger DNS verification:
     * - Looks up TXT record _shurclick-verify.<domain>
     * - Compares against stored verificationToken
     * - Sets VERIFIED or FAILED accordingly
     */
    @Transactional
    public CustomDomain verifyDomain(Long userId, Long domainId) {
        CustomDomain domain = customDomainRepository.findByIdAndUserId(domainId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Domain not found."));

        boolean matches = checkTxtRecord(domain.getDomain(), domain.getVerificationToken());

        domain.setStatus(matches ? DomainStatus.VERIFIED : DomainStatus.FAILED);
        if (matches) {
            domain.setVerifiedAt(Instant.now());
        }
        return customDomainRepository.save(domain);
    }

    /**
     * Used by the redirect controller:
     * Given a Host header, return the userId who owns this verified custom domain.
     */
    @Transactional(readOnly = true)
    public Optional<Long> resolveOwnerByDomain(String hostHeader) {
        String domain = normalize(hostHeader);
        try {
            validateDomainFormat(domain);
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
        return customDomainRepository.findByDomain(domain)
                .filter(d -> d.getStatus() == DomainStatus.VERIFIED)
                .map(CustomDomain::getUserId);
    }

    private boolean checkTxtRecord(String domain, String expectedToken) {
        String lookupHost = "_shurclick-verify." + domain;

        Hashtable<String, String> env = new Hashtable<>();
        env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");

        try {
            InitialDirContext dirContext = new InitialDirContext(env);
            Attributes attrs = dirContext.getAttributes(lookupHost, new String[]{"TXT"});
            Attribute txtAttr = attrs.get("TXT");
            if (txtAttr == null) {
                return false;
            }

            for (int i = 0; i < txtAttr.size(); i++) {
                String value = String.valueOf(txtAttr.get(i))
                        .replace("\"", "")
                        .trim();
                if (value.equals(expectedToken)) {
                    return true;
                }
            }
            return false;
        } catch (NamingException e) {
            return false;
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        return "shurclick-verify-" + Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String normalize(String domain) {
        if (domain == null) {
            throw new IllegalArgumentException("Domain is required.");
        }
        String normalized = domain.toLowerCase().trim();
        normalized = normalized.replaceFirst("^https?://", "");

        int slashIndex = normalized.indexOf('/');
        if (slashIndex >= 0) {
            normalized = normalized.substring(0, slashIndex);
        }

        int questionIndex = normalized.indexOf('?');
        if (questionIndex >= 0) {
            normalized = normalized.substring(0, questionIndex);
        }

        if (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        int colonIndex = normalized.indexOf(':');
        if (colonIndex >= 0) {
            normalized = normalized.substring(0, colonIndex);
        }

        return normalized.trim();
    }

    private void validateDomainFormat(String domain) {
        if (!domain.matches("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$")) {
            throw new IllegalArgumentException("Invalid domain format.");
        }

        if (domain.equals("shur.click") || domain.endsWith(".shur.click")) {
            throw new IllegalArgumentException("Cannot use shur.click or its subdomains as a custom domain.");
        }
    }
}
