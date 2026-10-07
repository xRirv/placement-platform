// StudyPlanRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.StudyPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface StudyPlanRepository extends JpaRepository<StudyPlan, UUID> {
}