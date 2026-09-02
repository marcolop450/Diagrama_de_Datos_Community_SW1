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

    private static Map<String, Object> buildDefaultPreferences() {
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("theme", "dark");
        prefs.put("grid", true);
        prefs.put("snapToGrid", true);
        prefs.put("autoSaveInterval", 30);
        prefs.put("defaultZoom", 1.0);
        return prefs;
    }

    private AuthResponse toAuthResponse(UserProfile user, String token) {
        UUID effectiveUserId = user.getUserId() != null ? user.getUserId() : user.getId();
        AuthResponse.AuthResponseBuilder builder = AuthResponse.builder()
                .userId(effectiveUserId)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .role(user.getRole())
                .subscriptionPlan(user.getSubscriptionPlan())
                .subscriptionExpiresAt(user.getSubscriptionExpiresAt())
                .avatarUrl(user.getAvatarUrl())
                .preferences(user.getPreferences());
        if (token != null) {
            builder.token(token).tokenType("Bearer");
        }
        return builder.build();
    }

    private String generateToken(UserProfile user) {
        UUID effectiveUserId = user.getUserId() != null ? user.getUserId() : user.getId();
        return jwtTokenProvider.generateToken(
                effectiveUserId,
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getSubscriptionPlan()
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getEmail().trim();
        
        // Find user by either email OR username (case-insensitive)
        Optional<UserProfile> userOpt = userProfileRepository.findByEmailIgnoreCase(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userProfileRepository.findByUsernameIgnoreCase(identifier);
        }

        UserProfile user;
        if (userOpt.isEmpty()) {
            // Seed default users if logging in for the first time with standard emails
            user = createDefaultUserIfApplicable(identifier, request.getPassword());
            if (user == null) {
                throw new BadCredentialsException("Credenciales invalidas. Correo/Usuario o contrasena incorrectos.");
            }
        } else {
            user = userOpt.get();
            if (user.getPasswordHash() != null) {
                boolean matches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
                if (!matches) {
                    if (user.getPasswordHash().equals(request.getPassword())) {
                        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                        user = userProfileRepository.saveAndFlush(user);
                    } else {
                        throw new BadCredentialsException("Credenciales invalidas. Correo/Usuario o contrasena incorrectos.");
                    }
                }
            }
        }

        return toAuthResponse(user, generateToken(user));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userProfileRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("El correo electronico ya se encuentra registrado");
        }

        String username = request.getUsername().trim();

        if (userProfileRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("El nombre de usuario '" + username + "' ya se encuentra en uso. Elige otro.");
        }

        UUID newId = UUID.randomUUID();

        UserProfile newUser = UserProfile.builder()
                .id(newId)
                .userId(newId)
                .fullName(request.getFullName().trim())
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("ARQUITECTO")
                .subscriptionPlan("COMMUNITY")
                .subscriptionExpiresAt(null)
                .preferences(buildDefaultPreferences())
                .build();

        UserProfile saved = userProfileRepository.saveAndFlush(newUser);
        return toAuthResponse(saved, generateToken(saved));
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUserProfile(String email) {
        UserProfile user = userProfileRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(email)
                        .orElseThrow(() -> new BadCredentialsException("Usuario no encontrado")));
        return toAuthResponse(user, null);
    }

    private UserProfile createDefaultUserIfApplicable(String identifier, String rawPassword) {
        String lower = identifier.toLowerCase();
        if (!lower.contains("@") && !lower.contains("admin") && !lower.contains("arquitecto") && !lower.contains("colaborador")) {
            return null;
        }

        String role = "ARQUITECTO";
        String fullName = "Arquitecto de Software";
        String plan = "PRO_ARCHITECT";
        Instant expiry = Instant.now().plus(30, ChronoUnit.DAYS);
        String email = lower.contains("@") ? lower : lower + "@sw1.com";
        String username = lower.contains("@") ? lower.split("@")[0] : lower;

        if (lower.contains("admin")) {
            role = "SUPER_ADMIN";
            fullName = "Administrador Principal";
            plan = "ENTERPRISE";
            expiry = Instant.now().plus(365, ChronoUnit.DAYS);
        } else if (lower.contains("colaborador") || lower.contains("guest")) {
            role = "COLABORADOR";
            fullName = "Ing. Colaborador";
            plan = "COMMUNITY";
            expiry = null;
        }

        UUID newId = UUID.randomUUID();

        UserProfile newUser = UserProfile.builder()
                .id(newId)
                .userId(newId)
                .fullName(fullName)
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(role)
                .subscriptionPlan(plan)
                .subscriptionExpiresAt(expiry)
                .preferences(buildDefaultPreferences())
                .build();

        return userProfileRepository.saveAndFlush(newUser);
    }
}
