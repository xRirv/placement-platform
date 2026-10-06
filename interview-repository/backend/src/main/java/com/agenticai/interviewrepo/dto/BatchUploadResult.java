package com.agenticai.interviewrepo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchUploadResult {
    private int totalProcessed;
    private int successCount;
    private int failureCount;

    @Builder.Default
    private List<String> errors = new ArrayList<>();

    @Builder.Default
    private List<BatchUploadSuccess> successRecords = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchUploadSuccess {
        private String email;
        private String name;
        private String id;
        private String generatedPassword;
    }
}
