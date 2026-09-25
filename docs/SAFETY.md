# Safety Architecture

**Goal:** Make safety easy to reach without cluttering the normal ride flow.

---

## 1. Features

| Feature | Description |
|---------|-------------|
| **SOS** | One-tap alert during active ride (and optionally anytime logged in) |
| **Emergency contacts** | User-managed list; notified on SOS / share |
| **Trip sharing** | Time-limited link with live status/location to trusted people |
| **Trip PIN** | Server-generated PIN shown to passenger; driver confirms at start |
| **Driver identity** | Photo, name, rating on assignment |
| **Vehicle information** | Plate, color, make/model on assignment |
| **Incident reporting** | Post-ride or in-ride report |
| **Support escalation** | Ticket priority boost when linked to safety |
| **Audit logs** | All SOS and admin safety actions |

---

## 2. UX principles

- SOS control available on live trip screen; confirm step to reduce accidental taps (with short timeout bypass option for true emergencies—product decision)
- Do not cover map with permanent banners
- Driver app: safety actions must not require complex gestures while driving
- Accessibility: large hit targets; screen reader labels

---

## 3. SOS flow

```
User taps SOS (ride context preferred)
  → confirm
  → server creates safety_incidents + sos_events
  → records location snapshot
  → notifies emergency contacts (SMS via SmsGateway)
  → notifies on-call ops (push/email/webhook)
  → admin safety queue updates (WS admin.live)
  → optional: local emergency number deep-link (region config) — does not replace server alert
```

**Authorization:** authenticated user; prefer active ride association.

**Abuse:** rate limit; flag repeat false SOS for support review—never block first SOS hard-fail.

---

## 4. Emergency contacts

- CRUD on profile (max N contacts)
- Store name, phone E.164, relationship
- Used only for safety notifications & optional share defaults
- Verify phone ownership later (optional Phase+)

---

## 5. Trip sharing

```
POST /safety/rides/{id}/share → tokenized public URL (no account required for viewer)
  - Shows: status, coarse/fine location per policy, ETA, vehicle plate, driver first name
  - Expires at ride complete + grace or explicit TTL
  - Revocable by passenger
```

Public share endpoint is read-only, rate-limited, no PII beyond intended fields. No trip PIN on public page.

---

## 6. Trip PIN

- Generated at assignment / booking
- Passenger sees PIN; driver enters to `start` (configurable: required vs optional by market)
- Brute-force protection on PIN attempts
- PIN not sent to unauthorized channels

---

## 7. Identity & vehicle display

On `DRIVER_ACCEPTED` (and after):
- Driver display name, photo URL, rating
- Vehicle plate, color, type, model
- Masked phone / anonymized calling (preferred over raw number)

Data from server ride DTO—not client cache of arbitrary profiles.

---

## 8. Incident reporting

Categories (examples): reckless driving, harassment, accident, vehicle mismatch, other.  
Attachments via secure upload. Status workflow: `OPEN` → `UNDER_REVIEW` → `RESOLVED`.  
Links to ride, users, and support ticket.

---

## 9. Support escalation

- Safety incidents auto-create or link high-priority tickets
- SUPPORT role can view; resolving may require ADMIN
- SLA timers configurable

---

## 10. Audit & retention

- Immutable audit for SOS create, contact notify, admin acknowledge, share create/revoke
- Retention aligned with legal policy; exports for law enforcement via admin process (not ad-hoc SQL)

---

## 11. Privacy balance

| Data | Visibility |
|------|------------|
| Exact GPS on share page | Policy toggle; default on during active trip |
| Passenger home address | Never on share page |
| Emergency contact list | Never to driver |

---

## 12. Phase 0 boundary

Safety schemas and APIs specified; implementation in later phases after core ride flow exists.
