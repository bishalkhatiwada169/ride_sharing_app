package com.rideplatform.downloads.api;

import com.rideplatform.downloads.application.ApkDistributionService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;

/**
 * Public APK downloads for phones on the LAN (no auth — installers cannot send JWT).
 * Paths are under {@code /downloads/apk/…} so they do not collide with the admin SPA route {@code /downloads}.
 */
@RestController
@RequestMapping("/downloads/apk")
public class ApkDownloadController {

    private static final MediaType APK_MEDIA =
            MediaType.parseMediaType("application/vnd.android.package-archive");

    private final ApkDistributionService distributionService;

    public ApkDownloadController(ApkDistributionService distributionService) {
        this.distributionService = distributionService;
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> download(@PathVariable String filename) {
        Path file = distributionService.resolveAllowed(filename)
                .orElse(null);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        Resource body = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
                .contentType(APK_MEDIA)
                .contentLength(file.toFile().length())
                .body(body);
    }
}
