package com.library.api.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record BookCreateRequest(
        @NotBlank @Size(max = 250) String title,
        @NotBlank @Pattern(regexp = "\\d{13}", message = "ISBN must contain exactly 13 digits") String isbn,
        @NotNull @DecimalMin(value = "0.01", message = "Price must be positive") BigDecimal price,
        @NotNull LocalDate publishedDate,
        @Size(max = 5000) String description
) {}
