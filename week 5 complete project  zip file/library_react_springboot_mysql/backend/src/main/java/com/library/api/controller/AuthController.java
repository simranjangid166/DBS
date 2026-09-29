package com.library.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.library.api.dto.MemberRequest;
import com.library.api.dto.TokenResponse;
import com.library.api.model.Member;
import com.library.api.repository.MemberRepository;
import com.library.api.security.JwtService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final MemberRepository members;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(MemberRepository members, PasswordEncoder encoder, JwtService jwt) {
        this.members = members; this.encoder = encoder; this.jwt = jwt;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody MemberRequest r) {
        if (members.existsByUsername(r.username())) return ResponseEntity.status(409).body("Username already registered");
        if (members.existsByEmail(r.email())) return ResponseEntity.status(409).body("Email already registered");

        Member m = new Member();
        m.setUsername(r.username());
        m.setEmail(r.email());
        m.setPasswordHash(encoder.encode(r.password()));
        Member saved = members.save(m);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(java.util.Map.of("id", saved.getId(), "username", saved.getUsername(), "email", saved.getEmail()));
    }

    public record LoginRequest(String username, String password) {}

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest r) {
        Member m = members.findByUsername(r.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (!encoder.matches(r.password(), m.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");

        return ResponseEntity.ok(new TokenResponse(jwt.generateToken(m.getId(), m.getUsername()), "Bearer"));
    }
}
