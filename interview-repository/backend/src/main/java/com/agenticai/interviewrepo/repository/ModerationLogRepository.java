package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.ModerationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface ModerationLogRepository extends JpaRepository<ModerationLog, UUID> {

    Page<ModerationLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT m FROM ModerationLog m LEFT JOIN FETCH m.admin a LEFT JOIN FETCH a.login ORDER BY m.createdAt DESC")
    Page<ModerationLog> findAllWithAdminOrderByCreatedAtDesc(Pageable pageable);

    Page<ModerationLog> findByStatus(String status, Pageable pageable);

    Page<ModerationLog> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}