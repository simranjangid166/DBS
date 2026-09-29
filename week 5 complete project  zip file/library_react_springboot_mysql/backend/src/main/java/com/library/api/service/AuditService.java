package com.library.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.time.OffsetDateTime;

@Service
public class AuditService {
    private final String file;

    public AuditService(@Value("${app.audit.file}") String file) { this.file = file; }

    @Async
    public void logNewBook(Long id, String title, String username) {
        try {
            Path path = Paths.get(file);
            Files.createDirectories(path.getParent() == null ? Paths.get(".") : path.getParent());
            String event = "%s | New Book Added | id=%d | title=%s | member=%s%n"
                    .formatted(OffsetDateTime.now(), id, title, username);
            Files.writeString(path, event, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception e) {
            // In production, send this to a structured logging/event system.
        }
    }
}
