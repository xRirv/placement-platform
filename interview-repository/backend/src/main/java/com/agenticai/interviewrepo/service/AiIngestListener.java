package com.agenticai.interviewrepo.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/**
 * Sends approved experiences to the AI service only after the approval transaction commits,
 * so Team B never sees an uncommitted approval and an AI failure can never roll it back.
 */
@Component
public class AiIngestListener {

    /** Published by InterviewExperienceService when an experience transitions to APPROVED. */
    public record ExperienceApprovedEvent(Map<String, Object> payload) {}

    private final AiServiceClient aiServiceClient;

    public AiIngestListener(AiServiceClient aiServiceClient) {
        this.aiServiceClient = aiServiceClient;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onExperienceApproved(ExperienceApprovedEvent event) {
        aiServiceClient.ingest(event.payload());
    }
}
