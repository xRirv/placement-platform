// InterviewExperienceRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.InterviewExperience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import java.util.UUID;

public interface InterviewExperienceRepository extends JpaRepository<InterviewExperience, UUID> {
    Page<InterviewExperience> findByModerationStatus(String moderationStatus, Pageable pageable);
    Page<InterviewExperience> findByModerationStatusAndCompanyId(String moderationStatus, UUID companyId, Pageable pageable);
    Page<InterviewExperience> findByCompanyId(UUID companyId, Pageable pageable);
}