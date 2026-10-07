// MentorRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Mentor;
import com.agenticai.interviewrepo.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MentorRepository extends JpaRepository<Mentor, UUID> {
    Optional<Mentor> findByLogin(User user);
    Page<Mentor> findByNameContainingIgnoreCaseOrLogin_EmailContainingIgnoreCase(String name, String email, Pageable pageable);
    Page<Mentor> findByLogin_IsActive(Boolean isActive, Pageable pageable);
}