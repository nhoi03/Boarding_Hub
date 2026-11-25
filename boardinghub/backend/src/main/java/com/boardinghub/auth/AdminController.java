package com.boardinghub.auth;

import java.util.List;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final UserRepository users;
    public AdminController(UserRepository users) { this.users = users; }
    public record Accounts(List<AppUser.Profile> items, long total) {}
    @GetMapping("/users")
    public Accounts users(@RequestParam(defaultValue = "0") int page) {
        var result = users.findAll(PageRequest.of(Math.max(0, page), 20, Sort.by("id").descending()));
        return new Accounts(result.map(AppUser::profile).getContent(), result.getTotalElements());
    }
}
