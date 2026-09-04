package com.sw1.casetool.dto.admin;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardMetricsResponse {
    private long totalUsers;
    private long totalSuperAdmins;
    private long totalArchitects;
    private long totalCollaborators;
    private long totalActiveUsers;
    private long totalInactiveUsers;
    private long totalProjects;
}
