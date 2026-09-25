package com.rideplatform.safety.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.safety.application.SafetyService;
import com.rideplatform.safety.domain.EmergencyContactEntity;
import com.rideplatform.safety.domain.SafetyIncidentEntity;
import com.rideplatform.safety.domain.TripShareEntity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/safety")
public class SafetyController {

    private final SafetyService safetyService;

    public SafetyController(SafetyService safetyService) {
        this.safetyService = safetyService;
    }

    public record ContactDto(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{6,14}$") String phoneE164,
            @Size(max = 64) String relationship
    ) {}

    public record ContactsRequest(@Valid List<ContactDto> contacts) {}

    public record ContactResponse(UUID id, String name, String phoneE164, String relationship) {
        static ContactResponse from(EmergencyContactEntity e) {
            return new ContactResponse(e.getId(), e.getName(), e.getPhoneE164(), e.getRelationship());
        }
    }

    public record SosRequest(Double lat, Double lng, @Size(max = 1000) String notes) {}

    public record ReportRequest(
            UUID rideId,
            @Size(max = 64) String category,
            @Size(max = 2000) String notes,
            Double lat,
            Double lng
    ) {}

    public record IncidentResponse(
            UUID id,
            UUID rideId,
            UUID reporterUserId,
            String type,
            String status,
            String category,
            String notes,
            Double lat,
            Double lng,
            Instant createdAt
    ) {
        static IncidentResponse from(SafetyIncidentEntity e) {
            return new IncidentResponse(
                    e.getId(), e.getRideId(), e.getReporterUserId(), e.getType(), e.getStatus(),
                    e.getCategory(), e.getNotes(), e.getLat(), e.getLng(), e.getCreatedAt()
            );
        }
    }

    public record ShareResponse(String token, String sharePath, Instant expiresAt) {}

    @GetMapping("/emergency-contacts")
    @PreAuthorize("isAuthenticated()")
    public List<ContactResponse> listContacts(@AuthenticationPrincipal UserPrincipal principal) {
        return safetyService.listContacts(principal.getId()).stream().map(ContactResponse::from).toList();
    }

    @PutMapping("/emergency-contacts")
    @PreAuthorize("isAuthenticated()")
    public List<ContactResponse> replaceContacts(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ContactsRequest request
    ) {
        List<SafetyService.ContactInput> inputs = (request.contacts() == null ? List.<ContactDto>of() : request.contacts())
                .stream()
                .map(c -> new SafetyService.ContactInput(c.name(), c.phoneE164(), c.relationship()))
                .toList();
        return safetyService.replaceContacts(principal.getId(), inputs).stream().map(ContactResponse::from).toList();
    }

    @PostMapping("/rides/{rideId}/sos")
    @PreAuthorize("isAuthenticated()")
    public IncidentResponse sos(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID rideId,
            @RequestBody(required = false) SosRequest request
    ) {
        SosRequest body = request == null ? new SosRequest(null, null, null) : request;
        return IncidentResponse.from(safetyService.triggerSos(
                principal.getId(), rideId, body.lat(), body.lng(), body.notes()
        ));
    }

    @PostMapping("/incidents")
    @PreAuthorize("isAuthenticated()")
    public IncidentResponse report(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ReportRequest request
    ) {
        return IncidentResponse.from(safetyService.reportIncident(
                principal.getId(), request.rideId(), request.category(), request.notes(), request.lat(), request.lng()
        ));
    }

    @GetMapping("/admin/incidents")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
    public List<IncidentResponse> adminIncidents() {
        return safetyService.adminIncidents().stream().map(IncidentResponse::from).toList();
    }

    @PostMapping("/admin/incidents/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public IncidentResponse resolve(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return IncidentResponse.from(safetyService.resolve(id, principal.getId()));
    }

    @PostMapping("/rides/{rideId}/share")
    @PreAuthorize("hasRole('PASSENGER')")
    public ShareResponse share(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID rideId
    ) {
        TripShareEntity share = safetyService.createShare(principal.getId(), rideId);
        return new ShareResponse(share.getToken(), "/api/v1/safety/share/" + share.getToken(), share.getExpiresAt());
    }

    @DeleteMapping("/rides/{rideId}/share")
    @PreAuthorize("hasRole('PASSENGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeShare(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID rideId
    ) {
        safetyService.revokeShare(principal.getId(), rideId);
    }

    @GetMapping("/share/{token}")
    public SafetyService.TripShareView publicShare(@PathVariable String token) {
        return safetyService.publicShare(token);
    }
}
