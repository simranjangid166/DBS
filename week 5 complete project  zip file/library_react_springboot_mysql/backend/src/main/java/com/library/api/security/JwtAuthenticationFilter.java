package com.library.api.security;

import com.library.api.repository.MemberRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final MemberRepository members;

    public JwtAuthenticationFilter(JwtService jwt, MemberRepository members) {
        this.jwt = jwt; this.members = members;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                var claims = jwt.parse(header.substring(7));
                Long id = Long.valueOf(claims.getSubject());
                var member = members.findById(id).orElse(null);
                if (member != null) {
                    var auth = new UsernamePasswordAuthenticationToken(
                            member.getUsername(), null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    req.setAttribute("memberId", id);
                    req.setAttribute("username", claims.get("username", String.class));
                }
            } catch (Exception ignored) {
                // Invalid token is treated as unauthenticated.
            }
        }
        chain.doFilter(req, res);
    }
}
