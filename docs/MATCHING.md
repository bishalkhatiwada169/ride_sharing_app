# Driver Matching Architecture

**Goal:** Assign a suitable nearby driver to a ride request using PostgreSQL/PostGIS, with a replaceable ranking strategy.  
**Boundary:** Matching logic lives in `matching` domain services — never in controllers.

---

## 1. Responsibilities

| In scope | Out of scope (initially) |
|----------|---------------------------|
| Nearby candidate search | Full ML dispatch |
| Filters: online, available, verified, vehicle type | Multi-hop carpool |
| Ranking & offer dispatch | Guaranteed ETA SLAs |
| Timeouts, retries, no-driver | Cross-city routing |

---

## 2. Ports (replaceable design)

```java
public interface MatchingEngine {
  MatchingResult findCandidates(MatchingQuery query);
}

public interface OfferDispatcher {
  void dispatchOffer(RideOffer offer);
}

public interface EtaEstimator {
  Duration estimateArrival(Point driver, Point pickup);
}
```

Implementations:
- `PostgisMatchingEngine` (v1)
- Future: `RedisGeoMatchingEngine`, `ExternalDispatchAdapter`

Configuration selects implementation. Controllers call `RideApplicationService` → matching ports.

---

## 3. Matching query inputs

```
rideId
pickup (geography)
vehicleType
excludeDriverIds[]
maxRadiusMeters (config)
limit (config)
passengerId (for fairness / blocks later)
```

---

## 4. Eligibility filters (hard)

Driver must satisfy **all**:
1. `verification_status = APPROVED`
2. `is_online = true`
3. `availability_status = AVAILABLE`
4. Active vehicle of requested `vehicle_type` with `ACTIVE` status
5. Required documents approved / not expired (policy)
6. `location_updated_at` within staleness threshold (e.g. 60–120s)
7. Not in exclude list (recent reject, cancel abuse, blocked pairs)
8. Not already `ON_OFFER` / `ON_TRIP` (unless multi-offer policy explicitly allows)

PostGIS: `ST_DWithin(current_location, pickup, maxRadiusMeters)`.

---

## 5. Ranking (soft, configurable)

Score components (weights in config):
- Distance to pickup (primary)
- Estimated arrival time
- Driver rating
- Acceptance rate / cancellation rate (later)
- Fairness (time since last ride)
- Optional surge zone priority

v1 recommended: **distance ASC**, then rating DESC. Persist rank explanation in offer metadata for debugging.

---

## 6. Offer flow

```
SEARCHING_DRIVER
  → select top N candidates (usually N=1 sequential, or small batch)
  → set driver availability ON_OFFER
  → emit DRIVER_OFFER (WS + push)
  → wait accept timeout (e.g. 15–30s)
       → ACCEPT: assign ride, DRIVER_ACCEPTED / DRIVER_ASSIGNED per machine
       → REJECT / timeout: release driver, add to exclude, retry search
  → if radius exhausted / max attempts: NO_DRIVER_FOUND
  → global search deadline: EXPIRED
```

**Sequential offers** reduce double-assign risk. Use Redis lock `ride:{id}:matching` and DB transaction with optimistic locking.

---

## 7. Concurrency & consistency

| Mechanism | Use |
|-----------|-----|
| Redis distributed lock | Matching loop per ride |
| DB transaction | Ride status + driver availability |
| Idempotent accept | Only one driver wins; others get `OFFER_EXPIRED` |
| Optimistic lock on ride | Prevent stale transition |

---

## 8. Integration with ride state machine

| Matching outcome | Transition |
|------------------|------------|
| Start search | `REQUESTED` → `SEARCHING_DRIVER` |
| Driver accepts | → `DRIVER_ACCEPTED` |
| Exhausted | → `NO_DRIVER_FOUND` |
| Search timeout | → `EXPIRED` |
| Passenger cancel | → `CANCELLED_BY_PASSENGER` (abort loop) |

**Canonical v1 (locked in Phase 0):**  
`SEARCHING_DRIVER → DRIVER_ACCEPTED → DRIVER_ARRIVING`.

`DRIVER_ASSIGNED` is not used in the live enum for v1; offers are tracked separately until accept. See `ARCHITECTURE.md` ride state machine.

---

## 9. ETA

v1: haversine/road-factor heuristic (`distance / assumedCitySpeed`).  
Later: `MapGateway` route ETA. ETA is informational; not a legal promise.

---

## 10. Observability

Metrics: time-to-first-offer, accept rate, attempts-to-assign, no-driver rate, matching lock contention.  
Structured logs with `rideId`, `attempt`, `candidateDriverId`, `distanceM`.

---

## 11. Admin / ops

- Requeue stuck `SEARCHING_DRIVER`
- Temporarily widen radius via config
- Force unassign only with audit (rare)

---

## 12. Phase 0 boundary

No matching code yet. Schema fields (`availability_status`, location) planned in `DATABASE.md`.
