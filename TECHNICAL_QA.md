# URBANGRID — Technical Q&A & Defense Guide

Comprehensive technical answers for competition judges, technical architects, and evaluating panels.

---

### 1. Why PostGIS?
**Answer:** PostGIS provides industry-standard spatial indexing (R-Tree / GiST) and spherical geodesic functions (`ST_DWithin`, `ST_Distance`) on ellipsoidal coordinate geometries (WGS-84). In municipal workloads with hundreds of thousands of civic grievances, querying bounding boxes via conventional relational indexes requires CPU-intensive trigonometry on every row. PostGIS computes spatial proximity in logarithmic time $O(\log N)$, allowing sub-10ms proximity scans even across massive state-wide datasets.

---

### 2. Why 50 Meters as the Default Duplicate Radius?
**Answer:** In urban civil engineering and road maintenance, 50 meters corresponds to the standard visual and spatial zone of a single roadway segment or intersection. Two potholes separated by 200 meters are physically distinct defects requiring two distinct batches of asphalt and separate work crews. Setting the perimeter at 50 meters prevents distinct physical defects from being falsely merged, while catching all redundant reports filed by pedestrians and drivers observing the exact same defect from different viewpoints or curbs.

---

### 3. Why not Image-Only Duplicate Detection?
**Answer:** Image-only matching fails fundamentally in real-world civic environments:
1. **Visual Ambiguity:** A standard pothole, garbage mound, or water puddle looks remarkably similar across completely different neighborhoods of Chennai. Relying solely on visual embeddings would merge a pothole in Royapuram with an identical-looking pothole in Tambaram (30 kilometers away).
2. **Variable Perspectives:** Photos taken by different citizens of the same physical pothole vary wildly in lighting, angle, distance, weather, and camera quality.
UrbanGrid enforces **spatial proximity as the mandatory prerequisite (Hard 50m Rule)**, and uses visual evidence only as a weighted secondary signal (40%).

---

### 4. How does the AI Engine Work?
**Answer:** When an evidence photo is uploaded, FastAPI streams the image bytes directly to Google Gemini Multimodal Vision API (`gemini-2.5-flash` / `gemini-1.5-flash`). The model receives a structured system prompt directing it to inspect the physical defect and return strict typed JSON containing:
- Primary Category (e.g., Pothole, Water Leakage, Garbage Overflow, Broken Streetlight)
- Severity Level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- Concise defect summary
- Visual feature keywords (e.g., `["asphalt crack", "standing water", "road depression"]`)
- Public safety impact assessment

---

### 5. Where is the AI API Key Stored?
**Answer:** Strictly server-side in the backend environment variables (`.env`). The Vite React frontend client never imports, bundles, or has access to `GEMINI_API_KEY`. All multimodal requests originate from the secure FastAPI backend.

---

### 6. How is the Duplicate Score Calculated?
**Answer:** Within the active 50m radius, the candidate score is computed using a 4-signal explainable weighted linear combination:
- **Spatial Proximity (30%):** Decays linearly from 100% at 0m to 0% at 50m ($\max(0, 100 \cdot (1 - d/50))$).
- **Visual Evidence (40%):** Matches AI-detected categories and Jaccard keyword overlap between photos.
- **Description Similarity (20%):** Tokenized Jaccard text overlap between citizen descriptions.
- **Category Match (10%):** 100% for identical category, 50% for compatible infrastructure domain.
If the composite score exceeds **60%**, the report is merged as a duplicate.

---

### 7. How are False Duplicates Handled?
**Answer:** The multi-signal scoring model prevents false merges. If a citizen reports a "Broken Streetlight" at the exact same GPS coordinate where a "Pothole" was reported 10 minutes earlier, the visual score is 0% and category score is 0%. Even though spatial distance is 0m (yielding 30% spatial score), the total score is only $30\%$, well below the $60\%$ threshold. It is correctly treated as a distinct, independent ticket.

---

### 8. How do Recurring Complaints Work?
**Answer:** When a citizen files a complaint at a location where a historical ticket was previously **RESOLVED**, the engine recognizes the past ticket within the 50m radius. The citizen is prompted:
*"Previous resolved complaint UG-0985 found at this location. Is this the same problem happening again?"*
If confirmed:
- A new master ticket is issued with an incremented `recurrence_count` ($1 \to 2$).
- The historical ticket is linked via `parent_recurrence_ticket_id`.
- Base priority escalates immediately (+15 priority points) to alert municipal officers that prior contractor repairs may have failed.

---

### 9. How are User Roles Secured?
**Answer:** Roles are enforced on the backend via cryptographic JSON Web Tokens (JWT) using `HS256`. Each token payload contains the subject user ID and `role` (`CITIZEN`, `OFFICER`, `WORKER`, `ADMIN`). FastAPI dependency injection guards (`require_officer_or_admin`, `require_worker`) inspect the token on every request. Even if a malicious actor accesses officer routes on the frontend, backend APIs reject unauthorized requests with `403 Forbidden`.

---

### 10. How does Priority Increase Automatically?
**Answer:** The priority engine uses a dynamic density formula:
$$\text{Score} = \text{Base Severity} + \min(30, (\text{Report Count} - 1) \times 10) + (\text{Recurrence Count} \times 15)$$
As more citizens report the same issue, the report count accumulates. A `HIGH` priority pothole escalates automatically to `CRITICAL` once 3 or more supporting citizen reports are aggregated, bumping the ticket to the top of the Ward Officer's operational queue.

---

### 11. How does Worker Assignment Work?
**Answer:** Ward Officers view available field crew members filtered by municipal ward and specialization (e.g., Roads & Civil Works, Sanitation, Electrical). The officer assigns the ticket with optional dispatch notes. This creates a `WorkAssignment` record, transitions the ticket to `IN_PROGRESS`, dispatches in-app notifications to the worker, and records a `WORKER_ASSIGNED` event on the public timeline.

---

### 12. How does the Notification System Work?
**Answer:** Notifications are stored directly in PostgreSQL (`notifications` table) with recipient role (`OFFICER`, `WORKER`, `CITIZEN`) and target user ID. When an action occurs (duplicate merged, priority escalated, crew dispatched, work completed, or ticket resolved), the notification service writes events into the database. Frontends query notifications with badge count badges and unread filtering.

---

### 13. How does the System Scale?
**Answer:**
1. **Stateless API:** FastAPI runs asynchronously via Uvicorn workers and can be horizontally scaled behind an Nginx or cloud load balancer.
2. **Database Read/Write Separation:** Spatial lookups leverage PostGIS GiST indexes with spatial bounding-box pre-filtering, reducing database load to $O(\log N)$.
3. **Static File Offloading:** Evidence photos can be backed by AWS S3 or Google Cloud Storage via signed URLs for infinite media storage.
4. **Asynchronous Task Queuing:** AI vision and geocoding calls can be offloaded to Celery/Redis queues during extreme storm/flood disaster surges.

---

### 14. What Happens if the AI API Fails or is Offline?
**Answer:** UrbanGrid includes an internal **deterministic heuristic fallback pipeline**. If the Gemini API key is missing, network connections time out, or quotas are exceeded, the system catches the error, logs it to `ai_telemetry_logs`, and applies keyword-based NLP and rule-based computer vision heuristics. The application never crashes and the citizen submission flow completes seamlessly in under 2 seconds.

---

### 15. What Happens if GPS Geolocation is Denied by the Citizen?
**Answer:** UrbanGrid provides **3 independent location mechanisms**:
1. **Browser Geolocation:** 1-click current device GPS fix.
2. **Interactive Map Selection:** Draggable Leaflet marker allowing the citizen to pan and zoom anywhere in Tamil Nadu.
3. **Locality Search:** Quick-selection of pre-configured Tamil Nadu municipal zones (Royapuram, Mylapore, T. Nagar, Tambaram, Ramanathapuram, Coimbatore).
Denying browser GPS permission does not block reporting.

---

### 16. Why React + Vite for Frontend?
**Answer:** Vite provides near-instant Hot Module Replacement (HMR) and optimized ES-module production builds (<1 second build time). React 18 allows responsive state management, mobile-first layouts, and seamless integration with Leaflet mapping components and Tailwind utility styling.

---

### 17. Why FastAPI for Backend?
**Answer:** FastAPI is built on Starlette and Pydantic, providing native asynchronous I/O (`async`/`await`), automatic OpenAPI documentation at `/docs`, type-safe request/response validation, and high throughput comparable to NodeJS and Go.

---

### 18. Why PostgreSQL?
**Answer:** PostgreSQL is an enterprise-grade ACID-compliant relational database with native PostGIS spatial extensions, JSONB support for AI telemetry, and battle-tested reliability for municipal government records.

---

### 19. How is Data Persisted?
**Answer:** All entities (users, complaints, reports, media metadata, AI telemetry, duplicate scores, timeline events, notifications, assignments, and settings) persist in PostgreSQL tables on disk. Local storage is used strictly for holding the JWT token in browser sessions. Refreshing the browser or accessing the app from another device preserves all operational state.

---

### 20. How is Overall Security Handled?
**Answer:**
- Password hashing with native `bcrypt` (12 salt rounds).
- Short-lived JWT bearer tokens with cryptographic signature verification.
- Server-side environment isolation for API credentials.
- Input validation via Pydantic to prevent SQL injection and buffer overflow attacks.
- File upload restrictions (<=50MB, verified MIME types).
- CORS headers restricted to authorized frontend origins.
