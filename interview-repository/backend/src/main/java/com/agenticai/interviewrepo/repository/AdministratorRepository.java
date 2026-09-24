// AdministratorRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Administrator;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AdministratorRepository extends JpaRepository<Administrator, UUID> {
}