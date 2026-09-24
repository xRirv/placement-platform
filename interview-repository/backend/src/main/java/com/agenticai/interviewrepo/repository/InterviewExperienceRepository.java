// InterviewExperienceRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.InterviewExperience;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface InterviewExperienceRepository extends JpaRepository<InterviewExperience, UUID> {
}