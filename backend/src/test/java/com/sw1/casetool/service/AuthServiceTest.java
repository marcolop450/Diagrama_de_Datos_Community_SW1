package com.sw1.casetool.service;

import com.sw1.casetool.dto.auth.AuthResponse;
import com.sw1.casetool.dto.auth.LoginRequest;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuthService authService;

    private UUID userId;
    private UserProfile activeUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        activeUser = UserProfile.builder()
                .id(userId)
                .userId(userId)
                .email("test@sw1.com")
                .username("testuser")
                .fullName("Test User")
                .passwordHash("$2a$10$encodedPassword")
                .role("ARQUITECTO")
                .subscriptionPlan("COMMUNITY")
                .isActive(true)
                .build();
    }

    @Test
    void testLogin_Success_DoesNotLogAudit() {
        LoginRequest request = new LoginRequest("test@sw1.com", "Password123!");

        when(userProfileRepository.findByEmailIgnoreCase("test@sw1.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("Password123!", "$2a$10$encodedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(), any(), any(), any(), any())).thenReturn("mock-token");

        AuthResponse response = authService.login(request, "192.168.1.1", "Mozilla");

        assertNotNull(response);
        assertEquals("test@sw1.com", response.getEmail());
        assertEquals("mock-token", response.getToken());

        // Verify successful login does NOT log audit to prevent database saturation
        verify(auditLogService, never()).recordAction(any(), eq("AUTH_LOGIN_SUCCESS"), any(), any(), any(), any(), any());
    }

    @Test
    void testLogin_InvalidPassword_RecordsAuthFailure() {
        LoginRequest request = new LoginRequest("test@sw1.com", "WrongPassword!");

        when(userProfileRepository.findByEmailIgnoreCase("test@sw1.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("WrongPassword!", "$2a$10$encodedPassword")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () ->
                authService.login(request, "192.168.1.1", "Mozilla")
        );

        ArgumentCaptor<Map<String, Object>> detailsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(auditLogService, times(1)).recordAction(
                eq(userId),
                eq("AUTH_LOGIN_FAILED"),
                eq("security"),
                eq(userId),
                eq("192.168.1.1"),
                eq("Mozilla"),
                detailsCaptor.capture()
        );

        Map<String, Object> details = detailsCaptor.getValue();
        assertEquals("test@sw1.com", details.get("attemptedIdentifier"));
        assertEquals("INVALID_PASSWORD", details.get("reason"));
    }

    @Test
    void testLogin_UserNotFound_RecordsAuthFailure() {
        LoginRequest request = new LoginRequest("nonexistent@sw1.com", "Password123!");

        when(userProfileRepository.findByEmailIgnoreCase("nonexistent@sw1.com")).thenReturn(Optional.empty());
        when(userProfileRepository.findByUsernameIgnoreCase("nonexistent@sw1.com")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () ->
                authService.login(request, "10.0.0.5", "Chrome")
        );

        ArgumentCaptor<Map<String, Object>> detailsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(auditLogService, times(1)).recordAction(
                isNull(),
                eq("AUTH_LOGIN_FAILED"),
                eq("security"),
                isNull(),
                eq("10.0.0.5"),
                eq("Chrome"),
                detailsCaptor.capture()
        );

        Map<String, Object> details = detailsCaptor.getValue();
        assertEquals("nonexistent@sw1.com", details.get("attemptedIdentifier"));
        assertEquals("USER_NOT_FOUND", details.get("reason"));
    }

    @Test
    void testLogin_AccountSuspended_RecordsAuthFailure() {
        activeUser.setIsActive(false);
        LoginRequest request = new LoginRequest("test@sw1.com", "Password123!");

        when(userProfileRepository.findByEmailIgnoreCase("test@sw1.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("Password123!", "$2a$10$encodedPassword")).thenReturn(true);

        assertThrows(BadCredentialsException.class, () ->
                authService.login(request, "10.0.0.9", "Edge")
        );

        ArgumentCaptor<Map<String, Object>> detailsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(auditLogService, times(1)).recordAction(
                eq(userId),
                eq("AUTH_LOGIN_FAILED"),
                eq("security"),
                eq(userId),
                eq("10.0.0.9"),
                eq("Edge"),
                detailsCaptor.capture()
        );

        Map<String, Object> details = detailsCaptor.getValue();
        assertEquals("ACCOUNT_SUSPENDED", details.get("reason"));
    }
}
