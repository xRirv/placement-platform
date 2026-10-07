// StudentRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import com.agenticai.interviewrepo.model.User;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    Optional<Student> findByLogin(User login);
    Page<Student> findByNameContainingIgnoreCaseOrLogin_EmailContainingIgnoreCase(String name, String email, Pageable pageable);
    Page<Student> findByLogin_IsActive(Boolean isActive, Pageable pageable);
    List<Student> findByMentor_Id(UUID mentorId);
}