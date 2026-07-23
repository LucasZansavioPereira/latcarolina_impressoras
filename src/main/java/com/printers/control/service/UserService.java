package com.printers.control.service;

import com.printers.control.model.User;
import com.printers.control.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private static final int MAX_FAILED_ATTEMPTS = 3;
    private static final long LOCKOUT_DURATION_SECONDS = 600; // 10 minutos

    private final UserRepository repository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final java.util.concurrent.ConcurrentHashMap<String, Integer> failedAttempts = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, java.time.Instant> lockoutMap = new java.util.concurrent.ConcurrentHashMap<>();

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public Optional<User> findByUsername(String username) {
        return repository.findByUsername(username);
    }

    public List<User> findAllUsers() {
        return repository.findAll();
    }

    @Transactional
    public User createUser(String username, String rawPassword) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Nome de usuário é obrigatório");
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("Senha é obrigatória");
        }
        if (repository.existsByUsername(username)) {
            throw new IllegalArgumentException("Usuário já existe");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPassword));
        return repository.save(user);
    }

    public User authenticate(String username, String password) {
        String key = (username != null && !username.isBlank()) ? username.trim().toLowerCase() : "global";

        java.time.Instant lockedUntil = lockoutMap.get(key);
        if (lockedUntil != null) {
            if (java.time.Instant.now().isBefore(lockedUntil)) {
                long secondsRemaining = java.time.Duration.between(java.time.Instant.now(), lockedUntil).getSeconds();
                long minutes = secondsRemaining / 60;
                long seconds = secondsRemaining % 60;
                String timeStr = minutes > 0 ? minutes + " min e " + seconds + " s" : seconds + " s";
                throw new IllegalArgumentException("Acesso bloqueado por 10 minutos devido a 3 tentativas incorretas. Tente novamente em " + timeStr + ".");
            } else {
                lockoutMap.remove(key);
                failedAttempts.remove(key);
            }
        }

        Optional<User> userOpt = (username != null && !username.isBlank()) ? repository.findByUsername(username.trim()) : Optional.empty();

        if (userOpt.isEmpty() || password == null || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            int attempts = failedAttempts.getOrDefault(key, 0) + 1;
            failedAttempts.put(key, attempts);

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                lockoutMap.put(key, java.time.Instant.now().plusSeconds(LOCKOUT_DURATION_SECONDS));
                throw new IllegalArgumentException("Acesso bloqueado por 10 minutos após 3 tentativas incorretas de login.");
            }

            int remaining = MAX_FAILED_ATTEMPTS - attempts;
            throw new IllegalArgumentException("Usuário ou senha inválidos. Resta(m) " + remaining + " tentativa(s).");
        }

        failedAttempts.remove(key);
        lockoutMap.remove(key);
        return userOpt.get();
    }

    @Transactional
    public User updateUser(String currentUsername, String currentPassword, String newUsername, String newPassword) {
        User user = repository.findByUsername(currentUsername)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Senha atual incorreta");
        }

        boolean changed = false;
        if (newUsername != null && !newUsername.isBlank() && !newUsername.equals(currentUsername)) {
            if (repository.existsByUsername(newUsername)) {
                throw new IllegalArgumentException("Nome de usuário já existe");
            }
            user.setUsername(newUsername);
            changed = true;
        }
        if (newPassword != null && !newPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(newPassword));
            changed = true;
        }
        if (!changed) {
            throw new IllegalArgumentException("Nenhuma alteração informada");
        }
        return repository.save(user);
    }

    @Transactional
    public void deleteUser(String username) {
        User user = repository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        repository.delete(user);
    }

    @Transactional
    public User resetPassword(String username, String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Nova senha é obrigatória");
        }
        User user = repository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        user.setPassword(passwordEncoder.encode(newPassword));
        return repository.save(user);
    }
}
