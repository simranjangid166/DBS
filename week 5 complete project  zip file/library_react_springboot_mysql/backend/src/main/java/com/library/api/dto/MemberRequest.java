package com.library.api.dto;

import jakarta.validation.constraints.*;

public record MemberRequest(
        @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "[A-Za-z0-9_.-]+") String username,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 128) String password
) {}
