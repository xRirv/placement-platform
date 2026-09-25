// AdministratorRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Administrator;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.Optional;
import com.agenticai.interviewrepo.model.User;

public interface AdministratorRepository extends JpaRepository<Administrator, UUID> {
    Optional<Administrator> findByLogin(User login);
}