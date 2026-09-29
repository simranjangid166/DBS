package com.library.api.dto;

import com.library.api.model.Book;
import java.math.BigDecimal;
import java.time.LocalDate;

public record BookResponse(
        Long id, String title, String isbn, BigDecimal price,
        LocalDate publishedDate, String description, Double similarity) {

    public static BookResponse from(Book b) {
        return new BookResponse(b.getId(), b.getTitle(), b.getIsbn(), b.getPrice(),
                b.getPublishedDate(), b.getDescription(), null);
    }
}
