package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID>, JpaSpecificationExecutor<Question> {
    List<Question> findByInterview_IdAndRoundIsNull(UUID interviewId);

    @Query("select distinct q.topic from Question q where q.interview.moderationStatus = 'APPROVED' "
            + "and q.topic is not null and q.topic <> '' order by q.topic")
    List<String> findApprovedTopics();
}
