import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, JSON, Index
)
from sqlalchemy.orm import relationship
from ..core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    OFFICER = "OFFICER"
    WORKER = "WORKER"
    ADMIN = "ADMIN"

class ComplaintCategory(str, enum.Enum):
    POTHOLE = "Pothole"
    GARBAGE = "Garbage Overflow"
    WATER_LEAKAGE = "Water Leakage"
    STREETLIGHT = "Broken Streetlight"
    DRAINAGE = "Drainage"
    ROAD_DAMAGE = "Road Damage"
    TRAFFIC_SIGNAL = "Traffic Signal"
    PUBLIC_INFRASTRUCTURE = "Public Infrastructure Damage"
    OTHER = "Other"

class SeverityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class PriorityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    AI_ANALYZED = "AI_ANALYZED"
    ASSIGNED_WARD = "ASSIGNED_WARD"
    IN_PROGRESS = "IN_PROGRESS"
    WORK_COMPLETED = "WORK_COMPLETED"  # awaiting officer verification
    VERIFIED = "VERIFIED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class WorkerAvailability(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_DUTY = "ON_DUTY"
    OFF_DUTY = "OFF_DUTY"

class WorkerStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"

# ----------------- MODELS -----------------

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="CITIZEN", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    # Relationships
    worker_profile = relationship("Worker", back_populates="user", uselist=False)
    reports = relationship("ComplaintReport", back_populates="citizen")
    notifications = relationship("Notification", back_populates="user")

class Ward(Base):
    __tablename__ = "wards"
    
    id = Column(Integer, primary_key=True, index=True)
    city = Column(String(100), default="Chennai", index=True)
    ward_number = Column(Integer, index=True, nullable=False)
    ward_name = Column(String(255), nullable=False)
    zone_name = Column(String(255), nullable=True)
    officer_name = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    boundary_geojson = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Worker(Base):
    __tablename__ = "workers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=False)
    ward_number = Column(Integer, index=True, nullable=False)
    role = Column(String(100), default="Field Specialist")
    specialization = Column(String(100), default="Roads & Civil Works")
    team_name = Column(String(100), default="Rapid Remediation Crew 1")
    team_size = Column(Integer, default=3)
    is_team_leader = Column(Boolean, default=True)
    availability = Column(String(50), default="AVAILABLE")
    status = Column(String(50), default="ACTIVE")
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)
    is_online = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    user = relationship("User", back_populates="worker_profile")
    complaints = relationship("Complaint", back_populates="assigned_worker")
    assignments = relationship("WorkAssignment", back_populates="worker")

class Complaint(Base):
    __tablename__ = "complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    severity = Column(String(50), default="MEDIUM", nullable=False)
    priority = Column(String(50), default="MEDIUM", nullable=False)
    status = Column(String(50), default="SUBMITTED", nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text, nullable=True)
    ward_number = Column(Integer, index=True, nullable=False)
    city = Column(String(100), default="Chennai", index=True)
    
    report_count = Column(Integer, default=1, nullable=False)
    supporting_report_count = Column(Integer, default=0, nullable=False)
    recurrence_count = Column(Integer, default=0, nullable=False)
    parent_recurrence_ticket_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    
    assigned_worker_id = Column(Integer, ForeignKey("workers.id"), nullable=True)
    active_duplicate_radius_meters = Column(Float, default=50.0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    reports = relationship("ComplaintReport", back_populates="complaint", cascade="all, delete-orphan")
    media = relationship("ComplaintMedia", back_populates="complaint", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="complaint", cascade="all, delete-orphan")
    timeline = relationship("ComplaintTimeline", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintTimeline.created_at")
    assigned_worker = relationship("Worker", back_populates="complaints")
    assignments = relationship("WorkAssignment", back_populates="complaint", cascade="all, delete-orphan")
    duplicate_matches = relationship("DuplicateMatch", back_populates="matched_complaint", cascade="all, delete-orphan")
    evidence_reports = relationship("CitizenEvidenceReport", back_populates="complaint", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_complaint_coords", "latitude", "longitude"),
        Index("idx_complaint_status_ward", "status", "ward_number"),
    )

class ComplaintReport(Base):
    __tablename__ = "complaint_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    citizen_name = Column(String(255), default="Anonymous Citizen")
    citizen_phone = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    distance_to_master_meters = Column(Float, default=0.0)
    is_master_report = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    complaint = relationship("Complaint", back_populates="reports")
    citizen = relationship("User", back_populates="reports")
    media = relationship("ComplaintMedia", back_populates="report")
    ai_analysis = relationship("AIAnalysis", back_populates="report", uselist=False)

class ComplaintMedia(Base):
    __tablename__ = "complaint_media"
    
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("complaint_reports.id"), nullable=True)
    media_type = Column(String(20), default="image")  # 'image' or 'video'
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    mime_type = Column(String(100), default="image/jpeg")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    complaint = relationship("Complaint", back_populates="media")
    report = relationship("ComplaintReport", back_populates="media")

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("complaint_reports.id"), nullable=True)
    model = Column(String(100), default="gemini-2.5-flash")
    provider = Column(String(255), default="Gemini API")
    category_detected = Column(String(100), nullable=False)
    severity_detected = Column(String(50), default="MEDIUM")
    confidence = Column(Float, default=0.90)
    summary = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    safety_impact = Column(Text, nullable=True)
    raw_response = Column(JSON, nullable=True)
    latency_ms = Column(Integer, default=0)
    is_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    complaint = relationship("Complaint", back_populates="ai_analyses")
    report = relationship("ComplaintReport", back_populates="ai_analysis")

class DuplicateMatch(Base):
    __tablename__ = "duplicate_matches"
    
    id = Column(Integer, primary_key=True, index=True)
    new_report_id = Column(Integer, ForeignKey("complaint_reports.id"), nullable=False)
    matched_complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    distance_meters = Column(Float, nullable=False)
    spatial_score = Column(Float, default=0.0)
    visual_score = Column(Float, default=0.0)
    text_score = Column(Float, default=0.0)
    category_score = Column(Float, default=0.0)
    final_duplicate_score = Column(Float, nullable=False)
    decision = Column(String(50), nullable=False)  # 'DUPLICATE', 'DISTINCT', 'RECURRING'
    radius_used_meters = Column(Float, default=50.0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    matched_complaint = relationship("Complaint", back_populates="duplicate_matches")

class ComplaintTimeline(Base):
    __tablename__ = "complaint_timeline"
    
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    actor_role = Column(String(50), default="SYSTEM")
    actor_name = Column(String(255), default="Automated Dispatch Engine")
    description = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    complaint = relationship("Complaint", back_populates="timeline")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    target_role = Column(String(50), default="CITIZEN", index=True)  # CITIZEN, OFFICER, WORKER
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO")  # INFO, ALERT, ESCALATION, SUCCESS
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    user = relationship("User", back_populates="notifications")

class WorkAssignment(Base):
    __tablename__ = "work_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="ASSIGNED")  # ASSIGNED, IN_PROGRESS, WORK_COMPLETED, VERIFIED
    notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=utcnow)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    complaint = relationship("Complaint", back_populates="assignments")
    worker = relationship("Worker", back_populates="assignments")

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

class AITelemetryLog(Base):
    __tablename__ = "ai_telemetry_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow, index=True)
    provider = Column(String(255), nullable=False)
    model = Column(String(100), nullable=False)
    operation = Column(String(100), nullable=False)
    success = Column(Boolean, default=True)
    latency_ms = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    structured_result = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

class CitizenEvidenceReport(Base):
    __tablename__ = "citizen_evidence_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    public_report_id = Column(String(50), unique=True, index=True, nullable=False)
    related_ticket_number = Column(String(50), index=True, nullable=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    citizen_name = Column(String(255), default="Citizen Reporter")
    citizen_phone = Column(String(50), nullable=True)
    report_type = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(Text, nullable=True)
    ward_number = Column(Integer, nullable=True, index=True)
    status = Column(String(50), default="RECEIVED", index=True)
    priority = Column(String(50), default="MEDIUM", index=True)
    assigned_worker_id = Column(Integer, ForeignKey("workers.id"), nullable=True, index=True)
    officer_instruction = Column(Text, nullable=True)
    officer_notes = Column(Text, nullable=True)
    worker_notes = Column(Text, nullable=True)
    worker_verified_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    
    complaint = relationship("Complaint", back_populates="evidence_reports")
    citizen = relationship("User", foreign_keys=[citizen_id])
    assigned_worker = relationship("Worker", foreign_keys=[assigned_worker_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by_id])
    attachments = relationship("EvidenceAttachment", back_populates="report", cascade="all, delete-orphan")
    timeline = relationship("EvidenceReportTimeline", back_populates="report", cascade="all, delete-orphan", order_by="EvidenceReportTimeline.created_at")

    __table_args__ = (
        Index("idx_ev_report_status_type", "status", "report_type"),
        Index("idx_ev_report_ticket", "related_ticket_number"),
    )

class EvidenceAttachment(Base):
    __tablename__ = "evidence_report_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_evidence_reports.id"), nullable=False, index=True)
    file_type = Column(String(20), default="photo")  # photo or video
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), default="image/jpeg")
    file_size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    
    report = relationship("CitizenEvidenceReport", back_populates="attachments")

class EvidenceReportTimeline(Base):
    __tablename__ = "evidence_report_timeline"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_evidence_reports.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    actor_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)
    
    report = relationship("CitizenEvidenceReport", back_populates="timeline")

