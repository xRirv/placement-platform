// MentorRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Mentor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface MentorRepository extends JpaRepository<Mentor, UUID> {
}