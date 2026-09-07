package com.sw1.casetool.service;

import com.sw1.casetool.dto.TemplateResponse;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.DomainTemplate;
import com.sw1.casetool.repository.DomainTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateService {

    private final DomainTemplateRepository templateRepository;

    @Transactional(readOnly = true)
    public List<TemplateResponse> getAllTemplates() {
        return templateRepository.findAllByOrderByCategoryAscNameAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TemplateResponse getTemplateById(String id) {
        DomainTemplate template = getDomainTemplateEntity(id);
        return toResponse(template);
    }

    @Transactional(readOnly = true)
    public DomainTemplate getDomainTemplateEntity(String id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plantilla no encontrada con ID: " + id));
    }

    @SuppressWarnings("unchecked")
    private TemplateResponse toResponse(DomainTemplate template) {
        int nodeCount = 0;
        int edgeCount = 0;

        if (template.getInitialSchema() != null) {
            Object nodesObj = template.getInitialSchema().get("nodes");
            if (nodesObj instanceof List<?>) {
                nodeCount = ((List<?>) nodesObj).size();
            }
            Object edgesObj = template.getInitialSchema().get("edges");
            if (edgesObj instanceof List<?>) {
                edgeCount = ((List<?>) edgesObj).size();
            }
        }

        return TemplateResponse.builder()
                .id(template.getId())
                .name(template.getName())
                .category(template.getCategory())
                .description(template.getDescription())
                .thumbnailUrl(template.getThumbnailUrl())
                .nodeCount(nodeCount)
                .edgeCount(edgeCount)
                .initialSchema(template.getInitialSchema())
                .createdAt(template.getCreatedAt())
                .build();
    }
}
