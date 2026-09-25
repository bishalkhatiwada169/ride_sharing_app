# Map Provider Selection + Kathmandu Field-Test Preparation

**Status:** Decision and testing-preparation (historical field-test plan)  
**Date:** 2026-09-25  
**Field tests:** Not executed — document still records **NO FINAL PROVIDER SELECTED** for coverage QA  
**MAP-1 implementation choice:** Passenger app uses **Google Maps Platform** for basic map rendering (see `apps/passenger-mobile`)

This document builds on the Map Provider + Location Architecture Audit. Field-test sections below remain valid for coverage QA; MAP-1 code lives in the passenger app, not here.

---

## 0. Architecture baseline (from audit — do not contradict without evidence)

| Finding | Status |
|---------|--------|
| PostGIS driver location + nearby matching | Implemented |
| FareEngine distance | Haversine (not road network) |
| Passenger coordinates | Manual entry |
| Passenger map UI | `MapPlaceholder` only |
| Backend `DRIVER_LOCATION` publish (Redis/STOMP) | Implemented |
| Passenger consume live driver location | Not implemented |
| Recommended architecture | **Hybrid:** mobile map SDK for display; backend `MapGateway` for secret-key geocode/route where appropriate; PostGIS remains matching/storage |
| `MapGateway` | Documented port only — **not implemented** |

Source audit recommendation: **field-test Kathmandu coverage before selecting a provider.**

Primary candidates: **A. Google Maps Platform** · **B. Mapbox**  
OSM-based stacks remain an alternative **without** using public Nominatim as production autocomplete ([Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) forbids client-side autocomplete via the public API and is unsuitable for heavy commercial use).

---

## 1. Official sources checked

### Google Maps Platform

| Topic | Official URL |
|-------|--------------|
| Maps SDK for Android overview | https://developers.google.com/maps/documentation/android-sdk/overview |
| Maps SDK Android usage & billing | https://developers.google.com/maps/documentation/android-sdk/usage-and-billing |
| Pricing list (SKU free caps & rates) | https://developers.google.com/maps/billing-and-pricing/pricing |
| Pricing overview / free thresholds | https://developers.google.com/maps/billing-and-pricing/overview |
| SKU details (Maps SDK unlimited, Dynamic Maps triggers) | https://developers.google.com/maps/billing-and-pricing/sku-details |
| Pricing FAQ (credit → free usage; Legacy services) | https://developers.google.com/maps/billing-and-pricing/faq |
| API security / key restrictions | https://developers.google.com/maps/api-security-best-practices |
| Places API (New) overview | https://developers.google.com/maps/documentation/places/web-service/overview |
| Routes API | https://developers.google.com/maps/documentation/routes/overview |
| Geocoding API | https://developers.google.com/maps/documentation/geocoding/overview |
| Terms of Service | https://cloud.google.com/maps-platform/terms |

### Mapbox

| Topic | Official URL |
|-------|--------------|
| Maps SDK for Android | https://docs.mapbox.com/android/maps/guides/ |
| React Native getting started (`@rnmapbox/maps`) | https://docs.mapbox.com/help/tutorials/getting-started-react-native/ |
| Access tokens | https://docs.mapbox.com/help/dive-deeper/access-tokens/ |
| Token management / URL restrictions | https://docs.mapbox.com/accounts/guides/tokens/ |
| Tokens API | https://docs.mapbox.com/api/accounts/tokens/ |
| Search Box API | https://docs.mapbox.com/api/search/search-box/ |
| Geocoding API | https://docs.mapbox.com/api/search/geocoding/ |
| Directions API | https://docs.mapbox.com/api/navigation/directions/ |
| Pricing | https://www.mapbox.com/pricing |

### OSM / Nominatim (alternative only)

| Topic | Official URL |
|-------|--------------|
| Nominatim Usage Policy | https://operations.osmfoundation.org/policies/nominatim/ |

---

## 2. Google Maps Platform — verified facts

### Integration (Android / React Native)

- **Fact:** Official product for native Android map display is **Maps SDK for Android** ([overview](https://developers.google.com/maps/documentation/android-sdk/overview)). Requires API key and billing enabled on the Google Cloud project.
- **Fact:** Google documents platform-specific Places libraries for Android/iOS/JS and recommends using the platform-appropriate Places surface for apps ([Places API (New) overview](https://developers.google.com/maps/documentation/places/web-service/overview)).
- **Fact:** There is **no first-party Google “React Native Maps SDK”** called out in the Maps SDK Android overview. Common RN paths use community wrappers (e.g. `react-native-maps` with Google provider) wrapping the native SDK — **integration quality must be validated in this repo when implementation is approved** (not done in this phase).
- **Unknown:** Exact `react-native-maps` / New Architecture compatibility matrix for *this* monorepo’s RN version until a spike is run.

### APIs relevant to this product

| Need | Google product (official) |
|------|---------------------------|
| Map tiles / markers / camera | Maps SDK for Android |
| Autocomplete / POI / place details | Places API (New) (+ Android Places library where used) |
| Address ↔ coordinates | Geocoding API |
| Road routes / ETA / polyline | Routes API (Directions API Legacy is designated Legacy — prefer Routes) |

### Billing & free usage (sourced)

- Billing must be enabled on the Cloud project for production Maps Platform use ([Maps SDK overview](https://developers.google.com/maps/documentation/android-sdk/overview)).
- Free monthly usage thresholds replace the old $200 credit model (effective ~March 1, 2025) ([pricing FAQ](https://developers.google.com/maps/billing-and-pricing/faq)).
- **Maps SDK** SKU: listed as **Unlimited** free for qualifying mobile Maps SDK map loads without map ID ([SKU details](https://developers.google.com/maps/billing-and-pricing/sku-details); [Android usage](https://developers.google.com/maps/documentation/android-sdk/usage-and-billing)).
- **Dynamic Maps** (e.g. with map ID on mobile): billed per map load after free cap — see price list.
- Most **Essentials** SKUs: **10,000** free billable events/month; **Pro** often **5,000** ([pricing overview](https://developers.google.com/maps/billing-and-pricing/overview)).
- Places Autocomplete / Geocoding / Routes each bill under their own SKUs — volumes stack.

**Exact production cost requires provider calculator/account verification.**  
Do not invent a monthly dollar amount.

### API keys & restrictions

From [API security best practices](https://developers.google.com/maps/api-security-best-practices):

- Restrict keys with **application** + **API** restrictions.
- **Android apps:** package name + **SHA-1** signing certificate fingerprint.
- **Server/web services:** IP (or OAuth where supported); separate keys from mobile.
- Use **separate keys per app**; split client vs server; never rely on unrestricted keys (owner is financially responsible for abuse).

### Commercial / handover

- Use is governed by [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms). Ride-hailing-specific clauses and caching rules must be reviewed by the business before production — **not completed as legal review in this phase**.
- Production Cloud project + billing should be owned by the **buyer legal entity** (aligns with `docs/EXTERNAL_SERVICES.md`).

### Kathmandu

- **Unknown until field-tested.** No performance claims in this document.

---

## 3. Mapbox — verified facts

### Integration (Android / React Native)

- **Fact:** Official **Maps SDK for Android** (current docs cite v11.x) for native embedding ([Maps SDK guides](https://docs.mapbox.com/android/maps/guides/)). Attribution (and telemetry opt-out via attribution) required.
- **Fact:** Mapbox’s official tutorial for RN uses community **`@rnmapbox/maps`**, explicitly noting it is **community-maintained, not an official Mapbox product**, and may lag native SDK features ([Getting started with Maps in React Native](https://docs.mapbox.com/help/tutorials/getting-started-react-native/)).
- **Unknown:** Maintenance risk and feature parity of `@rnmapbox/maps` vs this project’s RN/Android toolchain until a spike is run.

### APIs relevant to this product

| Need | Mapbox product (official) |
|------|---------------------------|
| Map display | Maps SDK / `@rnmapbox/maps` |
| Interactive search / POI | Search Box API (+ Search SDK for Android) |
| Forward / reverse geocode | Geocoding API (v6; POIs directed to Search Box) |
| Routes / traffic-aware driving | Directions API (`driving-traffic`, etc.) |
| Turn-by-turn (future driver) | Navigation SDK (separate MAU/trip pricing on [pricing](https://www.mapbox.com/pricing)) |

### Billing & free usage (sourced)

- Pay-as-you-go with free tiers for many products ([Mapbox pricing](https://www.mapbox.com/pricing)).
- Mobile Maps SDK metering is commonly **MAU**-based with a free band shown on the pricing page (e.g. up to **25,000 MAU** free for Maps SDKs for Mobile — confirm live page at account time).
- Search Box: session- and/or request-based pricing with free introductory bands shown on pricing page.
- Geocoding: Temporary vs Permanent (storage) distinctions matter for caching/persistence — verify before storing results.
- Directions / Navigation: request- and/or MAU/trip based.

**Exact production cost requires provider calculator/account verification.**

### Tokens & restrictions

From [Access tokens](https://docs.mapbox.com/help/dive-deeper/access-tokens/) and [Token management](https://docs.mapbox.com/accounts/guides/tokens/):

- Public tokens (`pk.`) for client; secret tokens (`sk.`) for server — **never put secret tokens in the APK**.
- Scope tokens to least privilege.
- **URL restrictions do not apply to native mobile Maps/Navigation SDK requests**; a URL-restricted token can make mobile unusable — maintain a **separate mobile token** ([Tokens API note](https://docs.mapbox.com/api/accounts/tokens/)).

### Commercial / handover

- Review Mapbox Terms / any **Commercial Application License** requirements for vehicle or certain B2B uses ([pricing page commercial license section](https://www.mapbox.com/pricing)) with counsel before production.
- Account + billing should be owned by the **buyer legal entity**.

### Kathmandu

- **Unknown until field-tested.** Traffic coverage for `driving-traffic` depends on Mapbox traffic geography — **verify** for Nepal during routing tests.

---

## 4. Objective comparison (no scores, no winner)

| Criterion | Google Maps | Mapbox |
|-----------|-------------|--------|
| Android map SDK | Official Maps SDK for Android | Official Maps SDK for Android (v11.x) |
| React Native integration | Typically community wrapper over Google Maps SDK (e.g. `react-native-maps`); **not field-validated here** | Official tutorial uses community `@rnmapbox/maps` (not official Mapbox product) |
| Search/autocomplete | Places API (New) / platform Places | Search Box API (+ Search SDK) |
| Geocoding | Geocoding API | Geocoding API v6 |
| Reverse geocoding | Geocoding API | Geocoding API |
| Routing | Routes API (preferred over Legacy Directions) | Directions API |
| ETA | Routes / traffic products | Directions + optional Matrix/Navigation; Search ETA incurs extra Matrix billing if enabled |
| Kathmandu testing status | **Not field-tested** | **Not field-tested** |
| API key model | Cloud API keys; Android package + SHA-1; IP for server | Public vs secret tokens; scopes; URL restrict = web only |
| Backend integration | Fits planned `MapGateway` (Places/Geocode/Routes server-side) | Fits planned `MapGateway` (Search/Geocode/Directions server-side) |
| Pricing model | Pay-as-you-go SKUs + monthly free caps; Maps SDK often unlimited | Free tiers + MAU / sessions / requests; Navigation separate |
| Commercial considerations | GMP Terms; legal review pending | Terms + possible commercial/vehicle license; legal review pending |
| Lock-in | High to Google APIs/place IDs | High to Mapbox APIs/styles/tokens |
| Handover to buyer | Transfer Cloud project/billing ownership | Transfer Mapbox account/billing ownership |
| Operational complexity | Familiar Cloud Console; many SKUs to monitor | Token/scopes/MAU monitoring; RN community wrapper risk |

OSM stack: lower vendor lock-in, higher ops (self-host or paid Nominatim-compatible + router). **Public Nominatim is not a production autocomplete option.**

---

## 5. Kathmandu field-test plan

### 5.1 Environment reality check

**Field testing of map SDKs has not been performed in this phase.**

From the current development environment:

- No map SDK is installed in passenger/driver apps.
- No production or test API keys are configured for maps.
- In-app map rendering / GPS / Places UI cannot be exercised until a later approved implementation spike.

**What can be done before SDK install (optional, separate from this repo change):**

1. Create **buyer-owned** trial Cloud / Mapbox accounts (not contractor-owned long-term).
2. Use official **API Playgrounds / HTTP APIs** for search, geocode, reverse, and directions against Kathmandu coordinates (still counts as usage — use free tiers carefully).
3. Visually compare results in each provider’s web map / Studio / Cloud console tools.
4. Record results in the templates below — **do not invent results**.

**What requires a device in Kathmandu (or local device with live GPS):**

- GPS accuracy / drift
- Network quality edge cases on real Nepali carriers
- Map pan/zoom feel on mid-range Android devices

### 5.2 Location categories to cover

Test across categories (not only famous tourist spots):

| Category | Intent |
|----------|--------|
| Central Kathmandu | Dense urban core |
| Dense residential streets | Local gali / house-level pickup |
| Major highways | Ring Road / arterial routing |
| Narrow / local roads | Plausibility of turn-by-turn geometry |
| Major intersections | Search + route start/end ambiguity |
| Airport area | TIA / access roads |
| Business districts | Thamel / New Road / Durbar Marg style POIs |
| Complex addresses | Ward / tole / landmark-relative addresses |
| Nepali landmarks | Local names users actually type |
| EN / NP address variants | Same place, different language/script |

### 5.3 Test procedures

#### A. Map rendering (after SDK spike — not now)

For each provider on the same Android device:

- Cold-start map load time (first paint)
- Visual road/building alignment vs known ground truth
- Marker drop accuracy at known lat/lng
- Zoom/pan smoothness; crash/ANR over 5 minutes
- Stability under rapid camera moves

#### B. GPS (device; independent of provider map tiles)

- Accuracy at outdoor open sky vs dense street
- Update cadence while walking ~100 m
- Drift when stationary 60 s
- Behavior when Location off / mocked location

#### C. Search (API or SDK)

For each row in §6.1:

- Query as English
- Query as Nepali / transliteration where applicable
- Record: top-3 results, chosen result lat/lng, address string, time-to-first-result, empty/wrong results

#### D. Geocoding / reverse

- Forward: search → coordinates vs expected area
- Reverse: §6.2 coordinates → readable locality (tole / area / city)

#### E. Routing

For each route in §6.3:

- Route returned? (Y/N)
- Plausible for cars? (human judgment)
- Distance (m), duration (s)
- Alternatives count
- Stability: same request twice → similar geometry?

#### F. Edge cases

| Case | Expected observation to record |
|------|--------------------------------|
| GPS unavailable | Fallback UX path (manual pin) — design only until implemented |
| Poor network | Timeout / partial tiles / failed search |
| Permission denied | App still usable? |
| Inaccurate location | Pin far from true position |
| Ambiguous destination | Multiple similar names |
| No search result | Empty state |
| Route unavailable | Error vs absurd detour |

### 5.4 Pass / fail rubric (qualitative)

Do **not** assign numeric scores that imply a winner. For each provider, mark per category:

- **Pass** — usable for commercial pickup/drop in that category  
- **Weak** — often wrong / incomplete but sometimes usable  
- **Fail** — systematically unusable for that category  
- **Not tested**

A provider should only become a **final** choice if search + geocode + routing are at least **Pass** for the majority of Kathmandu categories that matter to day-1 launch geography.

---

## 6. Test dataset (cases only — no fabricated results)

Copy into a spreadsheet; fill **Result** columns only after real tests.

### 6.1 Destination searches (~20)

| ID | Category | Query (example) | Language | Notes | Google result | Mapbox result |
|----|----------|-----------------|----------|-------|---------------|---------------|
| S01 | Airport | Tribhuvan International Airport | EN | Major landmark | | |
| S02 | Airport | TIA Kathmandu | EN | Abbreviation | | |
| S03 | Hospital | Teaching Hospital Maharajgunj | EN | Hospital | | |
| S04 | Hospital | Bir Hospital | EN | Central hospital | | |
| S05 | College | Tribhuvan University Kirtipur | EN | College/campus | | |
| S06 | College | Pulchowk Campus | EN | Engineering campus | | |
| S07 | Hotel | Hotel Yak & Yeti | EN | Hotel | | |
| S08 | Hotel | Kathmandu Marriott | EN | Hotel | | |
| S09 | Restaurant | Bhojan Griha | EN | Restaurant / heritage | | |
| S10 | Shopping | Civil Mall Sundhara | EN | Shopping | | |
| S11 | Shopping | Bhatbhateni Supermarket Maharajgunj | EN | Chain store | | |
| S12 | Landmark | Swayambhunath | EN | Landmark | | |
| S13 | Landmark | स्वयम्भू | NP | Same landmark, Nepali | | |
| S14 | Landmark | Pashupatinath Temple | EN | Landmark | | |
| S15 | Business | Nepal Rastra Bank central office | EN | Business / institution | | |
| S16 | Residential | Baneshwor height residential area | EN | Area-level, not precise house | | |
| S17 | Residential | Koteshwor near Balkumari | EN | Relative landmark address | | |
| S18 | Intersection | New Baneshwor chowk | EN | Intersection | | |
| S19 | Intersection | Kalanki chowk | EN | Ring Road node | | |
| S20 | Business district | Thamel Marg restaurants | EN | Ambiguous / area POI | | |

Optional extras if time: ward-number style addresses, bus-park, Patan Durbar Square, Bhaktapur Durbar Square (valley).

### 6.2 Reverse-geocoding coordinates (~10)

Approximate public reference points (verify on device/map before testing). Record returned label quality.

| ID | Category | Lat | Lng | Expected locality (human) | Google reverse | Mapbox reverse |
|----|----------|-----|-----|---------------------------|----------------|----------------|
| R01 | Airport area | 27.6981 | 85.3591 | Near TIA | | |
| R02 | Central / Durbar area | 27.7045 | 85.3077 | Near Kathmandu Durbar Square | | |
| R03 | Business / Thamel | 27.7154 | 85.3123 | Thamel | | |
| R04 | Shopping / Sundhara | 27.7008 | 85.3130 | Near Civil Mall / Sundhara | | |
| R05 | Residential Baneshwor | 27.6915 | 85.3420 | New Baneshwor area | | |
| R06 | Ring Road Kalanki | 27.6933 | 85.2816 | Kalanki area | | |
| R07 | Patan | 27.6727 | 85.3250 | Patan / Lalitpur core | | |
| R08 | University Kirtipur | 27.6816 | 85.2880 | Near TU Kirtipur | | |
| R09 | Narrow street sample | 27.7100 | 85.3085 | Dense street west of Ratna Park (verify on ground) | | |
| R10 | Highway / arterial | 27.6770 | 85.3330 | Near Satdobato / arterial (verify) | | |

### 6.3 Representative routes (~10)

| ID | Type | Origin (lat,lng) | Destination (lat,lng) | Intent | Google route | Mapbox route |
|----|------|------------------|------------------------|--------|--------------|--------------|
| T01 | Short urban | 27.7154,85.3123 (Thamel) | 27.7045,85.3077 (Durbar) | Short urban | | |
| T02 | Short urban | 27.7008,85.3130 (Sundhara) | 27.6915,85.3420 (Baneshwor) | Cross-central | | |
| T03 | Medium city | 27.7154,85.3123 (Thamel) | 27.6981,85.3591 (TIA) | Medium + airport approach | | |
| T04 | Medium city | 27.6933,85.2816 (Kalanki) | 27.7154,85.3123 (Thamel) | Ring Road → center | | |
| T05 | Longer valley | 27.7154,85.3123 (Thamel) | 27.6727,85.3250 (Patan) | Cross-municipality | | |
| T06 | Longer valley | 27.7154,85.3123 (Thamel) | 27.6710,85.4298 (Bhaktapur area — verify pin) | Valley length | | |
| T07 | Narrow roads | Pick two points on a dense gali in Asan/Indra Chowk after ground check | | Narrow geometry | | |
| T08 | Major intersection endpoints | 27.6910,85.3425 (New Baneshwor) | 27.7005,85.3200 (near Singha Durbar area — verify) | Arterial | | |
| T09 | Airport egress | 27.6981,85.3591 (TIA) | 27.6915,85.3420 (Baneshwor) | Airport exit plausibility | | |
| T10 | Alternative-rich | 27.6816,85.2880 (Kirtipur) | 27.7008,85.3130 (Sundhara) | Multiple path options | | |

For each route record: available Y/N, distance, duration, alternative count, plausibility notes, traffic profile used (if any).

---

## 7. Cost model (drivers of usage — no invented monthly $)

### 7.1 What generates billable usage

| Actor | Operation | Typically bills as |
|-------|-----------|-------------------|
| Passenger | Open Home / Booking map | Map load / MAU |
| Passenger | Autocomplete keystrokes | Places session / Search session / Autocomplete SKU |
| Passenger | Place details after select | Place Details SKU / retrieve |
| Passenger | Reverse geocode on pin settle | Geocoding |
| Passenger | Route preview | Routes / Directions request |
| Passenger | Active ride map | Map MAU + optional refresh (avoid re-billing patterns) |
| Driver | Online map | Map load / MAU |
| Driver | Turn-by-turn (future) | Navigation MAU and/or trips (Mapbox) or Navigation SDK SKUs (Google) |
| Backend `MapGateway` | Geocode / reverse / route / ETA for fare | Server SKUs (same products) |

### 7.2 What gets expensive at scale

- **Autocomplete without session batching** (every keystroke = new billable unit where sessions aren’t used).
- **Route requests on every map pan** instead of once per confirmed OD pair.
- **Reverse geocode on every camera move** instead of on pin settle / debounce.
- **Permanent storage of geocode results** under the wrong license tier (Mapbox Temporary vs Permanent).
- **Driver Navigation** for all online hours (MAU + trips) if free-drive is always on.
- **Unrestricted leaked keys** (abuse traffic).

### 7.3 Cost controls (architecture-aligned)

- Debounce search (≥300 ms) and use **session tokens** where the provider bills by session.
- Cache reverse geocode by geohash **only if ToS/license allows**.
- One route request per quote preview; reuse polyline until OD changes.
- Keep **fare distance** server-side; do not spam Routes from every device for pricing (hybrid audit recommendation).
- Quotas + budget alerts in Cloud / Mapbox dashboards.
- Separate prod vs dev projects so load tests cannot drain prod free tiers.

**Exact production cost requires provider calculator/account verification.**

---

## 8. API key / account ownership

### 8.1 Ownership rule

The **final buyer / business legal entity** must own:

- Google Cloud project **or** Mapbox account  
- Billing account / payment method  
- Production API keys / tokens  
- Production project IDs  
- Restriction configuration  

The developer/contractor must **not** permanently own production credentials. Aligns with `docs/EXTERNAL_SERVICES.md`.

**Do not create credentials in this phase.**

### 8.2 Mobile credential (future)

| Provider | Restrictions |
|----------|----------------|
| Google | Android application restriction: **package name + SHA-1** (debug key for debug builds; Play App Signing cert for release). API restrictions: Maps SDK (+ Places if called from device). No server IPs on this key. |
| Mapbox | **Public** token (`pk.`); minimal scopes for maps/search as needed; **do not** apply URL restrictions if used by native Maps SDK; never embed `sk.` |

Store via env / native secure resources — never commit secrets to git.

### 8.3 Backend credential (future)

| Provider | Storage |
|----------|---------|
| Google | Server key with **IP restriction** (or OAuth where applicable); APIs: Geocoding, Places, Routes only as needed. Env: `MAP_API_KEY` / `MAP_PROVIDER` (as already sketched). |
| Mapbox | **Secret** token only on server; scopes limited; env vars / secret manager. |

### 8.4 Development vs production

| | Development | Production |
|--|-------------|------------|
| Project/account | Separate Cloud/Mapbox project | Buyer-owned production project |
| Keys | Debug SHA-1 / unrestricted-local carefully | Strict package/IP/scopes |
| Quotas | Low daily caps | Production caps + alerts |
| Data | Synthetic Kathmandu fixtures OK | Real PII minimized |

---

## 9. Decision rule (no popularity contest)

Select a provider **only after** evaluating:

1. Kathmandu **search** quality (dataset §6.1)  
2. Kathmandu **geocoding** quality  
3. Kathmandu **routing** quality (dataset §6.3)  
4. React Native **Android** integration risk (official vs community wrappers)  
5. Pricing model vs expected map/search/route volumes  
6. API / security model (mobile vs backend keys)  
7. Commercial licensing fit for ride-hailing  
8. Long-term maintenance (SDK + RN wrapper health)  
9. Business handover (account ownership transfer)  
10. Operational complexity (SKU/MAU monitoring, support)

**Hard stop:** If Kathmandu search + routing are **Fail** for day-1 service area, do not select that provider regardless of brand.

**Current field-test status:** Not performed → **cannot finalize.**

---

## 10. Recommendation format

### Provider status

**Google Maps**

- **Verified facts:** Official Android Maps SDK; Places (New); Routes; Geocoding; billing with free SKU caps; Android package+SHA-1 restrictions; Maps SDK often unlimited without map ID.  
- **Unknowns:** Kathmandu search/POI/routing quality; RN wrapper fit for this repo; legal ToS fit for this commercial use.  
- **Field tests required:** Full §5–§6 battery.

**Mapbox**

- **Verified facts:** Official Android Maps SDK; Search Box; Geocoding; Directions; public/secret tokens; URL restrictions incompatible with native mobile SDKs; free tiers on pricing page; RN via community `@rnmapbox/maps`.  
- **Unknowns:** Kathmandu quality; traffic coverage in Nepal; Navigation license needs; community RN wrapper longevity.  
- **Field tests required:** Full §5–§6 battery.

### Kathmandu test plan

Execute §5 procedures using §6 datasets; record Pass/Weak/Fail; no invented results.

### Decision criteria

Apply §9 after both providers are tested on the same device/network/queries.

### Current recommendation

## NO FINAL PROVIDER SELECTED

Rationale: Architecture audit required Kathmandu field-testing before selection; **no field tests have been executed** in this phase; pricing depends on usage calculators; commercial ToS review is pending.

*(If stakeholders need a planning bias before tests: Google is often chosen for Places density familiarity and Maps SDK unlimited mobile loads — but that is **PROVISIONAL ONLY — NOT FINAL** and must not override failed Kathmandu tests.)*

### Implementation plan after provider selection (do not start now)

1. Provider account/configuration (buyer-owned)  
2. Passenger GPS / location permissions (foreground; request in context)  
3. Map SDK integration (replace `MapPlaceholder` only when approved)  
4. Destination search / autocomplete (prefer backend proxy)  
5. Reverse geocoding (pin settle)  
6. Route / polyline preview  
7. Backend `MapGateway`  
8. Fare/routing decision (keep Haversine until explicit upgrade)  
9. Passenger live driver location (consume existing WS / REST)  
10. Driver location improvements (real GPS; background only while online)  
11. Testing / security / cost validation (quotas, key abuse, ToS cache rules)

---

## 11. Unresolved questions

1. Will day-1 launch geography be Kathmandu Valley only, or include Pokhara / other cities?  
2. Must fare distance become road-network based in v1 of maps, or remain Haversine?  
3. Is driver turn-by-turn navigation in scope for year 1?  
4. Buyer entity ready to own Cloud/Mapbox billing before SDK work?  
5. Acceptable RN community wrapper risk vs delaying for official bindings?  
6. Nepali-script search quality weight vs English transliteration?

---

## 12. Verification checklist (this phase)

| Check | Confirmed |
|-------|-----------|
| No map SDK installed | Yes (`package.json` has no `react-native-maps` / `@rnmapbox` / Google Maps packages) |
| No API keys added | Yes (docs only; no credential creation) |
| No AndroidManifest permission changes | Yes |
| No Gradle map changes | Yes |
| No `MapPlaceholder` / passenger UI changes | Yes |
| No driver UI changes | Yes |
| No backend business logic / FareEngine / matching / PostGIS / WebSocket changes | Yes |
| No pricing rule changes | Yes |

---

## Document history

| Date | Change |
|------|--------|
| 2026-09-25 | Initial decision + Kathmandu field-test prep; **NO FINAL PROVIDER SELECTED** |
