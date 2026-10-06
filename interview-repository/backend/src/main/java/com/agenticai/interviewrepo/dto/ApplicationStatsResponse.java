package com.agenticai.interviewrepo.dto;

import java.util.Map;

public record ApplicationStatsResponse(
        long total,
        long applied,
        long oa,
        long interviewing,
        long offer,
        long rejected,
        Map<String, Long> statusBreakdown
) {
}
