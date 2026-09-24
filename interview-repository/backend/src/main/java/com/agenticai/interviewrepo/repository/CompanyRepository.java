// CompanyRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
}