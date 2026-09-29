package com.library.api.controller;

import com.library.api.dto.*;
import com.library.api.security.CurrentMember;
import com.library.api.service.BookService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/books")
public class BookController {
    private final BookService service;

    public BookController(BookService service) { this.service = service; }

    @PostMapping
    public BookResponse create(@Valid @RequestBody BookCreateRequest request, HttpServletRequest http) {
        Long memberId = CurrentMember.requireId(http);
        return service.create(request, memberId, (String) http.getAttribute("username"));
    }

    @GetMapping("/search")
    public List<BookResponse> search(@RequestParam String q,
                                     @RequestParam(defaultValue = "5") int limit,
                                     HttpServletRequest http) {
        CurrentMember.requireId(http);
        if (limit < 1 || limit > 50) throw new IllegalArgumentException("limit must be 1..50");
        return service.search(q, limit);
    }
}
