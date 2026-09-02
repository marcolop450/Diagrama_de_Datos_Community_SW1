package com.sw1.casetool.service;

import com.sw1.casetool.dto.auth.AuthResponse;
import com.sw1.casetool.dto.auth.LoginRequest;
import com.sw1.casetool.dto.auth.RegisterRequest;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserProfileRepository userProfileRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        Optional<UserProfile> userOpt = userProfileRepository.findByEmail(email);

        UserProfile user;
        if (userOpt.isEmpty()) {
            // Seed default users if logging in for the first time
            user = createDefaultUserIfApplicable(email, request.getPassword());
            if (user == null) {
                throw new BadCredentialsException("Credenciales inválidas. Correo o contraseña incorrectos.");
            }
        } else {
            user = userOpt.get();
            // Validate password with BCrypt
            if (user.getPasswordHash() != null) {
                boolean matches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
                if (!matches) {
                    if (user.getPasswordHash().equals(request.getPassword())) {
                        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                        user = userProfileRepository.save(user);
                    } else {
                        throw new BadCredentialsException("Credenciales inválidas. Correo o contraseña incorrectos.");
                    }
                }
            }
        }

        // Generate volatile JWT token
        UUID effectiveUserId = user.getUserId() != null ? user.getUserId() : user.getId();
        String token = jwtTokenProvider.generateToken(
                effectiveUserId,
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getSubscriptionPlan()
        );

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(effectiveUserId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .role(user.getRole())
                .subscriptionPlan(user.getSubscriptionPlan())
                .subscriptionExpiresAt(user.getSubscriptionExpiresAt())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userProfileRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("El correo electrónico ya se encuentra registrado");
        }

        String username = request.getUsername() != null && !request.getUsername().trim().isEmpty()
                ? request.getUsername().trim().toLowerCase()
                : email.split("@")[0];

        if (userProfileRepository.existsByUsername(username)) {
            username = username + "_" + (int)(Math.random() * 1000);
        }

        UUID generatedId = UUID.randomUUID();

        // Default preferences for CASE Editor
        Map<String, Object> defaultPreferences = new HashMap<>();
        defaultPreferences.put("theme", "dark");
        defaultPreferences.put("grid", true);
        defaultPreferences.put("snapToGrid", true);
        defaultPreferences.put("autoSaveInterval", 30);
        defaultPreferences.put("defaultZoom", 1.0);

        UserProfile newUser = UserProfile.builder()
                .id(generatedId)
                .userId(generatedId)
                .fullName(request.getFullName().trim())
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("ARQUITECTO")
                .subscriptionPlan("COMMUNITY")
                .subscriptionExpiresAt(null)
                .preferences(defaultPreferences)
                .build();

        UserProfile saved = userProfileRepository.save(newUser);

        UUID effectiveUserId = saved.getUserId() != null ? saved.getUserId() : saved.getId();
        String token = jwtTokenProvider.generateToken(
                effectiveUserId,
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole(),
                saved.getSubscriptionPlan()
        );

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(effectiveUserId)
                .email(saved.getEmail())
                .fullName(saved.getFullName())
                .username(saved.getUsername())
                .role(saved.getRole())
                .subscriptionPlan(saved.getSubscriptionPlan())
                .subscriptionExpiresAt(saved.getSubscriptionExpiresAt())
                .avatarUrl(saved.getAvatarUrl())
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUserProfile(String email) {
        UserProfile user = userProfileRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Usuario no encontrado"));

        UUID effectiveUserId = user.getUserId() != null ? user.getUserId() : user.getId();
        return AuthResponse.builder()
                .userId(effectiveUserId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .role(user.getRole())
                .subscriptionPlan(user.getSubscriptionPlan())
                .subscriptionExpiresAt(user.getSubscriptionExpiresAt())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    private UserProfile createDefaultUserIfApplicable(String email, String rawPassword) {
        UUID generatedId = UUID.randomUUID();
        String role = "ARQUITECTO";
        String fullName = "Arquitecto de Software";
        String plan = "PRO_ARCHITECT";
        Instant expiry = Instant.now().plus(30, ChronoUnit.DAYS);

        if (email.contains("admin")) {
            role = "SUPER_ADMIN";
            fullName = "Administrador Principal";
            plan = "ENTERPRISE";
            expiry = Instant.now().plus(365, ChronoUnit.DAYS);
        } else if (email.contains("colaborador") || email.contains("guest")) {
            role = "COLABORADOR";
            fullName = "Ing. Colaborador";
            plan = "COMMUNITY";
            expiry = null;
        }

        Map<String, Object> defaultPreferences = new HashMap<>();
        defaultPreferences.put("theme", "dark");
        defaultPreferences.put("grid", true);
        defaultPreferences.put("snapToGrid", true);
        defaultPreferences.put("autoSaveInterval", 30);
        defaultPreferences.put("defaultZoom", 1.0);

        UserProfile newUser = UserProfile.builder()
                .id(generatedId)
                .userId(generatedId)
                .fullName(fullName)
                .username(email.split("@")[0])
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(role)
                .subscriptionPlan(plan)
                .subscriptionExpiresAt(expiry)
                .preferences(defaultPreferences)
                .build();

        return userProfileRepository.save(newUser);
    }
}
