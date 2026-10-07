package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Progress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProgressRepository extends JpaRepository<Progress, UUID> {
    List<Progress> findByStudyPlan_IdOrderByPriorityAscCreatedAtAsc(UUID studyPlanId);
    List<Progress> findByStudyPlan_Student_Id(UUID studentId);
    void deleteByStudyPlan_Id(UUID studyPlanId);
}
