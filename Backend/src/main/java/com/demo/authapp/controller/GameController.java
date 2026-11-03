package com.demo.authapp.controller;
import com.demo.authapp.config.ApiException;
import com.demo.authapp.dto.game.SessionDtos.*;
import com.demo.authapp.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
public class GameController {
    private final SessionService sessions;
    @PostMapping("/sessions") public SessionView start(Authentication auth, @RequestBody StartRequest request) { return sessions.start(auth.getName(), request); }
    @GetMapping("/sessions/{id}") public SessionView get(Authentication auth, @PathVariable String id) { return sessions.get(auth.getName(), id); }
    @PostMapping("/sessions/{id}/answers") public AnswerResponse answer(Authentication auth, @PathVariable String id, @RequestBody AnswerRequest request) { return sessions.answer(auth.getName(), id, request); }
    @PostMapping("/sessions/{id}/end") public SessionView end(Authentication auth, @PathVariable String id) { return sessions.end(auth.getName(), id); }
    @RequestMapping({"/question", "/submit"}) public void retired() { throw new ApiException(HttpStatus.GONE, "Use authenticated game sessions."); }
}
