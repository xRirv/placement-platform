package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.CompanyRequest;
import com.agenticai.interviewrepo.dto.CompanyResponse;
import com.agenticai.interviewrepo.model.Company;
import com.agenticai.interviewrepo.repository.ApplicationRepository;
import com.agenticai.interviewrepo.repository.CompanyRepository;
import com.agenticai.interviewrepo.repository.InterviewExperienceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewExperienceRepository interviewExperienceRepository;

    public CompanyService(CompanyRepository companyRepository,
                          ApplicationRepository applicationRepository,
                          InterviewExperienceRepository interviewExperienceRepository) {
        this.companyRepository = companyRepository;
        this.applicationRepository = applicationRepository;
        this.interviewExperienceRepository = interviewExperienceRepository;
    }

    @Transactional
    public CompanyResponse create(CompanyRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Company name cannot be blank");
        }

        String trimmedName = request.getName().trim();
        if (companyRepository.existsByNameIgnoreCase(trimmedName)) {
            throw new IllegalArgumentException("Company with name '" + trimmedName + "' already exists");
        }

        Company company = new Company();
        company.setName(trimmedName);
        company.setIndustry(request.getIndustry() != null ? request.getIndustry().trim() : null);
        company.setWebsite(request.getWebsite() != null ? request.getWebsite().trim() : null);
        company.setDescription(request.getDescription());
        company.setLocation(request.getLocation() != null ? request.getLocation().trim() : null);

        Company saved = companyRepository.save(company);
        return CompanyResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public CompanyResponse get(UUID id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + id));
        return CompanyResponse.from(company);
    }

    @Transactional(readOnly = true)
    public Page<CompanyResponse> list(String name, String industry, Pageable pageable) {
        boolean hasName = name != null && !name.isBlank();
        boolean hasIndustry = industry != null && !industry.isBlank();

        Page<Company> result;
        if (hasName && hasIndustry) {
            result = companyRepository.findByNameContainingIgnoreCaseAndIndustryIgnoreCase(
                    name.trim(), industry.trim(), pageable);
        } else if (hasName) {
            result = companyRepository.findByNameContainingIgnoreCase(name.trim(), pageable);
        } else if (hasIndustry) {
            result = companyRepository.findByIndustryIgnoreCase(industry.trim(), pageable);
        } else {
            result = companyRepository.findAll(pageable);
        }

        return result.map(CompanyResponse::from);
    }

    @Transactional
    public CompanyResponse update(UUID id, CompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + id));

        if (request.getName() != null && !request.getName().isBlank()) {
            String newName = request.getName().trim();
            if (!newName.equalsIgnoreCase(company.getName()) && companyRepository.existsByNameIgnoreCase(newName)) {
                throw new IllegalArgumentException("Company with name '" + newName + "' already exists");
            }
            company.setName(newName);
        }

        if (request.getIndustry() != null) {
            company.setIndustry(request.getIndustry().trim());
        }
        if (request.getWebsite() != null) {
            company.setWebsite(request.getWebsite().trim());
        }
        if (request.getDescription() != null) {
            company.setDescription(request.getDescription());
        }
        if (request.getLocation() != null) {
            company.setLocation(request.getLocation().trim());
        }

        Company updated = companyRepository.save(company);
        return CompanyResponse.from(updated);
    }

    @Transactional
    public void delete(UUID id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + id));

        if (applicationRepository.existsByCompany(company)) {
            throw new IllegalStateException("Cannot delete company with associated job applications");
        }

        if (interviewExperienceRepository.findByCompanyId(id, PageRequest.of(0, 1)).hasContent()) {
            throw new IllegalStateException("Cannot delete company with associated interview experiences");
        }

        companyRepository.delete(company);
    }
}
