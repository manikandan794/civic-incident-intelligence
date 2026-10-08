# URBANGRID — Technical Architecture & System Design Document

**Platform Name:** URBANGRID  
**Subtitle:** AI-Powered Municipal Civic Grievance Deduplication & Dispatch Platform  
**Target Deployment:** Tamil Nadu Municipal Administration & Urban Water Supply Department  

---

## 1. System Overview & Problem Statement

Municipal corporations across Tamil Nadu (Greater Chennai Corporation, Tambaram, Avadi, Coimbatore, Madurai) face massive grievance intake volumes for recurring civic infrastructure defects—such as potholes, overflowing garbage bins, water mains ruptures, non-functional streetlights, and drainage blockages.

When a major civic failure occurs in a dense public area, dozens of citizens independently file separate complaints. Conventional municipal portals (e.g., CCMC, Namma Chennai) create separate tickets for each submission. This creates:
1. **Queue Flooding:** Municipal engineers are overwhelmed by duplicate tickets.
2. **Resource Misallocation:** Multiple crews get dispatched to the same physical pothole.
3. **Citizen Frustration:** Disconnected tickets get closed haphazardly without collective status updates.

**URBANGRID resolves this with an autonomous 50-meter spatial deduplication perimeter, multimodal AI vision inspection, multi-signal evidence fusion, dynamic priority escalation, automated ward routing, and field crew dispatch with mandatory officer verification.**

---

## 2. High-Level System Architecture

```
                       +---------------------------------------+
                       |           CITIZEN CLIENT              |
                       |  React 18 + Vite + Tailwind + Leaflet |
                       +-------------------+-------------------+
                                           |
                              HTTPS / REST | Form-Data (Media + GPS)
                                           v
                       +---------------------------------------+
                       |           FASTAPI GATEWAY             |
                       |      (Uvicorn Asynchronous Engine)    |
                       +-------------------+-------------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
+-------------------------------------+         +-------------------------------------+
|      MULTIMODAL AI PIPELINE         |         |      SPATIAL DEDUPLICATION ENGINE   |
| - Gemini Vision AI Analysis         |         | - PostGIS / Haversine (50m Radius)  |
| - Severity & Category Detection     |         | - Multi-Signal Weighted Evidence    |
| - Deterministic Heuristic Fallback  |         | - Historical Recurrence Matcher     |
| - Telemetry & Latency Logging       |         | - Dynamic Priority Escalator        |
+------------------+------------------+         +------------------+------------------+
                   |                                               |
                   +-----------------------+-----------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |       POSTGRESQL / POSTGIS DB         |
                       | - Spatial Indexes (Lat/Lng)           |
                       | - Relational Ticket Master & Reports  |
                       | - Audit Logs & Realtime Timelines     |
                       | - In-App Multi-Role Notifications     |
                       +-------------------+-------------------+
                                           |
                 +-------------------------+-------------------------+
                 v                                                   v
+---------------------------------+                 +---------------------------------+
|      WARD OFFICER DASHBOARD     |                 |       FIELD WORKER PORTAL       |
| - Live Geospatial Operations Map|                 | - Assigned Work Roster          |
| - Ward 12 KPI & Queue Analytics |                 | - On-Site Action State Machine  |
| - Crew Dispatch & Assignment    |                 | - Work Completion Submissions   |
| - Mandatory Verification Gate   |                 | - Realtime Status Updates       |
+---------------------------------+                 +---------------------------------+
```

---

## 3. Database Schema & Relational Design

The system runs on **PostgreSQL 17** with spatial capabilities:

1. **`users`**: RBAC accounts (Roles: `CITIZEN`, `OFFICER`, `WORKER`, `ADMIN`) with native bcrypt password hashes.
2. **`wards`**: Administrative municipal boundaries across Tamil Nadu (Chennai Wards 1-200, Tambaram, Coimbatore, Ramanathapuram) with centroid coordinates.
3. **`workers`**: Municipal field crew roster linked to `users`, including ward assignment, specialization (Civil, Sanitation, Electrical, Drainage), and availability state.
4. **`complaints`**: Master civic grievance entity representing physical defects. Stores ticket number (`UG-1001`), category, severity, escalated priority, composite coordinates, report count, supporting report count, recurrence count, active duplicate radius snapshot, assigned worker, and resolution timestamp.
5. **`complaint_reports`**: Individual citizen submissions attached to a master complaint, maintaining citizen contact, precise submission coordinates, and distance delta to the master.
6. **`complaint_media`**: Evidence photos and videos stored locally on disk with MIME validation, file size enforcement (<=50MB), and public URLs.
7. **`ai_analyses`**: Structured telemetry and inference results from Gemini Vision AI (category, severity, confidence, keywords, safety impact, latency ms, fallback flag).
8. **`duplicate_matches`**: Mathematical breakdown of why a report was merged into a master ticket (distance meters, spatial score, visual score, text score, category score, final score).
9. **`complaint_timeline`**: Immutable chronological lifecycle log with real DB timestamps and actor attribution (`REPORT_SUBMITTED` -> `AI_ANALYSIS_COMPLETED` -> `DUPLICATE_CHECK_PASSED` -> `WARD_ASSIGNED` -> `WORKER_ASSIGNED` -> `WORK_STARTED` -> `WORK_COMPLETED_AWAITING_VERIFICATION` -> `OFFICER_VERIFIED_AND_RESOLVED`).
10. **`notifications`**: Targeted in-app civic notifications with target role, unread flags, and complaint link.
11. **`work_assignments`**: Field crew dispatches with assignment notes, started at, completed at, and verification status.
12. **`system_settings`**: Key-value settings storing the active deduplication radius (50m default).
13. **`ai_telemetry_logs`**: Safe telemetry audit logs tracking model performance and uptime without storing secret keys.

---

## 4. Multi-Signal Spatial Deduplication Engine

### The 50-Meter Hard Spatial Perimeter Rule
A ticket located outside the configured radius (default **50.0 meters**) **CANNOT** be classified as a duplicate, regardless of visual similarity. In municipal operations, two identical potholes 200 meters apart on the same avenue are physically distinct problems requiring independent repairs.

### Mathematical Spatial Distance Calculation
Calculated via WGS-84 Haversine spherical geodesic distance:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{ \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right) } \right)$$

$$d = R \cdot \Delta\sigma \quad (R = 6,371,000 \text{ meters})$$

### Explainable Multi-Signal Duplicate Scoring
Within the 50m radius, candidate complaints are evaluated against four independent signals:

| Signal Evidence | Weight | Computation Method |
| :--- | :---: | :--- |
| **Spatial Proximity** | **30%** | Linear decay from 100% at 0m to 0% at 50m: $\max(0, 100 \cdot (1 - d / r))$ |
| **Visual Evidence** | **40%** | Gemini multimodal category match + keyword Jaccard overlap between evidence photos |
| **Description Similarity** | **20%** | Normalized token-level Jaccard word-set intersection over union |
| **Category Match** | **10%** | 100% for identical category; 50% for compatible infrastructure domain |

$$\text{Final Score} = (0.30 \times S_{\text{spatial}}) + (0.40 \times S_{\text{visual}}) + (0.20 \times S_{\text{text}}) + (0.10 \times S_{\text{category}})$$

- **Decision Threshold:** A candidate is merged as a duplicate if $\text{Distance} \le 50\text{m}$ and $\text{Final Score} \ge 60\%$.
- **Action upon Merge:** The citizen report is appended as supporting evidence to the master ticket, the report count increments ($1 \to 2 \to 3$), priority recalculates, and notifications fire to the assigned ward officer and citizen.

---

## 5. Dynamic Priority Escalation Matrix

Citizen complaint priority is not static. It increases dynamically as public density and hazard reports accumulate:

$$\text{Score} = \text{Base Severity} + \min(30, (\text{Report Count} - 1) \times 10) + (\text{Recurrence Count} \times 15)$$

- $\text{Score} \ge 80 \implies \mathbf{CRITICAL}$
- $\text{Score} \ge 50 \implies \mathbf{HIGH}$
- $\text{Score} \ge 30 \implies \mathbf{MEDIUM}$
- $\text{Score} < 30 \implies \mathbf{LOW}$

Example: A single pothole starts at **HIGH**. When 2 additional citizens file duplicate reports within 50m, the score rises past 80 and escalates automatically to **CRITICAL**.

---

## 6. AI Architecture & Deterministic Fallback

1. **Multimodal Analysis:** The backend calls Google Gemini Vision API (`gemini-2.5-flash` / `gemini-1.5-flash`) sending raw image bytes alongside the citizen description.
2. **Structured JSON Output:** The model returns typed JSON with category, severity, summary, keywords, and public safety impact.
3. **Resilient Fallback Pipeline:** If the Gemini API key is unset or external network rate limits are encountered, the system **never crashes**. It automatically triggers an internal rule-based computer vision & NLP heuristic that classifies the complaint based on keyword patterns, image attributes, and municipal guidelines. The fallback status is logged transparently in `ai_analyses` and `ai_telemetry_logs`.

---

## 7. Security & Authentication Architecture

1. **Server-Side API Key Isolation:** `GEMINI_API_KEY` and database credentials exist exclusively in server-side environment variables. Vite client bundles contain zero private tokens.
2. **Role-Based Access Control (RBAC):** Every endpoint is protected with JWT Bearer token guards (`require_officer_or_admin`, `require_worker`, `get_current_user`). Frontend routing uses authenticated context providers that verify server JWT claims.
3. **Media Upload Hardening:** Strict MIME type validation (`image/jpeg`, `image/png`, `video/mp4`, `video/webm`) and a 50MB file size ceiling prevent resource exhaustion attacks.
4. **Encoding Compatibility:** Windows PostgreSQL `WIN1252` compatibility layer (`clean_safe_ascii`) strips unsafe unicode sequences while preserving high-fidelity UTF-8 data on Linux/Render.
