package com.rideplatform.downloads.api;

import com.rideplatform.downloads.application.ApkDistributionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public catalog of LAN APK install links (no auth — phones and installers use this).
 * Omits server filesystem paths.
 */
@RestController
@RequestMapping("/api/v1/downloads")
public class DownloadsCatalogController {

    private final ApkDistributionService distributionService;

    public DownloadsCatalogController(ApkDistributionService distributionService) {
        this.distributionService = distributionService;
    }

    @GetMapping
    public PublicCatalog list() {
        ApkDistributionService.DownloadsCatalog full = distributionService.catalog();
        return new PublicCatalog(full.preferredBaseUrl(), full.lanHosts(), full.apps());
    }

    public record PublicCatalog(
            String preferredBaseUrl,
            List<String> lanHosts,
            List<ApkDistributionService.ApkItem> apps
    ) {}
}
