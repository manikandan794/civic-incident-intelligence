# URBANGRID — 3-Minute Live Judge Demo Guide

This step-by-step guide walks through the **Golden Live Demo Flow** demonstrating the end-to-end municipal grievance deduplication, priority escalation, field worker remediation, and officer verification lifecycle.

---

## ⚡ Quick Access Credentials

| Role | Username / Email | Password | Quick Action Button |
| :--- | :--- | :--- | :--- |
| **Ward Officer / Admin** | `officer@chennai.urbangrid.gov.in` | `Officer@1234` | Click **"Officer Quick Fill"** on Login |
| **Field Worker** | `worker.karthik` | `Worker@1234` | Click **"Worker Quick Fill"** on Login |
| **Public Citizen** | `citizen.anbu@gmail.com` | `Citizen@1234` | Click **"Citizen Quick Fill"** on Login |

**Anchor Ticket for Golden Demo:**
- **Ticket ID:** `UG-1001`
- **Location:** Royapuram Main Road, Chennai (Ward 12)
- **Coordinates:** `13.10750, 80.29340`
- **Initial Status:** `IN_PROGRESS` / `HIGH` priority

---

## ⏱️ Step-by-Step 3-Minute Demonstration Script

### Part 1: Citizen Grievance Submission (1 Minute)

1. **Open the Portal:**
   - Navigate to the citizen portal: Click **"Report an Issue"** on the navbar or home page (`/citizen/report`).
2. **Step 1 - Visual Evidence:**
   - Click the **"Prefill 50m Demo"** button at the top-right of Step 1.
   - *Result:* Auto-attaches evidence photo and pre-fills description: *"Dangerous deep pothole on Royapuram main road causing two-wheeler skidding."*
   - Click **"Continue to Description"**.
3. **Step 2 - Problem Description:**
   - Confirm description and click **"Continue to Location"**.
4. **Step 3 - 50-Meter Spatial Radius Verification:**
   - Notice the coordinates are set to `13.10770, 80.29340` (exactly **22.2 meters** from anchor ticket `UG-1001`).
   - The interactive Leaflet map shows the cyan **50-meter perimeter circle**.
   - Notice the live banner:
     > ⚠️ **50m Spatial Proximity Match Detected:** Active ticket **UG-1001** (Pothole) is located within **22.2 meters**. Upon submission, your report will be merged as supporting evidence to escalate urgency!
   - Click **"Continue to Review"**.
5. **Step 4 - AI Verification & Final Submission:**
   - Click **"SUBMIT CIVIC REPORT"**.
   - Watch the honest real-time pipeline status checklist:
     - *Uploading evidence payload...*
     - *Executing Gemini Vision AI analysis...*
     - *Scanning PostgreSQL 50m perimeter...*
     - *Calculating multi-signal deduplication & priority matrix...*
     - *Routing to Municipal Ward 12...*
   - **Result Card:**
     - **Status:** `DUPLICATE_MERGED`
     - **Master Ticket:** `UG-1001`
     - **Distance:** `22.2 meters` (within 50m default)
     - **Duplicate Confidence:** `60.5%`
     - **Priority Escalation:** `HIGH` $\to$ `CRITICAL`
     - **Total Supporting Reports:** Incremented to 4

---

### Part 2: Municipal Ward Officer Operations (1 Minute)

1. **Switch to Ward Officer:**
   - Click the role pill at top-right or go to `/admin/dashboard`. (Log in as `officer@chennai.urbangrid.gov.in`).
2. **Review Real-Time KPIs:**
   - View Ward 12 KPI cards:
     - **Total Complaints:** Live count from database
     - **Critical / High:** Priority badges
     - **Duplicate Reports Merged:** Shows active aggregation count
3. **Open Master Complaint `UG-1001`:**
   - Click on the `UG-1001` card in the complaint queue.
4. **Inspect Deduplication Evidence Breakdown:**
   - Look at the **AI Analysis & Telemetry** section: Model, latency, confidence, safety impact.
   - Look at the **Deduplication Matrix**:
     - *Spatial Distance:* 22.2m (Score: 55.5%)
     - *Visual Similarity:* 75.0%
     - *Category Match:* 100.0%
     - *Final Composite Score:* 60.5%
5. **Assign Field Worker:**
   - Under the "Field Dispatch" section, select **"Karthikeyan M (Civil Specialist)"** and click **"Dispatch Worker"**.
   - Status updates instantly to `IN_PROGRESS`.

---

### Part 3: Field Worker Execution & Officer Verification (1 Minute)

1. **Switch to Field Worker Portal:**
   - Switch user or navigate to `/worker/dashboard` (Log in as `worker.karthik`).
2. **View Assigned Work:**
   - Worker sees ticket `UG-1001` assigned specifically to their crew.
3. **Commence Work:**
   - Click **"START WORK"**.
   - Status transitions to `IN_PROGRESS` with timestamp logged to timeline.
4. **Complete Remediation:**
   - Enter completion notes: *"Pothole asphalt filling completed with quick-cure bitumen mix."*
   - Click **"MARK COMPLETED"**.
   - Status transitions to: **`WORK COMPLETED — AWAITING OFFICER VERIFICATION`**.
5. **Return to Officer Dashboard for Verification:**
   - Log back into Officer Dashboard and open `UG-1001`.
   - Officer sees prominent green banner:
     > 👷 **Field Worker Marked Work as Completed:** Submitted for official inspection.
   - Click **`[ VERIFY & RESOLVE ]`**.
   - Status transitions to **`RESOLVED`**!
6. **Public Timeline Verification:**
   - Open Public Timeline (`/citizen/ticket/UG-1001`).
   - Every single lifecycle event is logged with exact database timestamps:
     1. `REPORT_SUBMITTED`
     2. `AI_ANALYSIS_COMPLETED`
     3. `DUPLICATE_CHECK_PASSED`
     4. `WARD_ASSIGNED`
     5. `WORKER_ASSIGNED`
     6. `WORK_STARTED`
     7. `WORK_COMPLETED_AWAITING_VERIFICATION`
     8. `OFFICER_VERIFIED_AND_RESOLVED`

---

## 🏆 Key Points to Emphasize to the Judges

1. **Strict 50m Rule:** A report 60 meters away will **never** be merged, even if it is an identical pothole. Spatial proximity is paramount.
2. **Multi-Signal Explainability:** Duplicate decisions are not black-box guesses—they are mathematically explained across 4 distinct dimensions (Spatial 30%, Visual 40%, Text 20%, Category 10%).
3. **Accountability Gate:** Workers cannot self-resolve tickets. An official Ward Officer must inspect and verify the site before the status moves to `RESOLVED`.
4. **Zero Client Secrets:** The Gemini API key remains strictly server-side.
5. **Zero Crashes:** Deterministic fallback guarantees seamless operations even during network outages.
