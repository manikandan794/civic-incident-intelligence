import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func

from ..core.database import get_db
from ..core.config import settings
from ..core.security import get_optional_user, get_current_user, require_officer_or_admin, require_worker
from ..models.models import (
    CitizenEvidenceReport, EvidenceAttachment, EvidenceReportTimeline,
    Complaint, Worker, User, UserRole, Notification
)
from ..schemas.schemas import (
    CitizenEvidenceReportOut, CitizenEvidenceReportDetailOut,
    EvidenceAttachmentOut, EvidenceReportTimelineOut, EvidenceReportStatsOut,
    PaginatedEvidenceReportsOut, ReviewEvidenceReportRequest,
    ForwardReportToWorkerRequest, WorkerVerifyReportRequest,
    EvidenceReportSubmissionResponse
)
from ..services.notification_service import create_notification, clean_safe_ascii

logger = logging.getLogger("urbangrid.evidence_reports")
router = APIRouter(prefix="/api/evidence-reports", tags=["Evidence Reports"])

def generate_report_id(db: Session) -> str:
    """Generates next public human-readable report ID e.g. REP-0001"""
    last = db.query(CitizenEvidenceReport).order_by(desc(CitizenEvidenceReport.id)).first()
    next_num = 1 if not last else (last.id + 1)
    return f"REP-{next_num:04d}"

@router.post("/submit", response_model=EvidenceReportSubmissionResponse)
async def submit_evidence_report(
    description: str = Form(...),
    report_type: str = Form(...),
    related_ticket_number: Optional[str] = Form(None),
    ticket_id: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_name: Optional[str] = Form(None),
    citizen_name: Optional[str] = Form("Citizen Reporter"),
    citizen_phone: Optional[str] = Form(None),
    photos: List[UploadFile] = File([]),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Submits citizen civic evidence / update report (REP-xxxx).
    Validates related ticket if provided.
    Does NOT auto-resolve or auto-dispatch; goes to Officer Reports Queue.
    """
    cleaned_desc = clean_safe_ascii(description)
    if len(cleaned_desc) < 5:
        raise HTTPException(status_code=400, detail="Description must be at least 5 characters.")

    # Validate related ticket if provided
    target_ticket = related_ticket_number or ticket_id
    complaint_obj = None
    cleaned_ticket = None
    if target_ticket and target_ticket.strip():
        cleaned_ticket = clean_safe_ascii(target_ticket.strip().upper())
        complaint_obj = db.query(Complaint).filter(Complaint.ticket_number == cleaned_ticket).first()
        if not complaint_obj:
            raise HTTPException(
                status_code=404,
                detail=f"Ticket '{cleaned_ticket}' not found. Please check the ticket ID."
            )

    # Ward resolution
    ward_num = None
    if complaint_obj:
        ward_num = complaint_obj.ward_number
        if not location_name:
            location_name = complaint_obj.address
        if latitude is None:
            latitude = complaint_obj.latitude
            longitude = complaint_obj.longitude

    public_id = generate_report_id(db)
    actual_name = current_user.full_name if current_user else (clean_safe_ascii(citizen_name) or "Citizen Reporter")
    actual_phone = current_user.phone if current_user else (clean_safe_ascii(citizen_phone) or None)

    report = CitizenEvidenceReport(
        public_report_id=public_id,
        related_ticket_number=cleaned_ticket,
        complaint_id=complaint_obj.id if complaint_obj else None,
        citizen_id=current_user.id if current_user else None,
        citizen_name=actual_name,
        citizen_phone=actual_phone,
        report_type=clean_safe_ascii(report_type),
        description=cleaned_desc,
        latitude=latitude,
        longitude=longitude,
        location_name=clean_safe_ascii(location_name) if location_name else "Tamil Nadu Civic Area",
        ward_number=ward_num or 12,
        status="RECEIVED",
        priority="HIGH" if "Worsened" in report_type or "Safety" in report_type else "MEDIUM"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Save Photos
    if photos:
        for p in photos:
            if not p.filename:
                continue
            contents = await p.read()
            if len(contents) > 0 and len(contents) <= settings.MAX_FILE_SIZE_BYTES:
                ext = os.path.splitext(p.filename)[1] or ".jpg"
                st_name = f"ev_photo_{uuid.uuid4().hex}{ext}"
                st_path = os.path.join(settings.UPLOAD_DIR, st_name)
                with open(st_path, "wb") as f:
                    f.write(contents)
                att = EvidenceAttachment(
                    report_id=report.id,
                    file_type="photo",
                    file_url=f"/uploads/{st_name}",
                    file_name=p.filename,
                    mime_type=p.content_type or "image/jpeg",
                    file_size_bytes=len(contents)
                )
                db.add(att)

    # Save Video if provided
    if video and video.filename:
        v_contents = await video.read()
        if len(v_contents) > 0 and len(v_contents) <= settings.MAX_FILE_SIZE_BYTES:
            ext = os.path.splitext(video.filename)[1] or ".mp4"
            st_name = f"ev_video_{uuid.uuid4().hex}{ext}"
            st_path = os.path.join(settings.UPLOAD_DIR, st_name)
            with open(st_path, "wb") as f:
                f.write(v_contents)
            att_v = EvidenceAttachment(
                report_id=report.id,
                file_type="video",
                file_url=f"/uploads/{st_name}",
                file_name=video.filename,
                mime_type=video.content_type or "video/mp4",
                file_size_bytes=len(v_contents)
            )
            db.add(att_v)

    # Create Initial Timeline Event
    t_ev = EvidenceReportTimeline(
        report_id=report.id,
        event_type="REPORT_SUBMITTED",
        actor_role="CITIZEN",
        actor_name=actual_name,
        description=f"Citizen submitted evidence report for '{report.report_type}'. Ref: {public_id}"
    )
    db.add(t_ev)
    db.commit()

    # Officer Notification
    create_notification(
        db, target_role="OFFICER",
        title=f"New Citizen Report: {public_id}",
        message=f"Citizen evidence filed for {cleaned_ticket or 'Municipal Area'} ({report.report_type}).",
        complaint_id=report.complaint_id,
        notification_type="INFO"
    )

    # Citizen Confirmation
    if current_user:
        create_notification(
            db, target_role="CITIZEN", user_id=current_user.id,
            title=f"Evidence Received: {public_id}",
            message=f"Your evidence for {cleaned_ticket or 'civic site'} has been routed to the Municipal Officer queue.",
            complaint_id=report.complaint_id,
            notification_type="SUCCESS"
        )

    return EvidenceReportSubmissionResponse(
        status="RECEIVED",
        report_id=public_id,
        id=report.id,
        message=f"Evidence report {public_id} submitted successfully and forwarded to Ward Officer review queue.",
        related_ticket=cleaned_ticket
    )

@router.get("/stats", response_model=EvidenceReportStatsOut)
def get_evidence_report_stats(
    ward_number: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    """Real-time database counters for Officer Reports dashboard"""
    query = db.query(CitizenEvidenceReport)
    if ward_number:
        query = query.filter(CitizenEvidenceReport.ward_number == ward_number)

    total = query.count()
    new_received = query.filter(CitizenEvidenceReport.status == "RECEIVED").count()
    under_review = query.filter(CitizenEvidenceReport.status == "UNDER_REVIEW").count()
    action_required = query.filter(CitizenEvidenceReport.status == "ACTION_REQUIRED").count()
    worker_verification = query.filter(CitizenEvidenceReport.status == "WORKER_VERIFICATION").count()
    resolved_closed = query.filter(CitizenEvidenceReport.status.in_(["RESOLVED", "CLOSED"])).count()

    return EvidenceReportStatsOut(
        total=total,
        new_received=new_received,
        under_review=under_review,
        action_required=action_required,
        worker_verification=worker_verification,
        resolved_closed=resolved_closed
    )

@router.get("", response_model=PaginatedEvidenceReportsOut)
def list_evidence_reports(
    page: int = 1,
    limit: int = 15,
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    ward_number: Optional[int] = None,
    search: Optional[str] = None,
    ticket_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    """Server-side paginated list of citizen evidence reports for Officer dashboard"""
    query = db.query(CitizenEvidenceReport)

    if status and status != "ALL":
        query = query.filter(CitizenEvidenceReport.status == status)
    if report_type and report_type != "ALL":
        query = query.filter(CitizenEvidenceReport.report_type == report_type)
    if ward_number:
        query = query.filter(CitizenEvidenceReport.ward_number == ward_number)
    if ticket_number:
        query = query.filter(CitizenEvidenceReport.related_ticket_number == ticket_number.upper())

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CitizenEvidenceReport.public_report_id.ilike(search_filter),
                CitizenEvidenceReport.related_ticket_number.ilike(search_filter),
                CitizenEvidenceReport.description.ilike(search_filter),
                CitizenEvidenceReport.citizen_name.ilike(search_filter),
                CitizenEvidenceReport.location_name.ilike(search_filter)
            )
        )

    total = query.count()
    offset = (page - 1) * limit
    items = query.order_by(desc(CitizenEvidenceReport.created_at)).offset(offset).limit(limit).all()

    # Pre-populate attachment counts
    results = []
    for item in items:
        out = CitizenEvidenceReportOut.model_validate(item)
        out.attachment_count = len(item.attachments)
        results.append(out)

    total_pages = max(1, (total + limit - 1) // limit)
    return PaginatedEvidenceReportsOut(
        items=results,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.get("/my-reports", response_model=List[CitizenEvidenceReportOut])
def get_my_evidence_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns evidence reports submitted by current citizen"""
    reports = db.query(CitizenEvidenceReport).filter(
        CitizenEvidenceReport.citizen_id == current_user.id
    ).order_by(desc(CitizenEvidenceReport.created_at)).all()

    results = []
    for r in reports:
        out = CitizenEvidenceReportOut.model_validate(r)
        out.attachment_count = len(r.attachments)
        results.append(out)
    return results

@router.get("/{id}", response_model=CitizenEvidenceReportDetailOut)
def get_evidence_report_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detailed view of a citizen evidence report"""
    report = db.query(CitizenEvidenceReport).filter(CitizenEvidenceReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Evidence report not found")

    # Access control: Citizens can only view their own report; Officers/Workers can view
    if current_user.role == UserRole.CITIZEN.value and report.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to another citizen's report")

    out = CitizenEvidenceReportDetailOut.model_validate(report)
    out.attachment_count = len(report.attachments)
    if report.complaint:
        out.related_complaint_status = report.complaint.status
    if report.assigned_worker:
        out.assigned_worker_name = report.assigned_worker.name

    return out

@router.post("/{id}/review")
def review_evidence_report(
    id: int,
    req: ReviewEvidenceReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    """Officer reviews report, updates status, and logs review notes"""
    report = db.query(CitizenEvidenceReport).filter(CitizenEvidenceReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Evidence report not found")

    now = datetime.now(timezone.utc)
    target_status = req.status or ("UNDER_REVIEW" if req.action == "UNDER_REVIEW" else "ACTION_REQUIRED")
    if req.action == "CLOSE":
        target_status = "CLOSED"
    elif req.action == "REJECT":
        target_status = "REJECTED"

    report.status = target_status
    report.reviewed_at = now
    report.reviewed_by_id = current_user.id
    if req.notes:
        report.officer_notes = clean_safe_ascii(req.notes)
    if req.priority:
        report.priority = req.priority
    report.updated_at = now

    t_ev = EvidenceReportTimeline(
        report_id=report.id,
        event_type="OFFICER_REVIEWED",
        actor_role="OFFICER",
        actor_name=current_user.full_name,
        description=f"Ward Officer reviewed report. Status updated to {target_status}. Notes: {req.notes or 'None'}"
    )
    db.add(t_ev)
    db.commit()

    # Notify Citizen
    if report.citizen_id:
        create_notification(
            db, target_role="CITIZEN", user_id=report.citizen_id,
            title=f"Report Reviewed: {report.public_report_id}",
            message=f"Officer reviewed your evidence. Status: {target_status}.",
            complaint_id=report.complaint_id,
            notification_type="INFO"
        )

    return {"status": "SUCCESS", "message": f"Report {report.public_report_id} updated to {target_status}"}

@router.post("/{id}/forward")
def forward_report_to_worker(
    id: int,
    req: ForwardReportToWorkerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    """Officer forwards report to field worker for physical verification on site"""
    report = db.query(CitizenEvidenceReport).filter(CitizenEvidenceReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Evidence report not found")

    worker = db.query(Worker).filter(Worker.id == req.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    now = datetime.now(timezone.utc)
    report.assigned_worker_id = worker.id
    report.status = "WORKER_VERIFICATION"
    report.officer_instruction = clean_safe_ascii(req.instruction)
    if req.priority:
        report.priority = req.priority
    report.updated_at = now

    t_ev = EvidenceReportTimeline(
        report_id=report.id,
        event_type="FORWARDED_TO_WORKER",
        actor_role="OFFICER",
        actor_name=current_user.full_name,
        description=f"Forwarded to Field Worker {worker.name} for site verification. Instructions: {req.instruction}"
    )
    db.add(t_ev)
    db.commit()

    # Notify Worker
    create_notification(
        db, target_role="WORKER", user_id=worker.user_id,
        title=f"New Verification Task: {report.public_report_id}",
        message=f"Verify civic condition for {report.related_ticket_number or 'Site'}. Instruction: {req.instruction}",
        complaint_id=report.complaint_id,
        notification_type="ALERT"
    )

    return {"status": "SUCCESS", "message": f"Report forwarded to worker {worker.name}"}

@router.post("/{id}/worker-verify")
def worker_verify_report(
    id: int,
    req: WorkerVerifyReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Field worker submits on-site verification findings back to Officer"""
    report = db.query(CitizenEvidenceReport).filter(CitizenEvidenceReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Evidence report not found")

    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)

    report.worker_notes = clean_safe_ascii(req.worker_notes)
    report.worker_verified_at = now
    report.status = "ACTION_REQUIRED"
    report.updated_at = now

    t_ev = EvidenceReportTimeline(
        report_id=report.id,
        event_type="WORKER_VERIFIED",
        actor_role="WORKER",
        actor_name=worker.name if worker else current_user.full_name,
        description=f"Field verification completed on site. Notes: {req.worker_notes}"
    )
    db.add(t_ev)
    db.commit()

    # Notify Officer
    create_notification(
        db, target_role="OFFICER",
        title=f"Worker Verification Complete: {report.public_report_id}",
        message=f"Worker {worker.name if worker else ''} verified condition. Report ready for final decision.",
        complaint_id=report.complaint_id,
        notification_type="INFO"
    )

    return {"status": "SUCCESS", "message": f"Verification submitted for {report.public_report_id}"}

@router.post("/{id}/resolve")
def resolve_evidence_report(
    id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    """Officer officially approves & resolves evidence report"""
    report = db.query(CitizenEvidenceReport).filter(CitizenEvidenceReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Evidence report not found")

    now = datetime.now(timezone.utc)
    report.status = "RESOLVED"
    report.reviewed_at = now
    report.reviewed_by_id = current_user.id
    if notes:
        report.officer_notes = clean_safe_ascii(notes)
    report.updated_at = now

    t_ev = EvidenceReportTimeline(
        report_id=report.id,
        event_type="RESOLVED",
        actor_role="OFFICER",
        actor_name=current_user.full_name,
        description=f"Ward Officer confirmed and closed report. Resolution notes: {notes or 'Verified and addressed.'}"
    )
    db.add(t_ev)
    db.commit()

    if report.citizen_id:
        create_notification(
            db, target_role="CITIZEN", user_id=report.citizen_id,
            title=f"Report Resolved: {report.public_report_id}",
            message=f"Your evidence for {report.related_ticket_number or 'civic site'} has been officially resolved by Ward Officer.",
            complaint_id=report.complaint_id,
            notification_type="SUCCESS"
        )

    return {"status": "SUCCESS", "message": f"Report {report.public_report_id} resolved"}
