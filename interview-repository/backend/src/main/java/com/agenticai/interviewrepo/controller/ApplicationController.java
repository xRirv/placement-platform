package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.ApplicationRequest;
import com.agenticai.interviewrepo.dto.ApplicationResponse;
import com.agenticai.interviewrepo.dto.ApplicationStatsResponse;
import com.agenticai.interviewrepo.dto.ApplicationStatusUpdateRequest;
import com.agenticai.interviewrepo.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public ResponseEntity<ApplicationResponse> createApplication(@Valid @RequestBody ApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public ResponseEntity<Page<ApplicationResponse>> listApplications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "appliedDate,desc") String sort) {

        String[] parts = sort.split(",", 2);
        Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1])
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = parts[0].trim();

        PageRequest pageRequest = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(direction, property)
        );

        return ResponseEntity.ok(applicationService.list(status, studentId, pageRequest));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public ResponseEntity<ApplicationResponse> getApplication(@PathVariable UUID id) {
        return ResponseEntity.ok(applicationService.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public ResponseEntity<ApplicationResponse> updateApplication(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationRequest request) {
        return ResponseEntity.ok(applicationService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public ResponseEntity<ApplicationResponse> updateApplicationStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationStatusUpdateRequest request) {
        return ResponseEntity.ok(applicationService.updateStatus(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public ResponseEntity<Void> deleteApplication(@PathVariable UUID id) {
        applicationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public ResponseEntity<ApplicationStatsResponse> getApplicationStats(
            @RequestParam(required = false) UUID studentId) {
        return ResponseEntity.ok(applicationService.getStats(studentId));
    }
}
