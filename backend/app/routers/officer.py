from typing import Optional, List
from datetime import datetime, timezone, date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from ..core.database import get_db
from ..core.security import require_officer_or_admin
from ..models.models import (
    Complaint, ComplaintStatus, PriorityLevel, Worker,
    WorkAssignment, ComplaintTimeline, User, Notification,
    CitizenEvidenceReport
)
from ..schemas.schemas import (
    AssignWorkerRequest, VerifyComplaintRequest, ComplaintDetailOut,
    OfficerSummaryStatsOut
)
from ..services.notification_service import create_notification, clean_safe_ascii

router = APIRouter(prefix="/api/officer", tags=["Municipal Ward Officer"])

@router.get("/summary", response_model=OfficerSummaryStatsOut)
def get_officer_summary_stats(
    ward_number: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    """Ultra-fast aggregated summary KPIs for immediate Officer Dashboard rendering."""
    q = db.query(Complaint)
    if ward_number:
        q = q.filter(Complaint.ward_number == ward_number)

    total_complaints = q.count()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    new_today = q.filter(Complaint.created_at >= today_start).count()
    active_issues = q.filter(Complaint.status.notin_([ComplaintStatus.RESOLVED.value, ComplaintStatus.REJECTED.value])).count()
    critical_high = q.filter(
        Complaint.priority.in_([PriorityLevel.CRITICAL.value, PriorityLevel.HIGH.value]),
        Complaint.status.notin_([ComplaintStatus.RESOLVED.value, ComplaintStatus.REJECTED.value])
    ).count()

    assigned_jobs = q.filter(Complaint.assigned_worker_id.isnot(None), Complaint.status != ComplaintStatus.RESOLVED.value).count()
    in_progress_jobs = q.filter(Complaint.status == ComplaintStatus.IN_PROGRESS.value).count()
    awaiting_verification = q.filter(Complaint.status == ComplaintStatus.WORK_COMPLETED.value).count()
    resolved_complaints = q.filter(Complaint.status == ComplaintStatus.RESOLVED.value).count()

    wq = db.query(Worker)
    if ward_number:
        wq = wq.filter(Worker.ward_number == ward_number)
    total_workers = wq.count()
    available_workers = wq.filter(Worker.availability == "AVAILABLE", Worker.status == "ACTIVE").count()

    unresolved = q.filter(Complaint.status != ComplaintStatus.RESOLVED.value).count()

    eq = db.query(CitizenEvidenceReport)
    if ward_number:
        eq = eq.filter(CitizenEvidenceReport.ward_number == ward_number)
    total_evidence_reports = eq.count()
    pending_evidence_reports = eq.filter(CitizenEvidenceReport.status.in_(["RECEIVED", "UNDER_REVIEW", "ACTION_REQUIRED", "WORKER_VERIFICATION"])).count()

    return OfficerSummaryStatsOut(
        total_complaints=total_complaints,
        new_today=new_today,
        active_issues=active_issues,
        critical_high=critical_high,
        assigned_jobs=assigned_jobs,
        in_progress_jobs=in_progress_jobs,
        awaiting_verification=awaiting_verification,
        resolved_complaints=resolved_complaints,
        total_workers=total_workers,
        available_workers=available_workers,
        unresolved_complaints=unresolved,
        total_evidence_reports=total_evidence_reports,
        pending_evidence_reports=pending_evidence_reports
    )

@router.get("/dashboard")
def get_officer_dashboard_metrics(
    ward_number: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    """
    Computes real-time municipal operational KPIs from PostgreSQL database.
    """
    q = db.query(Complaint)
    if ward_number:
        q = q.filter(Complaint.ward_number == ward_number)

    total = q.count()
    critical = q.filter(Complaint.priority == PriorityLevel.CRITICAL.value).count()
    high = q.filter(Complaint.priority == PriorityLevel.HIGH.value).count()
    medium = q.filter(Complaint.priority == PriorityLevel.MEDIUM.value).count()
    low = q.filter(Complaint.priority == PriorityLevel.LOW.value).count()
    
    in_progress = q.filter(Complaint.status == ComplaintStatus.IN_PROGRESS.value).count()
    awaiting_verification = q.filter(Complaint.status == ComplaintStatus.WORK_COMPLETED.value).count()
    resolved = q.filter(Complaint.status == ComplaintStatus.RESOLVED.value).count()
    
    # Today's new reports
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    new_today = q.filter(Complaint.created_at >= today_start).count()
    
    # Total duplicate supporting reports
    dup_reports_sum = db.query(func.coalesce(func.sum(Complaint.supporting_report_count), 0))
    if ward_number:
        dup_reports_sum = dup_reports_sum.filter(Complaint.ward_number == ward_number)
    duplicate_reports = dup_reports_sum.scalar()

    # Category breakdown
    cat_query = db.query(Complaint.category, func.count(Complaint.id))
    if ward_number:
        cat_query = cat_query.filter(Complaint.ward_number == ward_number)
    category_distribution = {cat: count for cat, count in cat_query.group_by(Complaint.category).all()}

    # Recent critical grievances
    recent_critical = q.filter(
        Complaint.status.notin_([ComplaintStatus.RESOLVED.value, ComplaintStatus.REJECTED.value])
    ).order_by(
        desc(Complaint.priority == PriorityLevel.CRITICAL.value),
        desc(Complaint.created_at)
    ).limit(8).all()

    return {
        "kpis": {
            "total_complaints": total,
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
            "new_today": new_today,
            "duplicate_reports": duplicate_reports,
            "in_progress": in_progress,
            "awaiting_verification": awaiting_verification,
            "resolved": resolved
        },
        "category_distribution": category_distribution,
        "recent_critical": [
            {
                "id": c.id,
                "ticket_number": c.ticket_number,
                "category": c.category,
                "priority": c.priority,
                "status": c.status,
                "ward_number": c.ward_number,
                "city": c.city,
                "report_count": c.report_count,
                "created_at": c.created_at
            }
            for c in recent_critical
        ]
    }

@router.post("/complaints/{id}/assign")
def assign_worker_to_complaint(
    id: int,
    req: AssignWorkerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    worker = db.query(Worker).filter(Worker.id == req.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    complaint.assigned_worker_id = worker.id
    complaint.status = ComplaintStatus.IN_PROGRESS.value
    complaint.updated_at = datetime.now(timezone.utc)
    
    # Create or update WorkAssignment
    assignment = WorkAssignment(
        complaint_id=complaint.id,
        worker_id=worker.id,
        assigned_by_user_id=current_user.id,
        status="ASSIGNED",
        notes=req.notes
    )
    db.add(assignment)
    
    # Timeline
    tl = ComplaintTimeline(
        complaint_id=complaint.id,
        event_type="WORKER_ASSIGNED",
        actor_role="OFFICER",
        actor_name=current_user.full_name,
        description=f"Ward Officer assigned {worker.name} ({worker.specialization}) to resolve issue."
    )
    db.add(tl)
    db.commit()

    # Notifications
    create_notification(
        db, target_role="WORKER", user_id=worker.user_id,
        title=f"New Field Assignment: {complaint.ticket_number}",
        message=f"You have been assigned to {complaint.category} at {complaint.address or f'Ward {complaint.ward_number}'}.",
        complaint_id=complaint.id, notification_type="ALERT"
    )
    create_notification(
        db, target_role="CITIZEN",
        title=f"Field Team Dispatched: {complaint.ticket_number}",
        message=f"Municipal specialist {worker.name} has been assigned to attend to your report.",
        complaint_id=complaint.id, notification_type="INFO"
    )

    return {"status": "SUCCESS", "message": f"Worker {worker.name} successfully assigned to {complaint.ticket_number}"}

@router.post("/complaints/{id}/verify")
def verify_and_resolve_complaint(
    id: int,
    req: VerifyComplaintRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = datetime.now(timezone.utc)
    complaint.status = ComplaintStatus.RESOLVED.value
    complaint.resolved_at = now
    complaint.updated_at = now

    # Update assignment
    assignment = db.query(WorkAssignment).filter(
        WorkAssignment.complaint_id == complaint.id
    ).order_by(desc(WorkAssignment.id)).first()
    if assignment:
        assignment.status = "VERIFIED"
        assignment.verified_at = now

    # Timeline
    tl = ComplaintTimeline(
        complaint_id=complaint.id,
        event_type="OFFICER_VERIFIED_AND_RESOLVED",
        actor_role="OFFICER",
        actor_name=current_user.full_name,
        description=f"Ward Officer personally inspected & verified work completion. Issue closed. Notes: {req.verification_notes or 'All parameters verified on site.'}"
    )
    db.add(tl)
    db.commit()

    # Citizen Notification
    create_notification(
        db, target_role="CITIZEN",
        title=f"Grievance Resolved: {complaint.ticket_number}",
        message=f"Work on {complaint.category} at Ward {complaint.ward_number} has been verified and officially resolved by Municipal Officers.",
        complaint_id=complaint.id, notification_type="SUCCESS"
    )

    return {
        "status": "SUCCESS",
        "message": f"Complaint {complaint.ticket_number} verified and officially resolved.",
        "resolved_at": now
    }

class ComplaintAdminUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    ward_number: Optional[int] = None
    category: Optional[str] = None
    notes: Optional[str] = None

@router.patch("/complaints/{id}")
def update_complaint_admin(
    id: int,
    req: ComplaintAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = datetime.now(timezone.utc)
    changes = []
    if req.status and req.status != complaint.status:
        changes.append(f"Status: {complaint.status} -> {req.status}")
        complaint.status = req.status
        if req.status == "RESOLVED":
            complaint.resolved_at = now
    if req.priority and req.priority != complaint.priority:
        changes.append(f"Priority: {complaint.priority} -> {req.priority}")
        complaint.priority = req.priority
    if req.ward_number and req.ward_number != complaint.ward_number:
        changes.append(f"Ward: {complaint.ward_number} -> {req.ward_number}")
        complaint.ward_number = req.ward_number
    if req.category and req.category != complaint.category:
        changes.append(f"Category: {complaint.category} -> {req.category}")
        complaint.category = req.category

    complaint.updated_at = now

    if changes:
        tl = ComplaintTimeline(
            complaint_id=complaint.id,
            event_type="OFFICER_UPDATED",
            actor_role="OFFICER",
            actor_name=current_user.full_name,
            description=f"Administrative modifications: {', '.join(changes)}. Notes: {req.notes or 'None'}"
        )
        db.add(tl)

    db.commit()
    return {"status": "SUCCESS", "message": f"Complaint {complaint.ticket_number} updated", "ticket_number": complaint.ticket_number}

@router.delete("/complaints/{id}")
def delete_complaint_admin(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    t_num = complaint.ticket_number
    db.delete(complaint)
    db.commit()
    return {"status": "SUCCESS", "message": f"Complaint {t_num} deleted from municipal records"}

