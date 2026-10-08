from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime

# Auth & User
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "CITIZEN"

class UserLogin(BaseModel):
    email: Optional[str] = None
    email_or_username: Optional[str] = None
    username: Optional[str] = None
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Worker
class WorkerCreate(BaseModel):
    name: str
    username: str
    password: str
    phone: str
    ward_number: int
    role: Optional[str] = "Field Specialist"
    specialization: Optional[str] = "Roads & Civil Works"
    team_name: Optional[str] = "Rapid Remediation Crew 1"
    team_size: Optional[int] = 3
    is_team_leader: Optional[bool] = True

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    ward_number: Optional[int] = None
    role: Optional[str] = None
    specialization: Optional[str] = None
    team_name: Optional[str] = None
    team_size: Optional[int] = None
    is_team_leader: Optional[bool] = None
    availability: Optional[str] = None
    status: Optional[str] = None

class WorkerOut(BaseModel):
    id: int
    user_id: int
    name: str
    username: str
    phone: str
    ward_number: int
    role: str
    specialization: str
    team_name: Optional[str] = None
    team_size: Optional[int] = None
    is_team_leader: Optional[bool] = None
    availability: str
    status: str
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    is_online: Optional[bool] = True
    created_at: datetime

    class Config:
        from_attributes = True

class WorkerLocationUpdate(BaseModel):
    latitude: float
    longitude: float

# Complaint Media
class MediaOut(BaseModel):
    id: int
    media_type: str
    file_url: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# AI Analysis
class AIAnalysisOut(BaseModel):
    id: int
    model: str
    provider: str
    category_detected: str
    severity_detected: str
    confidence: float
    summary: str
    keywords: List[str]
    safety_impact: Optional[str]
    latency_ms: int
    is_fallback: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Timeline Event
class TimelineEventOut(BaseModel):
    id: int
    complaint_id: int
    event_type: str
    actor_role: str
    actor_name: str
    description: str
    metadata_json: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Supporting Report
class ComplaintReportOut(BaseModel):
    id: int
    citizen_name: str
    citizen_phone: Optional[str]
    description: str
    latitude: float
    longitude: float
    distance_to_master_meters: float
    is_master_report: bool
    created_at: datetime
    media: Optional[List[MediaOut]] = []

    class Config:
        from_attributes = True

# Complaint Core
class ComplaintOut(BaseModel):
    id: int
    ticket_number: str
    category: str
    severity: str
    priority: str
    status: str
    title: str
    description: str
    latitude: float
    longitude: float
    address: Optional[str]
    ward_number: int
    city: str
    report_count: int
    supporting_report_count: int
    recurrence_count: int
    parent_recurrence_ticket_id: Optional[int]
    assigned_worker_id: Optional[int]
    active_duplicate_radius_meters: float
    created_at: datetime
    updated_at: Optional[datetime]
    resolved_at: Optional[datetime]
    media: List[MediaOut] = []
    
    class Config:
        from_attributes = True

class ComplaintDetailOut(ComplaintOut):
    reports: List[ComplaintReportOut] = []
    ai_analyses: List[AIAnalysisOut] = []
    timeline: List[TimelineEventOut] = []
    assigned_worker: Optional[WorkerOut] = None

# Submission Response
class SubmissionResponse(BaseModel):
    status: str  # "CREATED" or "DUPLICATE_MERGED" or "RECURRING_PROMPTED"
    is_duplicate: bool
    ticket_number: str
    complaint_id: int
    duplicate_score: Optional[float] = None
    distance_meters: Optional[float] = None
    message: str
    details: Optional[dict] = None

# Duplicate Check
class DuplicateCheckRequest(BaseModel):
    latitude: float
    longitude: float
    category: Optional[str] = None
    description: Optional[str] = None

class DuplicateCheckMatch(BaseModel):
    complaint_id: int
    ticket_number: str
    category: str
    status: str
    distance_meters: float
    report_count: int
    created_at: datetime
    is_resolved: bool

class DuplicateCheckResponse(BaseModel):
    active_radius_meters: float
    has_active_duplicate: bool
    has_resolved_past_issue: bool
    active_matches: List[DuplicateCheckMatch]
    resolved_matches: List[DuplicateCheckMatch]

# Notifications
class NotificationOut(BaseModel):
    id: int
    target_role: str
    complaint_id: Optional[int]
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Settings
class SettingOut(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str]

    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    value: str

# Work Assignment Actions
class WorkerActionRequest(BaseModel):
    notes: Optional[str] = None

# Officer Actions
class AssignWorkerRequest(BaseModel):
    worker_id: int
    notes: Optional[str] = None

class VerifyComplaintRequest(BaseModel):
    verification_notes: Optional[str] = None
    is_approved: bool = True

# Pagination
class PaginatedComplaintsOut(BaseModel):
    items: List[ComplaintOut]
    total: int
    page: int
    limit: int
    total_pages: int

# Officer Lightweight Dashboard Summary
class OfficerSummaryStatsOut(BaseModel):
    total_complaints: int
    new_today: int
    active_issues: int
    critical_high: int
    assigned_jobs: int
    in_progress_jobs: int
    awaiting_verification: int
    resolved_complaints: int
    total_workers: int
    available_workers: int
    unresolved_complaints: int
    total_evidence_reports: int
    pending_evidence_reports: int

# Citizen Evidence Report Schemas
class EvidenceAttachmentOut(BaseModel):
    id: int
    file_type: str
    file_url: str
    file_name: str
    mime_type: str
    file_size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True

class EvidenceReportTimelineOut(BaseModel):
    id: int
    event_type: str
    actor_role: str
    actor_name: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

class CitizenEvidenceReportOut(BaseModel):
    id: int
    public_report_id: str
    related_ticket_number: Optional[str] = None
    complaint_id: Optional[int] = None
    citizen_name: str
    citizen_phone: Optional[str] = None
    report_type: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    ward_number: Optional[int] = None
    status: str
    priority: str
    assigned_worker_id: Optional[int] = None
    officer_instruction: Optional[str] = None
    officer_notes: Optional[str] = None
    worker_notes: Optional[str] = None
    worker_verified_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    attachments: List[EvidenceAttachmentOut] = []
    attachment_count: int = 0

    class Config:
        from_attributes = True

class CitizenEvidenceReportDetailOut(CitizenEvidenceReportOut):
    timeline: List[EvidenceReportTimelineOut] = []
    related_complaint_status: Optional[str] = None
    assigned_worker_name: Optional[str] = None

class EvidenceReportStatsOut(BaseModel):
    total: int
    new_received: int
    under_review: int
    action_required: int
    worker_verification: int
    resolved_closed: int

class PaginatedEvidenceReportsOut(BaseModel):
    items: List[CitizenEvidenceReportOut]
    total: int
    page: int
    limit: int
    total_pages: int

class ReviewEvidenceReportRequest(BaseModel):
    action: str  # UNDER_REVIEW, ACTION_REQUIRED, CLOSE, REJECT, UPDATE_STATUS
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None

class ForwardReportToWorkerRequest(BaseModel):
    worker_id: int
    instruction: str
    priority: Optional[str] = "HIGH"

class WorkerVerifyReportRequest(BaseModel):
    worker_notes: str

class EvidenceReportSubmissionResponse(BaseModel):
    status: str
    report_id: str
    id: int
    message: str
    related_ticket: Optional[str] = None

