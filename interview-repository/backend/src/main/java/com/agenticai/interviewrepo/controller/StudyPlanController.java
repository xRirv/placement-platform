package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.StudyPlanGenerateRequest;
import com.agenticai.interviewrepo.dto.StudyPlanResponse;
import com.agenticai.interviewrepo.dto.StudyPlanUpdateRequest;
import com.agenticai.interviewrepo.service.StudyPlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/study-plans")
public class StudyPlanController {
    private final StudyPlanService service;
    public StudyPlanController(StudyPlanService service) { this.service = service; }

    /** Generates a plan with the AI service (Team B) and stores it with one progress item per topic. */
    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public StudyPlanResponse generate(@Valid @RequestBody StudyPlanGenerateRequest request) {
        return service.generate(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public List<StudyPlanResponse> listMine() { return service.listMine(); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT','ADMIN','ROLE_ADMIN')")
    public StudyPlanResponse get(@PathVariable UUID id) { return service.get(id); }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public StudyPlanResponse update(@PathVariable UUID id, @Valid @RequestBody StudyPlanUpdateRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyAuthority('STUDENT','ROLE_STUDENT')")
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
