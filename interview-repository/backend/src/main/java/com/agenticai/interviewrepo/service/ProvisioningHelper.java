package com.agenticai.interviewrepo.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Optional;
import java.util.function.Supplier;

/**
 * Get-or-create that is safe under concurrent first requests (the dashboard loads several
 * endpoints in parallel for a brand-new user). The insert runs in its own transaction so a
 * unique-constraint race cannot poison the caller's transaction; the loser simply re-reads.
 */
@Component
public class ProvisioningHelper {

    private final TransactionTemplate requiresNew;

    public ProvisioningHelper(PlatformTransactionManager transactionManager) {
        this.requiresNew = new TransactionTemplate(transactionManager);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public <T> T getOrCreate(Supplier<Optional<T>> find, Supplier<T> create) {
        Optional<T> existing = find.get();
        if (existing.isPresent()) return existing.get();
        try {
            requiresNew.executeWithoutResult(status -> create.get());
        } catch (DataIntegrityViolationException raceLost) {
            // Another request created it first; fall through and read it.
        }
        return find.get().orElseThrow(() -> new IllegalStateException("Provisioning failed"));
    }
}
