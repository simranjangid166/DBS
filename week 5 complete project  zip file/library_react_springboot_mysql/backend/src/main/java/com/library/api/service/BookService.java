package com.library.api.service;

import com.library.api.dto.*;
import com.library.api.model.Book;
import com.library.api.repository.BookRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service
public class BookService {
    private final BookRepository books;
    private final EmbeddingService embeddings;
    private final AuditService audit;

    public BookService(BookRepository books, EmbeddingService embeddings, AuditService audit) {
        this.books = books; this.embeddings = embeddings; this.audit = audit;
    }

    @Transactional
    public BookResponse create(BookCreateRequest r, Long memberId, String username) {
        if (r.publishedDate().isAfter(LocalDate.now()))
            throw new IllegalArgumentException("publishedDate cannot be in the future");

        Book b = new Book();
        b.setTitle(r.title());
        b.setIsbn(r.isbn());
        b.setPrice(r.price());
        b.setPublishedDate(r.publishedDate());
        b.setDescription(r.description());
        b.setCreatedBy(memberId);
        b.setEmbedding(embeddings.embed(r.title() + ". " + Optional.ofNullable(r.description()).orElse("")));
        Book saved = books.save(b);

        audit.logNewBook(saved.getId(), saved.getTitle(), username);
        return BookResponse.from(saved);
    }

    public List<BookResponse> search(String query, int limit) {
        String queryVector = embeddings.embed(query);

        return books.findAll().stream()
                .filter(b -> b.getEmbedding() != null)
                .map(b -> new AbstractMap.SimpleEntry<>(b, embeddings.cosineSimilarity(queryVector, b.getEmbedding())))
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(limit)
                .map(e -> {
                    Book b = e.getKey();
                    return new BookResponse(b.getId(), b.getTitle(), b.getIsbn(), b.getPrice(),
                            b.getPublishedDate(), b.getDescription(), e.getValue());
                })
                .toList();
    }
}
