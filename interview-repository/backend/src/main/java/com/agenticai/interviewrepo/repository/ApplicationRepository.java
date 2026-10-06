package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.Application;
import com.agenticai.interviewrepo.model.Company;
import com.agenticai.interviewrepo.model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Page<Application> findByStudent(Student student, Pageable pageable);

    Page<Application> findByStudentAndStatus(Student student, String status, Pageable pageable);

    Page<Application> findByStatus(String status, Pageable pageable);

    List<Application> findByStudentOrderByAppliedDateDesc(Student student);

    List<Application> findByCompany(Company company);

    boolean existsByCompany(Company company);

    long countByStudentAndStatus(Student student, String status);

    long countByStudent(Student student);
}