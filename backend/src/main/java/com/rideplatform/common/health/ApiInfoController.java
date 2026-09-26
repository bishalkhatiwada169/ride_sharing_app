package com.rideplatform.common.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lightweight service identity for probes / smoke scripts.
 * The admin SPA (when embedded) owns {@code GET /}.
 */
@RestController
public class ApiInfoController {

    @GetMapping("/api")
    public Map<String, String> apiRoot() {
        return Map.of(
                "service", "ride-platform-backend",
                "status", "ok"
        );
    }
}
