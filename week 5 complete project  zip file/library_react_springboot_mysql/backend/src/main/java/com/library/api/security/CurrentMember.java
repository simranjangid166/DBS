package com.library.api.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class CurrentMember {
    private CurrentMember() {}

    public static Long requireId(HttpServletRequest request) {
        Object id = request.getAttribute("memberId");
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        return (Long) id;
    }
}
