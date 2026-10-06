package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Company;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    Page<Company> findByNameContainingIgnoreCase(String name, Pageable pageable);

    Page<Company> findByIndustryIgnoreCase(String industry, Pageable pageable);

    Page<Company> findByNameContainingIgnoreCaseAndIndustryIgnoreCase(String name, String industry, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);

    Optional<Company> findByNameIgnoreCase(String name);
}