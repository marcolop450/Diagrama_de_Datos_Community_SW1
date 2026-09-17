package com.sw1.casetool.service;

import com.sw1.casetool.dto.architect.CollaboratorResponse;
import com.sw1.casetool.dto.architect.CreateCollaboratorRequest;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArchitectCollaboratorServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private ArchitectCollaboratorService collaboratorService;

    private UUID architectId;
    private UserProfile architectUser;
    private UUID collaboratorId;
    private UserProfile collaboratorUser;

    @BeforeEach
    void setUp() {
        architectId = UUID.randomUUID();
        architectUser = UserProfile.builder()
                .id(architectId)
                .userId(architectId)
                .fullName("Arq. Lead")
                .username("arq_lead")
                .email("lead@sw1.com")
                .role("ARQUITECTO")
                .isActive(true)
                .build();

        collaboratorId = UUID.randomUUID();
        collaboratorUser = UserProfile.builder()
                .id(collaboratorId)
                .userId(collaboratorId)
                .fullName("Ing. Colaborador")
                .username("colab1")
                .email("colab1@sw1.com")
                .role("COLABORADOR")
                .architectId(architectId)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("Architect successfully lists collaborators from their team")
    void testGetCollaborators_Success() {
        when(userProfileRepository.findByEmailIgnoreCase("lead@sw1.com")).thenReturn(Optional.of(architectUser));
        when(userProfileRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(collaboratorUser));

        List<CollaboratorResponse> result = collaboratorService.getCollaborators("lead@sw1.com", null);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("colab1@sw1.com", result.get(0).getEmail());
        assertEquals("COLABORADOR", result.get(0).getRole());
    }

    @Test
    @DisplayName("Architect successfully registers a new collaborator in their team")
    void testCreateCollaborator_Success() {
        CreateCollaboratorRequest request = CreateCollaboratorRequest.builder()
                .fullName("Nuevo Colaborador")
                .username("new_colab")
                .email("new_colab@sw1.com")
                .password("Password123!")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("lead@sw1.com")).thenReturn(Optional.of(architectUser));
        when(userProfileRepository.existsByEmailIgnoreCase("new_colab@sw1.com")).thenReturn(false);
        when(userProfileRepository.existsByUsernameIgnoreCase("new_colab")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$10$hashed");
        when(userProfileRepository.saveAndFlush(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CollaboratorResponse response = collaboratorService.createCollaborator(
                request,
                "lead@sw1.com",
                "127.0.0.1",
                "JUnit"
        );

        assertNotNull(response);
        assertEquals("new_colab@sw1.com", response.getEmail());
        assertEquals("COLABORADOR", response.getRole());
        assertEquals(architectId, response.getArchitectId());
        verify(userProfileRepository).saveAndFlush(any(UserProfile.class));
    }

    @Test
    @DisplayName("Collaborator role cannot register other collaborators")
    void testCreateCollaborator_Unauthorized() {
        UserProfile nonArchitect = UserProfile.builder()
                .id(UUID.randomUUID())
                .role("COLABORADOR")
                .email("other@sw1.com")
                .build();

        when(userProfileRepository.findByEmailIgnoreCase("other@sw1.com")).thenReturn(Optional.of(nonArchitect));

        CreateCollaboratorRequest request = CreateCollaboratorRequest.builder()
                .fullName("Test")
                .username("test")
                .email("test@sw1.com")
                .password("pass123")
                .build();

        assertThrows(AccessDeniedException.class, () ->
                collaboratorService.createCollaborator(request, "other@sw1.com", "127.0.0.1", "JUnit")
        );
    }
}
