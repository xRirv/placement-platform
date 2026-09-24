// ApplicationRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {
}