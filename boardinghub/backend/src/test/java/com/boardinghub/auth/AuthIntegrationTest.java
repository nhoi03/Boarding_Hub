package com.boardinghub.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:auth;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
    "spring.datasource.password=", "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
    "BOARDINGHUB_ADMIN_EMAIL=", "BOARDINGHUB_ADMIN_PASSWORD="
})
@AutoConfigureMockMvc
class AuthIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @BeforeEach void clean() { users.deleteAll(); }

    @Test void requestLoggingRedactsCredentials() {
        assertThat(new AuthController.LoginRequest("test@example.com", "secret123", null).toString())
            .doesNotContain("secret123", "test@example.com");
        assertThat(new AuthController.RegisterRequest("Test User", "test@example.com", "secret123").toString())
            .doesNotContain("secret123", "test@example.com");
    }

    @Test void registrationAlwaysCreatesUserAndHashesPassword() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"fullName\":\"Test User\",\"email\":\"TEST@example.com\",\"password\":\"password123\",\"role\":\"ADMIN\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("USER"))
            .andExpect(jsonPath("$.email").value("test@example.com")).andExpect(jsonPath("$.passwordHash").doesNotExist());
        var account = users.findByEmail("test@example.com").orElseThrow();
        assertThat(account.passwordHash).isNotEqualTo("password123");
        assertThat(passwords.matches("password123", account.passwordHash)).isTrue();
    }
    @Test void ownerRegistrationCreatesOwnerAndLoginPersistsRole() throws Exception {
        mvc.perform(post("/api/v1/auth/register-owner").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"fullName\":\"Test Owner\",\"email\":\"test@example.com\",\"password\":\"password123\",\"role\":\"ADMIN\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("OWNER"));
        var result = mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"test@example.com\",\"password\":\"password123\",\"accountType\":\"OWNER\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("OWNER")).andReturn();
        var session = (MockHttpSession)result.getRequest().getSession(false);
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("OWNER"));
        mvc.perform(get("/api/v1/admin/users").session(session)).andExpect(status().isForbidden());
        // Existing business APIs have no ownership scoping and remain administrator-only.
        mvc.perform(get("/api/v1/rooms").session(session)).andExpect(status().isForbidden());
    }
    @Test void wrongLoginAreaDoesNotCreateAuthenticatedSession() throws Exception {
        seed("USER");
        var result = mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"test@example.com\",\"password\":\"password123\",\"accountType\":\"OWNER\"}"))
            .andExpect(status().isForbidden()).andReturn();
        var session = (MockHttpSession)result.getRequest().getSession(false);
        if (session != null) mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isUnauthorized());
    }
    @Test void ownerCannotLoginAsAdministrator() throws Exception {
        seed("OWNER");
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"test@example.com\",\"password\":\"password123\",\"accountType\":\"ADMIN\"}"))
            .andExpect(status().isForbidden());
    }
    @Test void duplicateEmailIsCaseInsensitive() throws Exception {
        seed("USER");
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"fullName\":\"Other User\",\"email\":\"TEST@example.com\",\"password\":\"password123\"}"))
            .andExpect(status().isConflict());
    }
    @Test void rejectsInvalidRegistrationAndOversizedUtf8Password() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"fullName\":\" \",\"email\":\"wrong\",\"password\":\"short\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(java.util.Map.of("fullName","Test", "email","test@example.com", "password","ậ".repeat(30)))))
            .andExpect(status().isBadRequest());
    }
    @Test void anonymousCannotReadBusinessOrAdminData() throws Exception {
        mvc.perform(get("/api/v1/rooms")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void loginRejectsWrongPassword() throws Exception {
        seed("USER");
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"test@example.com\",\"password\":\"incorrect\"}"))
            .andExpect(status().isUnauthorized());
    }
    @Test void loginPersistsSessionAndLogoutRevokesIt() throws Exception {
        seed("USER");
        var oldSession = new MockHttpSession();
        String oldId = oldSession.getId();
        var result = mvc.perform(post("/api/v1/auth/login").session(oldSession).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"TEST@example.com\",\"password\":\"password123\"}"))
            .andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session.getId()).isNotEqualTo(oldId);
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("USER"));
        mvc.perform(get("/api/v1/admin/users").session(session)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/rooms").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void administratorCanListUsersWithoutPasswordHashes() throws Exception {
        seed("ADMIN");
        mvc.perform(get("/api/v1/admin/users").with(user("test@example.com").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].email").value("test@example.com"))
            .andExpect(jsonPath("$.items[0].passwordHash").doesNotExist());
    }
    @Test void csrfIsRequiredAndEndpointSuppliesWorkingToken() throws Exception {
        String payload = "{\"fullName\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}";
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isForbidden());
        var result = mvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn();
        var token = json.readTree(result.getResponse().getContentAsString());
        mvc.perform(post("/api/v1/auth/register").session((MockHttpSession)result.getRequest().getSession(false))
            .header(token.get("headerName").asText(), token.get("token").asText()).contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isCreated());
    }
    private void seed(String role) { users.saveAndFlush(new AppUser("Test User", "test@example.com", passwords.encode("password123"),role)); }
}
