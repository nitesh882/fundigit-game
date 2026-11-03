package com.demo.authapp.controller;
import com.demo.authapp.dto.AuthDtos.*;
import com.demo.authapp.model.User;
import com.demo.authapp.service.JwtService;
import com.demo.authapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final JwtService jwtService;
    @PostMapping("/signup") public AuthResponse signup(@RequestBody SignupRequest request) { return response(userService.register(request)); }
    @PostMapping("/login") public AuthResponse login(@RequestBody LoginRequest request) { return response(userService.login(request.email(), request.password())); }
    @GetMapping("/me") public PublicUser me(Authentication authentication) { return PublicUser.from(userService.requireUser(authentication.getName())); }
    private AuthResponse response(User user) {
        return new AuthResponse(jwtService.generateToken(String.valueOf(user.getId()), user.getEmail()), PublicUser.from(user));
    }
}
