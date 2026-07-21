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

    private final UserRepository repository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

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
        User user = repository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuário ou senha inválidos"));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Usuário ou senha inválidos");
        }
        return user;
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
