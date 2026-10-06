package com.agenticai.interviewrepo;

import com.agenticai.interviewrepo.dto.CompanyRequest;
import com.agenticai.interviewrepo.dto.CompanyResponse;
import com.agenticai.interviewrepo.model.Company;
import com.agenticai.interviewrepo.repository.ApplicationRepository;
import com.agenticai.interviewrepo.repository.CompanyRepository;
import com.agenticai.interviewrepo.repository.InterviewExperienceRepository;
import com.agenticai.interviewrepo.service.CompanyService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private InterviewExperienceRepository interviewExperienceRepository;

    @InjectMocks
    private CompanyService companyService;

    @Test
    void createCompany_success() {
        CompanyRequest request = new CompanyRequest("Google", "Technology", "https://google.com", "Tech giant", "Mountain View");

        when(companyRepository.existsByNameIgnoreCase("Google")).thenReturn(false);
        when(companyRepository.save(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        CompanyResponse response = companyService.create(request);

        assertNotNull(response);
        assertEquals("Google", response.name());
        assertEquals("Technology", response.industry());
        verify(companyRepository).save(any(Company.class));
    }

    @Test
    void createCompany_duplicateName_throwsException() {
        CompanyRequest request = new CompanyRequest("Google", "Tech", "https://google.com", "", "CA");
        when(companyRepository.existsByNameIgnoreCase("Google")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> companyService.create(request));
        verify(companyRepository, never()).save(any());
    }

    @Test
    void getCompany_notFound_throwsException() {
        UUID id = UUID.randomUUID();
        when(companyRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> companyService.get(id));
    }

    @Test
    void deleteCompany_withAssociatedApplications_throwsException() {
        UUID id = UUID.randomUUID();
        Company company = new Company();
        company.setId(id);
        company.setName("Meta");

        when(companyRepository.findById(id)).thenReturn(Optional.of(company));
        when(applicationRepository.existsByCompany(company)).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> companyService.delete(id));
        verify(companyRepository, never()).delete(any());
    }

    @Test
    void listCompanies_withNameAndIndustryFilter() {
        Company company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Amazon");
        company.setIndustry("E-Commerce");

        Pageable pageable = PageRequest.of(0, 10);
        when(companyRepository.findByNameContainingIgnoreCaseAndIndustryIgnoreCase("Amazon", "E-Commerce", pageable))
                .thenReturn(new PageImpl<>(List.of(company)));

        Page<CompanyResponse> page = companyService.list("Amazon", "E-Commerce", pageable);

        assertNotNull(page);
        assertEquals(1, page.getTotalElements());
        assertEquals("Amazon", page.getContent().get(0).name());
    }
}
