// AlumniRepository.java  (backs the PlacedAlumni entity — per your file naming)
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.PlacedAlumni;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.Optional;
import com.agenticai.interviewrepo.model.User;

public interface AlumniRepository extends JpaRepository<PlacedAlumni, UUID> {
    public Optional<PlacedAlumni> findByLogin(User login);

    Page<PlacedAlumni> findByNameContainingIgnoreCaseOrLogin_EmailContainingIgnoreCase(String search, String search1, Pageable pageable);

    Page<PlacedAlumni> findByLogin_IsActive(Boolean isActive, Pageable pageable);
}