package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.*;
import com.agenticai.interviewrepo.service.InterviewExperienceService;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/interviews")
public class InterviewExperienceController {
    private final InterviewExperienceService service;
    public InterviewExperienceController(InterviewExperienceService service) { this.service = service; }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ALUMNI','ROLE_ALUMNI','ADMIN','ROLE_ADMIN')")
    public InterviewExperienceResponse create(@Valid @RequestBody InterviewExperienceRequest request) {
        return service.create(request);
    }

    @GetMapping
    public Page<InterviewExperienceResponse> list(
            @RequestParam(required = false) UUID companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "submittedAt,desc") String sort) {
        String[] parts = sort.split(",", 2);
        Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1])
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return service.list(companyId, false, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(direction, parts[0])));
    }

    @GetMapping("/{id}")
    public InterviewExperienceResponse get(@PathVariable UUID id) { return service.get(id); }

    @GetMapping("/moderation")
    @PreAuthorize("hasAnyAuthority('ADMIN','ROLE_ADMIN')")
    public Page<InterviewExperienceResponse> moderationQueue(
            @RequestParam(required = false) UUID companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(companyId, true, PageRequest.of(Math.max(page, 0),
                Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.ASC, "submittedAt")));
    }

    @PatchMapping("/{id}/moderation")
    @PreAuthorize("hasAnyAuthority('ADMIN','ROLE_ADMIN')")
    public InterviewExperienceResponse moderate(@PathVariable UUID id,
                                                @Valid @RequestBody ModerationRequest request) {
        return service.moderate(id, request);
    }
}
