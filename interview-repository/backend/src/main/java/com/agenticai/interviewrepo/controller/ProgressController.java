package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.ProgressRequest;
import com.agenticai.interviewrepo.dto.ProgressResponse;
import com.agenticai.interviewrepo.dto.ProgressSummaryResponse;
import com.agenticai.interviewrepo.service.ProgressService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {
    private final ProgressService service;
    public ProgressController(ProgressService service) { this.service = service; }

    /** The current student's progress across all study plans. */
    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public ProgressSummaryResponse summary() { return service.summary(); }

    @GetMapping("/plan/{studyPlanId}")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public List<ProgressResponse> listForPlan(@PathVariable UUID studyPlanId) {
        return service.listForPlan(studyPlanId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public ProgressResponse create(@Valid @RequestBody ProgressRequest request) { return service.create(request); }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public ProgressResponse update(@PathVariable UUID id, @Valid @RequestBody ProgressRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
