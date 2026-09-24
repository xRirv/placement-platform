// AlumniRepository.java  (backs the PlacedAlumni entity — per your file naming)
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.PlacedAlumni;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AlumniRepository extends JpaRepository<PlacedAlumni, UUID> {
}