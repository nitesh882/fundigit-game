package com.demo.authapp.controller;

import com.demo.authapp.dto.game.GameQuestionResponse;
import com.demo.authapp.dto.game.GameSubmitRequest;
import com.demo.authapp.dto.game.GameSubmitResponse;
import com.demo.authapp.service.GameService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GameController {

    private final GameService gameService;

    @GetMapping("/question")
    public GameQuestionResponse question(
            @RequestParam(defaultValue = "add") String mode,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String difficulty
    ) {
        String resolvedLevel = (level != null && !level.isBlank())
                ? level
                : ((difficulty != null && !difficulty.isBlank()) ? difficulty : "medium");
        return gameService.generateQuestion(mode, resolvedLevel);
    }

    @PostMapping("/submit")
    public GameSubmitResponse submit(@RequestBody GameSubmitRequest request) {
        return gameService.submit(request);
    }
}
