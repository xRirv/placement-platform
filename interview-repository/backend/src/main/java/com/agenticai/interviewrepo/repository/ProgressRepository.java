// ProgressRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Progress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ProgressRepository extends JpaRepository<Progress, UUID> {
}