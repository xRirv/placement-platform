package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.ModerationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModerationLogRepository extends JpaRepository<ModerationLog, UUID> {

    List<ModerationLog> findByAdminId(UUID adminId);

    List<ModerationLog> findByEntityTypeAndEntityId(String entityType, UUID entityId);

    List<ModerationLog> findAllByOrderByCreatedAtDesc();
}
