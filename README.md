# URBANGRID

> **AI-Powered Municipal Civic Grievance Deduplication & Dispatch Platform**  
> *Built for Tamil Nadu Municipal Administration & Urban Water Supply Operations*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial%20Deduplication-green)](https://postgis.net)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Multimodal%20Vision-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Executive Summary

When civic infrastructure failures occur in high-density urban areas—such as potholes, overflowing garbage bins, broken streetlights, or water mains ruptures—dozens of citizens independently file separate complaints. Conventional municipal portals flood engineering teams with duplicate tickets, causing fragmented tracking and wasteful multi-crew dispatch.

**URBANGRID** solves this challenge with an autonomous **50-meter spatial deduplication perimeter**, **multimodal Gemini Vision AI verification**, **multi-signal evidence fusion (spatial 30%, vision 40%, text 20%, category 10%)**, **dynamic priority escalation (MEDIUM $\to$ HIGH $\to$ CRITICAL)**, **automated Tamil Nadu municipal ward routing**, **field crew dispatch**, and **mandatory officer verification before ticket resolution**.

---

## 🏛️ System Architecture

```
Citizen Mobile / Web
        │ (Photo / Video + GPS + Description)
        ▼
React 18 + Vite Frontend (Leaflet / Tailwind)
        │ REST API (Bearer JWT)
        ▼
FastAPI Gateway & Uvicorn Async Server
        ├── Multimodal Gemini Vision AI Pipeline (Server-side key)
        ├── Spatial Deduplication Engine (50m Perimeter + Haversine/PostGIS)
        ├── Dynamic Priority Escalator (Density & Recurrence)
        └── PostgreSQL 17 Relational Database & Audit Logs
                ├── Complaints & Supporting Reports
                ├── Field Crew Assignments & Status Transitions
                ├── Real-time Public Timeline
                └── Multi-Role In-App Notifications
```

---

## ✨ Key Features

1. **Autonomous 50m Spatial Deduplication:** Strict hard spatial radius enforcement. Grievances beyond 50m are never merged.
2. **Multi-Signal Explainable Scoring:** Transparent breakdown (Spatial 30%, Visual 40%, Text 20%, Category 10%).
3. **Dynamic Priority Escalation:** Automatically escalates ticket urgency from `HIGH` to `CRITICAL` as supporting citizen reports aggregate.
4. **Historical Recurrence Tracking:** Detects when a newly reported issue appears at the site of a previously resolved complaint, prompting the citizen and escalating contractor accountability.
5. **Municipal Ward Auto-Routing:** Coordinates map directly to Tamil Nadu wards (Royapuram, Mylapore, T. Nagar, Tambaram, Ramanathapuram, Coimbatore).
6. **Field Worker Operations Portal:** Dedicated crew interface for starting work and logging on-site physical remediation notes.
7. **Mandatory Officer Verification Gate:** Workers cannot self-resolve tickets. An official Ward Officer must inspect and verify the site before the status moves to `RESOLVED`.
8. **Public Status Timeline:** Cryptographically transparent lifecycle tracker with database timestamps.
9. **Zero-Crash AI Resilience:** Deterministic heuristic CV/NLP fallback activates if external AI APIs are offline.

---

## 🔑 Demo Access Credentials

| Role | Username / Identifier | Password | Description |
| :--- | :--- | :--- | :--- |
| **Municipal Officer / Admin** | `admin` | `admin123` | Full Command & Control Dashboard, Worker Dispatch, Verification Queue |
| **Field Specialist** | `worker_001` | `worker123` | Mobile-First Field Worker Portal, Live GPS Beacon, Task Execution |
| **Ward Officer (Alternative)** | `officer@chennai.urbangrid.gov.in` | `Officer@1234` | Alternate Ward Officer Demo Account |
| **Field Crew (Alternative)** | `worker.karthik` | `Worker@1234` | Alternate Field Specialist Demo Account |
| **Public Citizen** | `citizen.anbu@gmail.com` | `Citizen@1234` | Track Personal Reports (or file anonymously) |

**Anchor Ticket for Golden Demo:**
- **Ticket ID:** `UG-1001` (Royapuram Pothole)
- **Coordinates:** `13.10750, 80.29340`
- **Duplicate Test Coordinate:** `13.10770, 80.29340` (22.2m away, within 50m radius)

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 17 (or PostGIS)

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/manikandan-engineer/urbangrid.git
cd urbangrid

# Install backend dependencies
pip install -r backend/requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and optional GEMINI_API_KEY
```

### 2. Frontend Setup
```bash
# In another terminal
cd frontend
npm install
npm run build
```

### 3. Run the Platform
```bash
# Launch FastAPI server (serves both API and React frontend)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Open your browser at `http://localhost:8000`.

---

## 🧪 Automated Testing

Run the automated backend test suite covering geospatial math, 50m duplicate rules, outside-radius boundaries, priority escalation, and role security:

```bash
pytest -v tests/test_backend.py
```

---

## 🌐 Public Demo & Production Deployment

- **Live Public Cloudflare Tunnel:** `https://invisible-knows-film-administered.trycloudflare.com`
- **Render Production Blueprint:** `render.yaml` configured for one-click deployment with PostgreSQL.
- **Interactive API Documentation:** Available at `/docs` (Swagger UI) and `/redoc`.

---

## 📄 Documentation

- [Technical Architecture Document](file:///E:/anbu%20hackathon/TECHNICAL_ARCHITECTURE.md)
- [3-Minute Live Demo Guide](file:///E:/anbu%20hackathon/DEMO_GUIDE.md)
- [Technical Q&A Defense Guide](file:///E:/anbu%20hackathon/TECHNICAL_QA.md)

---

## 📜 License
MIT License. Developed for Municipal Civic Grievance Excellence.
