package com.demo.authapp.dto;
import com.demo.authapp.model.User;
public final class AuthDtos {
    private AuthDtos() { }
    public record SignupRequest(String username, String email, String password) {
        @Override public String toString() { return "SignupRequest[username=" + username + ", password=REDACTED]"; }
    }
    public record LoginRequest(String email, String password) {
        @Override public String toString() { return "LoginRequest[password=REDACTED]"; }
    }
    public record PublicUser(Long id, String username, String email) {
        public static PublicUser from(User user) { return new PublicUser(user.getId(), user.getUsername(), user.getEmail()); }
    }
    public record AuthResponse(String token, PublicUser user) {
        @Override public String toString() { return "AuthResponse[token=REDACTED, user=" + user.id() + "]"; }
    }
}
