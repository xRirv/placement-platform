// QuestionRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
}