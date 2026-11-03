package com.demo.authapp.service;
import com.demo.authapp.config.ApiException;
import com.demo.authapp.dto.AuthDtos.SignupRequest;
import com.demo.authapp.model.User;
import com.demo.authapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    @Transactional
    public User register(SignupRequest request) {
        String email = normalizeEmail(request.email());
        String username = request.username() == null ? "" : request.username().strip();
        if (username.length() < 3 || username.length() > 30) throw new ApiException(HttpStatus.BAD_REQUEST, "Username must contain 3 to 30 characters.");
        validatePassword(request.password(), true);
        if (userRepository.findByEmail(email).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        return userRepository.save(User.builder().username(username).email(email).password(passwordEncoder.encode(request.password())).build());
    }
    public User login(String rawEmail, String password) {
        String email = normalizeEmail(rawEmail);
        validatePassword(password, false);
        User user = userRepository.findByEmail(email).orElseThrow(UserService::invalidCredentials);
        if (!passwordEncoder.matches(password, user.getPassword())) throw invalidCredentials();
        return user;
    }
    public User requireUser(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
    }
    private static ApiException invalidCredentials() { return new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."); }
    private static String normalizeEmail(String raw) {
        String email = raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid email address.");
        return email;
    }
    private static void validatePassword(String password, boolean signup) {
        int size = password == null ? 0 : password.getBytes(StandardCharsets.UTF_8).length;
        if (size > 72 || size < 1 || (signup && password.length() < 8)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, signup ? "Password must contain at least 8 characters and at most 72 UTF-8 bytes." : "Enter a password of at most 72 UTF-8 bytes.");
        }
    }
}
