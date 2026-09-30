package com.rideplatform.common.web;

import org.springframework.boot.autoconfigure.condition.ConditionalOnResource;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards admin SPA client routes to {@code index.html} when the Vite build
 * is embedded under {@code classpath:/static/}. Asset files under {@code /assets/}
 * are served by Spring Boot's default static resource handling.
 */
@Controller
@ConditionalOnResource(resources = "classpath:/static/index.html")
public class SpaForwardController {

    @GetMapping({
            "/",
            "/login",
            "/drivers",
            "/rides",
            "/pricing",
            "/payments",
            "/safety",
            "/support",
            "/audit",
            "/downloads"
    })
    public String forwardSpa() {
        return "forward:/index.html";
    }
}
