package com.sw1.casetool.service;

import com.sw1.casetool.dto.user.UpdatePreferencesRequest;
import com.sw1.casetool.dto.user.UserProfileDto;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceOnboardingTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private UserService userService;

    private UUID userId;
    private UserProfile testUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        Map<String, Object> initialPrefs = new HashMap<>();
        initialPrefs.put("theme", "dark");
        initialPrefs.put("grid", true);

        testUser = UserProfile.builder()
                .id(userId)
                .userId(userId)
                .email("architect@sw1.com")
                .fullName("Arquitecto Demo")
                .username("architect")
                .role("ARQUITECTO")
                .subscriptionPlan("COMMUNITY")
                .preferences(initialPrefs)
                .isActive(true)
                .build();
    }

    @Test
    void completeOnboarding_ShouldPersistTrueInPreferences() {
        when(userProfileRepository.findByEmailIgnoreCase("architect@sw1.com")).thenReturn(Optional.of(testUser));
        when(userProfileRepository.saveAndFlush(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileDto result = userService.completeOnboarding("architect@sw1.com");

        assertNotNull(result);
        assertNotNull(result.getPreferences());
        assertEquals(true, result.getPreferences().get("onboardingCompleted"));
        assertEquals("dark", result.getPreferences().get("theme"));

        ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
        verify(userProfileRepository).saveAndFlush(captor.capture());
        assertEquals(true, captor.getValue().getPreferences().get("onboardingCompleted"));
    }

    @Test
    void resetOnboarding_ShouldPersistFalseInPreferences() {
        testUser.getPreferences().put("onboardingCompleted", true);

        when(userProfileRepository.findByEmailIgnoreCase("architect@sw1.com")).thenReturn(Optional.of(testUser));
        when(userProfileRepository.saveAndFlush(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileDto result = userService.resetOnboarding("architect@sw1.com");

        assertNotNull(result);
        assertNotNull(result.getPreferences());
        assertEquals(false, result.getPreferences().get("onboardingCompleted"));

        ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
        verify(userProfileRepository).saveAndFlush(captor.capture());
        assertEquals(false, captor.getValue().getPreferences().get("onboardingCompleted"));
    }

    @Test
    void updatePreferences_ShouldSupportOnboardingFlag() {
        when(userProfileRepository.findByEmailIgnoreCase("architect@sw1.com")).thenReturn(Optional.of(testUser));
        when(userProfileRepository.saveAndFlush(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdatePreferencesRequest request = UpdatePreferencesRequest.builder()
                .theme("dark")
                .grid(false)
                .onboardingCompleted(true)
                .build();

        UserProfileDto result = userService.updatePreferences("architect@sw1.com", request);

        assertNotNull(result);
        assertEquals(true, result.getPreferences().get("onboardingCompleted"));
        assertEquals(false, result.getPreferences().get("grid"));
    }

    @Test
    void completeOnboarding_UserNotFound_ShouldThrowException() {
        when(userProfileRepository.findByEmailIgnoreCase("unknown@sw1.com")).thenReturn(Optional.empty());
        when(userProfileRepository.findByUsernameIgnoreCase("unknown@sw1.com")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> {
            userService.completeOnboarding("unknown@sw1.com");
        });

        verify(userProfileRepository, never()).saveAndFlush(any());
    }
}
