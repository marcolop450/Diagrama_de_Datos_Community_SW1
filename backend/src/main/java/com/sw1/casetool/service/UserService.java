package com.sw1.casetool.service;

import com.sw1.casetool.dto.user.ChangePasswordRequest;
import com.sw1.casetool.dto.user.UpdatePreferencesRequest;
import com.sw1.casetool.dto.user.UpdateProfileRequest;
import com.sw1.casetool.dto.user.UserProfileDto;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;

    private UserProfile findUser(String identifier) {
        return userProfileRepository.findByEmailIgnoreCase(identifier)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(identifier)
                        .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con identificador: " + identifier)));
    }

    @Transactional(readOnly = true)
    public UserProfileDto getProfileByEmail(String email) {
        UserProfile user = findUser(email);
        return mapToDto(user);
    }

    @Transactional
    public UserProfileDto updateProfile(String email, UpdateProfileRequest request) {
        UserProfile user = findUser(email);

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            String newUsername = request.getUsername().trim();
            if (!newUsername.equalsIgnoreCase(user.getUsername()) && userProfileRepository.existsByUsernameIgnoreCase(newUsername)) {
                throw new IllegalArgumentException("El nombre de usuario ya se encuentra en uso");
            }
            user.setUsername(newUsername);
        }

        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }

        UserProfile saved = userProfileRepository.saveAndFlush(user);
        return mapToDto(saved);
    }

    @Transactional
    public UserProfileDto updatePreferences(String email, UpdatePreferencesRequest request) {
        UserProfile user = findUser(email);

        Map<String, Object> currentPrefs = user.getPreferences() != null
                ? new HashMap<>(user.getPreferences())
                : new HashMap<>();

        if (request.getTheme() != null) {
            currentPrefs.put("theme", request.getTheme());
        }
        if (request.getGrid() != null) {
            currentPrefs.put("grid", request.getGrid());
        }
        if (request.getSnapToGrid() != null) {
            currentPrefs.put("snapToGrid", request.getSnapToGrid());
        }
        if (request.getAutoSaveInterval() != null) {
            currentPrefs.put("autoSaveInterval", request.getAutoSaveInterval());
        }
        if (request.getDefaultZoom() != null) {
            currentPrefs.put("defaultZoom", request.getDefaultZoom());
        }
        if (request.getCustomSettings() != null) {
            currentPrefs.putAll(request.getCustomSettings());
        }

        user.setPreferences(currentPrefs);
        UserProfile saved = userProfileRepository.saveAndFlush(user);
        return mapToDto(saved);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        UserProfile user = findUser(email);

        if (user.getPasswordHash() != null && !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("La contrasena actual no es correcta");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userProfileRepository.saveAndFlush(user);
    }

    private UserProfileDto mapToDto(UserProfile user) {
        return UserProfileDto.builder()
                .userId(user.getUserId() != null ? user.getUserId() : user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .subscriptionPlan(user.getSubscriptionPlan())
                .subscriptionExpiresAt(user.getSubscriptionExpiresAt())
                .preferences(user.getPreferences())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
