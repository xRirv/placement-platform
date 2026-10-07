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

    @GetMapping("/my")
    public Page<InterviewExperienceResponse> mine(@RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "50") int size) {
        return service.listMine(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "submittedAt")));
    }

    @PutMapping("/{id}")
    public InterviewExperienceResponse update(@PathVariable UUID id,
                                              @Valid @RequestBody InterviewExperienceRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

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

    /** Admin: send all approved experiences to the AI service (backfill). */
    @PostMapping("/ai-resync")
    @PreAuthorize("hasAnyAuthority('ADMIN','ROLE_ADMIN')")
    public java.util.Map<String, Integer> resyncToAi() {
        return java.util.Map.of("queued", service.resyncApprovedToAi());
    }

    @PatchMapping("/{id}/moderation")
    @PreAuthorize("hasAnyAuthority('ADMIN','ROLE_ADMIN')")
    public InterviewExperienceResponse moderate(@PathVariable UUID id,
                                                @Valid @RequestBody ModerationRequest request) {
        return service.moderate(id, request);
    }
}
