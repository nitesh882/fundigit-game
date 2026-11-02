package com.demo.authapp.controller;

import com.demo.authapp.model.User;
import com.demo.authapp.service.JwtService;
import com.demo.authapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    @PostMapping("/signup")
    public Map<String, Object> signup(@RequestBody User user) {

        User savedUser = userService.register(user);
        String token = jwtService.generateToken(String.valueOf(savedUser.getId()), savedUser.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", savedUser);

        return response;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> request) {

        User user = userService.login(request.get("email"), request.get("password"));
        String token = jwtService.generateToken(String.valueOf(user.getId()), user.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", user);

        return response;
    }
}