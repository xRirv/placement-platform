package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.ModerationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ModerationLogRepository extends JpaRepository<ModerationLog, UUID> {
}