package xyz.antiz.urlShorter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import xyz.antiz.urlShorter.security.JwtService;
import xyz.antiz.urlShorter.entity.User;
import xyz.antiz.urlShorter.repo.UserRepository;
import xyz.antiz.urlShorter.service.ResendEmailService;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(UrlShorterApplicationTests.TestEmailConfig.class)
class UrlShorterApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private UserRepository users;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtService jwtService;

	@Autowired
	private TestResendEmailService resendEmailService;

	@Test
	void contextLoads() {
	}

	@Test
	void authCorsPreflightAllowsWwwOrigin() throws Exception {
		mockMvc.perform(options("/api/auth/google")
						.header("Origin", "https://www.shur.click")
						.header("Access-Control-Request-Method", "POST")
						.header("Access-Control-Request-Headers", "content-type"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "https://www.shur.click"));
	}

	@Test
	void guestCanCreateTwoLinksAndClaimThemAfterLogin() throws Exception {
		String guestToken = "guesttokenclaim1234567890";

		mockMvc.perform(post("/api/urls")
						.header("X-Guest-Token", guestToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "longUrl": "https://example.com/one",
								  "customAlias": "guestclaimone"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.shortCode").value("guestclaimone"));

		mockMvc.perform(post("/api/urls")
						.header("X-Guest-Token", guestToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "longUrl": "https://example.com/two",
								  "customAlias": "guestclaimtwo"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.shortCode").value("guestclaimtwo"));

		mockMvc.perform(post("/api/urls")
						.header("X-Guest-Token", guestToken)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "longUrl": "https://example.com/three",
								  "customAlias": "guestclaimthree"
								}
								"""))
				.andExpect(status().isConflict());

		User user = users.save(new User(
				"Claim User",
				"claim-user@test.com",
				passwordEncoder.encode("Password123")
		));
		String token = jwtService.createToken(user.getId(), user.getEmail());

		mockMvc.perform(post("/api/urls/claim-guest")
						.header("Authorization", "Bearer " + token)
						.contentType(APPLICATION_JSON)
						.content("""
								{
								  "guestToken": "guesttokenclaim1234567890"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.claimed").value(2));

		mockMvc.perform(get("/api/urls")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.shortCode == 'guestclaimone')]").exists())
				.andExpect(jsonPath("$[?(@.shortCode == 'guestclaimtwo')]").exists());
	}

	@Test
	void forgotPasswordThenResetPasswordWithOtpFlowWorks() throws Exception {
		User user = users.save(new User(
				"Test User",
				"reset-flow@test.com",
				passwordEncoder.encode("OldPassword123")
		));

		String forgotBody = """
				{
				  "email": "reset-flow@test.com"
				}
				""";

		String forgotResponse = mockMvc.perform(post("/api/auth/forgot-password")
						.contentType(APPLICATION_JSON)
						.content(forgotBody))
				.andExpect(status().isOk())
			.andExpect(jsonPath("$.challengeId").isNotEmpty())
			.andExpect(jsonPath("$.otp").doesNotExist())

				.andReturn()
				.getResponse()
				.getContentAsString();

		JsonNode forgotJson = objectMapper.readTree(forgotResponse);
		String challengeId = forgotJson.get("challengeId").asText();
		String otp = extractOtpFromEmail();

		String resetBody = """
				{
				  "challengeId": "%s",
				  "otp": "%s",
				  "password": "NewPassword123",
				  "confirmPassword": "NewPassword123"
				}
				""".formatted(challengeId, otp);

		mockMvc.perform(post("/api/auth/reset-password")
						.contentType(APPLICATION_JSON)
						.content(resetBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Password reset successful"));

		String loginBody = """
				{
				  "email": "reset-flow@test.com",
				  "password": "NewPassword123"
				}
				""";

		mockMvc.perform(post("/api/auth/login")
						.contentType(APPLICATION_JSON)
						.content(loginBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isNotEmpty());

		User updated = users.findById(user.getId()).orElseThrow();
		assertTrue(passwordEncoder.matches("NewPassword123", updated.getPasswordHash()));
	}

	private String extractOtpFromEmail() {
		String latestBody = resendEmailService.latestBody();
		assertNotNull(latestBody);
		Matcher matcher = Pattern.compile("\\b(\\d{6})\\b").matcher(latestBody);
		assertTrue(matcher.find(), "Expected OTP in email body");
		String otp = matcher.group(1);
		assertFalse(otp.isBlank(), "OTP should not be blank");
		return otp;
	}

	@Test
	void changePasswordWorksAfterProfileEmailUpdateWithSameToken() throws Exception {
		users.save(new User(
				"Profile User",
				"profile-old@test.com",
				passwordEncoder.encode("OldPassword123")
		));

		String loginBody = """
				{
				  "email": "profile-old@test.com",
				  "password": "OldPassword123"
				}
				""";

		String loginResponse = mockMvc.perform(post("/api/auth/login")
						.contentType(APPLICATION_JSON)
						.content(loginBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isNotEmpty())
				.andReturn()
				.getResponse()
				.getContentAsString();

		String token = objectMapper.readTree(loginResponse).get("token").asText();

		String updateProfileBody = """
				{
				  "fullName": "Profile User Updated",
				  "email": "profile-new@test.com"
				}
				""";

		String updateProfileResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/me")
						.header("Authorization", "Bearer " + token)
						.contentType(APPLICATION_JSON)
						.content(updateProfileBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.challengeId").isNotEmpty())
				.andReturn()
				.getResponse()
				.getContentAsString();

		JsonNode updateJson = objectMapper.readTree(updateProfileResponse);
		String challengeId = updateJson.get("challengeId").asText();
		String otp = extractOtpFromEmail();

		String verifyEmailBody = """
				{
				  "challengeId": "%s",
				  "otp": "%s"
				}
				""".formatted(challengeId, otp);

		mockMvc.perform(post("/api/me/email/verify")
						.header("Authorization", "Bearer " + token)
						.contentType(APPLICATION_JSON)
						.content(verifyEmailBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("profile-new@test.com"));

		String changePasswordBody = """
				{
				  "currentPassword": "OldPassword123",
				  "newPassword": "BrandNew123",
				  "confirmNewPassword": "BrandNew123"
				}
				""";

		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/me/password")
						.header("Authorization", "Bearer " + token)
						.contentType(APPLICATION_JSON)
						.content(changePasswordBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Password updated successfully"));

		String loginWithNewEmailBody = """
				{
				  "email": "profile-new@test.com",
				  "password": "BrandNew123"
				}
				""";

		mockMvc.perform(post("/api/auth/login")
						.contentType(APPLICATION_JSON)
						.content(loginWithNewEmailBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isNotEmpty());
	}

	@Test
	void shortUrlResponsesReturnIstTimestampsAndUpdateLastAccessedAt() throws Exception {
		User user = users.save(new User(
				"IST User",
				"ist-user@test.com",
				passwordEncoder.encode("Password123")
		));

		String token = jwtService.createToken(user.getId(), user.getEmail());

		String createBody = """
				{
				  "longUrl": "example.com",
				  "customAlias": "isttest"
				}
				""";

		String createResponse = mockMvc.perform(post("/api/urls")
						.header("Authorization", "Bearer " + token)
						.contentType(APPLICATION_JSON)
						.content(createBody))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andReturn()
				.getResponse()
				.getContentAsString();

		JsonNode createdJson = objectMapper.readTree(createResponse);
		assertTrue(createdJson.get("createdAt").asText().endsWith("+05:30"));
		assertTrue(createdJson.get("lastAccessedAt").isNull());

		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/isttest"))
				.andExpect(status().isFound());

		String statsResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/urls/isttest/stats")
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.clickCount").value(1))
				.andReturn()
				.getResponse()
				.getContentAsString();

		JsonNode statsJson = objectMapper.readTree(statsResponse);
		assertTrue(statsJson.get("createdAt").asText().endsWith("+05:30"));
		assertTrue(statsJson.get("lastAccessedAt").asText().endsWith("+05:30"));
	}

	@TestConfiguration
	static class TestEmailConfig {

		@Bean
		@Primary
		TestResendEmailService testResendEmailService(ObjectMapper objectMapper) {
			return new TestResendEmailService(objectMapper);
		}
	}

	static class TestResendEmailService extends ResendEmailService {
		private final List<String> bodies = new ArrayList<>();

		TestResendEmailService(ObjectMapper objectMapper) {
			super(objectMapper);
		}

		@Override
		public void sendTextEmail(String toEmail, String subject, String text) {
			bodies.add(text);
		}

		@Override
		public void sendTextEmail(String toEmail, String subject, String text, String replyTo) {
			bodies.add(text);
		}

		@Override
		public String getAppName() {
			return "shur.click";
		}

		String latestBody() {
			if (bodies.isEmpty()) {
				return null;
			}
			return bodies.get(bodies.size() - 1);
		}
	}

}
