package com.rideplatform.downloads.application;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Serves local-network APK distribution for the unified Ride Android app
 * (passenger + driver roles in one binary).
 * Files live on disk (not in the jar) under a configurable directory.
 */
@Service
public class ApkDistributionService {

    /** Canonical LAN install binary (unified passenger + driver app). */
    public static final String RIDE_FILE = "passenger.apk";
    /** Legacy filename still accepted if present; not listed in the public catalog. */
    public static final String DRIVER_FILE = "driver.apk";

    private static final Set<String> ALLOWED = Set.of(RIDE_FILE, DRIVER_FILE);
    private static final Pattern SAFE_NAME = Pattern.compile("^[a-z0-9][a-z0-9._-]*\\.apk$", Pattern.CASE_INSENSITIVE);

    private final Path downloadsDir;
    private final int serverPort;
    private final String publicBaseUrlOverride;

    public ApkDistributionService(
            @Value("${rideplatform.downloads.dir:../artifacts/apks}") String downloadsDir,
            @Value("${server.port:8080}") int serverPort,
            @Value("${rideplatform.downloads.public-base-url:}") String publicBaseUrlOverride
    ) {
        this.downloadsDir = Paths.get(downloadsDir).toAbsolutePath().normalize();
        this.serverPort = serverPort;
        this.publicBaseUrlOverride = publicBaseUrlOverride == null ? "" : publicBaseUrlOverride.trim();
    }

    public Path downloadsDir() {
        return downloadsDir;
    }

    public Optional<Path> resolveAllowed(String filename) {
        if (filename == null || !SAFE_NAME.matcher(filename).matches()) {
            return Optional.empty();
        }
        String lower = filename.toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(lower)) {
            return Optional.empty();
        }
        Path resolved = downloadsDir.resolve(lower).normalize();
        if (!resolved.startsWith(downloadsDir) || !Files.isRegularFile(resolved)) {
            return Optional.empty();
        }
        return Optional.of(resolved);
    }

    public DownloadsCatalog catalog() {
        List<String> lanHosts = discoverLanIpv4();
        String preferredBase = resolvePublicBase(lanHosts);
        List<ApkItem> apps = new ArrayList<>();
        // One public install target — role (passenger/driver) is chosen inside the app.
        apps.add(item(
                "ride",
                "Ride app (passenger + driver)",
                RIDE_FILE,
                preferredBase,
                lanHosts
        ));
        return new DownloadsCatalog(
                preferredBase,
                lanHosts,
                downloadsDir.toString(),
                apps
        );
    }

    private ApkItem item(String id, String label, String filename, String preferredBase, List<String> lanHosts) {
        Optional<Path> file = resolveAllowed(filename);
        List<String> urls = new ArrayList<>();
        if (file.isPresent()) {
            String path = "/downloads/apk/" + filename;
            urls.add(preferredBase + path);
            for (String host : lanHosts) {
                String candidate = "http://" + host + ":" + serverPort + path;
                if (!urls.contains(candidate)) {
                    urls.add(candidate);
                }
            }
            urls.add("http://localhost:" + serverPort + path);
        }
        Instant modified = file.map(p -> {
            try {
                return Files.getLastModifiedTime(p).toInstant();
            } catch (IOException e) {
                return null;
            }
        }).orElse(null);
        Long sizeBytes = file.map(p -> {
            try {
                return Files.size(p);
            } catch (IOException e) {
                return null;
            }
        }).orElse(null);

        return new ApkItem(
                id,
                label,
                filename,
                file.isPresent(),
                sizeBytes,
                modified,
                urls
        );
    }

    private String resolvePublicBase(List<String> lanHosts) {
        if (!publicBaseUrlOverride.isEmpty()) {
            return publicBaseUrlOverride.replaceAll("/$", "");
        }
        if (!lanHosts.isEmpty()) {
            return "http://" + lanHosts.getFirst() + ":" + serverPort;
        }
        return "http://localhost:" + serverPort;
    }

    private static List<String> discoverLanIpv4() {
        List<String> hosts = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces != null && interfaces.hasMoreElements()) {
                NetworkInterface nif = interfaces.nextElement();
                if (!nif.isUp() || nif.isLoopback() || nif.isVirtual()) {
                    continue;
                }
                String ifName = nif.getName() == null ? "" : nif.getName().toLowerCase(Locale.ROOT);
                String display = nif.getDisplayName() == null ? "" : nif.getDisplayName().toLowerCase(Locale.ROOT);
                // Skip typical container / VPN virtual adapters when a real LAN exists
                if (ifName.contains("docker") || ifName.contains("vethernet") || ifName.contains("wsldocker")
                        || display.contains("docker") || display.contains("hyper-v") || display.contains("wsl")
                        || display.contains("virtualbox") || display.contains("vmware")) {
                    continue;
                }
                Enumeration<InetAddress> addrs = nif.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr = addrs.nextElement();
                    if (addr instanceof Inet4Address inet4
                            && !inet4.isLoopbackAddress()
                            && !inet4.isLinkLocalAddress()) {
                        hosts.add(inet4.getHostAddress());
                    }
                }
            }
        } catch (Exception ignored) {
            // fall back to localhost in catalog
        }
        hosts.sort(Comparator
                .comparingInt(ApkDistributionService::lanPreference)
                .thenComparing(Comparator.naturalOrder()));
        return hosts;
    }

    /** Prefer home/office Wi‑Fi (192.168/10) over CGNAT/docker-ish 172.16–31 ranges. */
    private static int lanPreference(String ip) {
        if (ip.startsWith("192.168.")) {
            return 0;
        }
        if (ip.startsWith("10.")) {
            return 1;
        }
        if (ip.startsWith("172.")) {
            return 2;
        }
        return 3;
    }

    public record DownloadsCatalog(
            String preferredBaseUrl,
            List<String> lanHosts,
            String directory,
            List<ApkItem> apps
    ) {}

    public record ApkItem(
            String id,
            String label,
            String filename,
            boolean available,
            Long sizeBytes,
            Instant modifiedAt,
            List<String> downloadUrls
    ) {}
}
