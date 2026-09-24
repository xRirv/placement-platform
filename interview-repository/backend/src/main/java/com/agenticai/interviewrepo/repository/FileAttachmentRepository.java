// FileAttachmentRepository.java
package com.agenticai.interviewrepo.repository;

import com.agenticai.interviewrepo.model.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface FileAttachmentRepository extends JpaRepository<FileAttachment, UUID> {
}