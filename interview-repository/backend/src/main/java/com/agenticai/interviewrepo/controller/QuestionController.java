package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.QuestionRequest;
import com.agenticai.interviewrepo.dto.QuestionResponse;
import com.agenticai.interviewrepo.service.QuestionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class QuestionController {
    private final QuestionService service;
    public QuestionController(QuestionService service) { this.service = service; }

    /** Question bank: questions from approved interview experiences, with optional filters. */
    @GetMapping("/api/questions")
    public Page<QuestionResponse> search(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) String topic,
                                         @RequestParam(required = false) String difficulty,
                                         @RequestParam(required = false) UUID companyId,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return service.search(q, topic, difficulty, companyId, PageRequest.of(Math.max(page, 0),
                Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/api/questions/topics")
    public List<String> topics() { return service.topics(); }

    @GetMapping("/api/questions/{id}")
    public QuestionResponse get(@PathVariable UUID id) { return service.get(id); }

    /** Submitter (before approval) or admin; enforced in the service. */
    @PostMapping("/api/interviews/{interviewId}/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionResponse add(@PathVariable UUID interviewId, @Valid @RequestBody QuestionRequest request) {
        return service.addToExperience(interviewId, request);
    }

    @PutMapping("/api/questions/{id}")
    public QuestionResponse update(@PathVariable UUID id, @Valid @RequestBody QuestionRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/api/questions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
