package com.rideplatform.downloads.api;

import com.rideplatform.downloads.application.ApkDistributionService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-contained LAN install page (no admin SPA / Vite required).
 * Phones on the same Wi‑Fi open this URL to install the unified Ride APK.
 */
@RestController
public class PublicDownloadsPageController {

    private final ApkDistributionService distributionService;

    public PublicDownloadsPageController(ApkDistributionService distributionService) {
        this.distributionService = distributionService;
    }

    @GetMapping(value = "/downloads", produces = MediaType.TEXT_HTML_VALUE)
    public String page() {
        ApkDistributionService.DownloadsCatalog catalog = distributionService.catalog();
        ApkDistributionService.ApkItem app = catalog.apps().isEmpty() ? null : catalog.apps().getFirst();
        boolean ready = app != null && app.available() && !app.downloadUrls().isEmpty();
        String downloadHref = ready ? app.downloadUrls().getFirst() : "";
        String size = ready && app.sizeBytes() != null
                ? String.format("%.1f MB", app.sizeBytes() / (1024.0 * 1024.0))
                : "";

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html lang=\"en\"><head>");
        html.append("<meta charset=\"utf-8\"/>");
        html.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>");
        html.append("<title>Install Ride</title>");
        html.append("<style>");
        html.append("*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;");
        html.append("background:#0B0D12;color:#F4F1EA;min-height:100vh;display:flex;align-items:center;");
        html.append("justify-content:center;padding:24px}");
        html.append(".card{max-width:420px;width:100%;background:#151821;border:1px solid #2A2F3A;");
        html.append("border-radius:20px;padding:28px 24px}");
        html.append("h1{margin:0 0 8px;font-size:1.75rem;letter-spacing:-0.02em}");
        html.append("p{margin:0 0 12px;color:#A8B0C0;line-height:1.5;font-size:0.95rem}");
        html.append(".brand{color:#F2B84B;font-weight:700;letter-spacing:0.12em;font-size:0.75rem;");
        html.append("text-transform:uppercase;margin-bottom:16px}");
        html.append("a.btn{display:block;text-align:center;text-decoration:none;background:#F2B84B;");
        html.append("color:#0B0D12;font-weight:700;padding:14px 18px;border-radius:14px;margin-top:20px}");
        html.append(".muted{font-size:0.8rem;color:#6B7280;margin-top:16px;word-break:break-all}");
        html.append(".warn{color:#E86A5C;margin-top:16px}");
        html.append("</style></head><body><div class=\"card\">");
        html.append("<div class=\"brand\">Ride</div>");
        html.append("<h1>Install Ride</h1>");
        html.append("<p>One Android app for passenger and driver. After install, choose your role.</p>");
        html.append("<p>Use this phone on the same Wi‑Fi as the server. Allow “Install unknown apps” if asked.</p>");

        if (ready) {
            html.append("<a class=\"btn\" href=\"").append(escape(downloadHref)).append("\">Download APK");
            if (!size.isEmpty()) {
                html.append(" (").append(escape(size)).append(")");
            }
            html.append("</a>");
            html.append("<p class=\"muted\">").append(escape(downloadHref)).append("</p>");
        } else {
            html.append("<p class=\"warn\">APK not published yet. Ask the host to run the publish script, then refresh.</p>");
            html.append("<p class=\"muted\">Server: ").append(escape(catalog.preferredBaseUrl())).append("</p>");
        }

        html.append("</div></body></html>");
        return html.toString();
    }

    private static String escape(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
