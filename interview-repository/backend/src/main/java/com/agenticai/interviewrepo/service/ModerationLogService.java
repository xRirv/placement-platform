package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.model.ModerationLog;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.ModerationLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ModerationLogService {

    private final ModerationLogRepository moderationLogRepository;
    private final CurrentUserService currentUserService;

    public ModerationLogService(ModerationLogRepository moderationLogRepository,
                                CurrentUserService currentUserService) {
        this.moderationLogRepository = moderationLogRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public ModerationLog log(UUID adminId, String entityType, UUID entityId, String action, String reason) {
        ModerationLog log = ModerationLog.builder()
                .adminId(adminId)
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .reason(reason)
                .build();
        return moderationLogRepository.save(log);
    }

    @Transactional
    public ModerationLog logCurrentAdminAction(String entityType, UUID entityId, String action, String reason) {
        User admin = currentUserService.getCurrentUser();
        return log(admin.getId(), entityType, entityId, action, reason);
    }

    @Transactional(readOnly = true)
    public List<ModerationLog> getAllLogs() {
        return moderationLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
