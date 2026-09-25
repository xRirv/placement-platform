// StudentRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.Optional;
import com.agenticai.interviewrepo.model.User;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    Optional<Student> findByLogin(User login);
}