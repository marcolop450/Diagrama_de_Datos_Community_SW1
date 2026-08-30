package com.sw1.casetool.dto;

import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FullDiagramResponse {
    private DiagramProject project;
    private List<ClassNode> classNodes;
    private List<Relationship> relationships;
}
