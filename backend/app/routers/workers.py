from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..core.database import get_db
from ..core.security import require_officer_or_admin, require_worker, get_current_user, get_password_hash
from ..models.models import Worker, User, Complaint, WorkAssignment, ComplaintTimeline, ComplaintStatus, UserRole
from ..schemas.schemas import WorkerCreate, WorkerUpdate, WorkerOut, WorkerActionRequest, ComplaintOut
from ..services.notification_service import create_notification

router = APIRouter(prefix="/api/workers", tags=["Workers"])

@router.get("", response_model=List[WorkerOut])
def list_workers(
    ward_number: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Worker)
    if ward_number:
        query = query.filter(Worker.ward_number == ward_number)
    return query.all()

@router.post("", response_model=WorkerOut)
def create_worker(
    worker_in: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    # Check if username or email exists
    email = f"{worker_in.username.lower()}@worker.urbangrid.gov.in"
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Worker with this username already exists")
        
    user = User(
        email=email,
        full_name=worker_in.name,
        phone=worker_in.phone,
        password_hash=get_password_hash(worker_in.password),
        role=UserRole.WORKER.value,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    worker = Worker(
        user_id=user.id,
        name=worker_in.name,
        username=worker_in.username,
        phone=worker_in.phone,
        ward_number=worker_in.ward_number,
        role=worker_in.role or "Field Specialist",
        specialization=worker_in.specialization or "Roads & Civil Works",
        availability="AVAILABLE",
        status="ACTIVE"
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker

@router.patch("/{id}", response_model=WorkerOut)
def update_worker(
    id: int,
    worker_update: WorkerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    worker = db.query(Worker).filter(Worker.id == id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    for k, v in worker_update.model_dump(exclude_unset=True).items():
        setattr(worker, k, v)
        
    db.commit()
    db.refresh(worker)
    return worker

@router.get("/portal/my-tasks", response_model=List[ComplaintOut])
@router.get("/tasks", response_model=List[ComplaintOut])
def get_worker_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    if not worker:
        return []
    return db.query(Complaint).filter(Complaint.assigned_worker_id == worker.id).order_by(desc(Complaint.created_at)).all()

@router.post("/tasks/{complaint_id}/start")
def start_work(
    complaint_id: int,
    req: Optional[WorkerActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    if req is None:
        req = WorkerActionRequest()
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)
    
    assignment = db.query(WorkAssignment).filter(
        WorkAssignment.complaint_id == complaint_id
    ).order_by(desc(WorkAssignment.id)).first()
    if assignment:
        assignment.status = "IN_PROGRESS"
        assignment.started_at = now
        
    complaint.status = ComplaintStatus.IN_PROGRESS.value
    complaint.updated_at = now
    
    tl = ComplaintTimeline(
        complaint_id=complaint.id,
        event_type="WORK_STARTED",
        actor_role="WORKER",
        actor_name=worker.name if worker else current_user.full_name,
        description=f"Field crew commenced physical remediation on site. Notes: {req.notes or 'Crew mobilized with equipment.'}"
    )
    db.add(tl)
    db.commit()

    return {"status": "SUCCESS", "message": "Work marked IN_PROGRESS", "started_at": now}

@router.post("/tasks/{complaint_id}/complete")
def complete_work(
    complaint_id: int,
    req: Optional[WorkerActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    if req is None:
        req = WorkerActionRequest()
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)
    
    assignment = db.query(WorkAssignment).filter(
        WorkAssignment.complaint_id == complaint_id
    ).order_by(desc(WorkAssignment.id)).first()
    if assignment:
        assignment.status = "WORK_COMPLETED"
        assignment.completed_at = now
        
    complaint.status = ComplaintStatus.WORK_COMPLETED.value
    complaint.updated_at = now
    
    tl = ComplaintTimeline(
        complaint_id=complaint.id,
        event_type="WORK_COMPLETED_AWAITING_VERIFICATION",
        actor_role="WORKER",
        actor_name=worker.name if worker else current_user.full_name,
        description=f"Remediation finished on site. Submitted for Ward Officer inspection and verification. Notes: {req.notes or 'Repairs completed.'}"
    )
    db.add(tl)
    db.commit()

    # Officer Notification
    create_notification(
        db, target_role="OFFICER",
        title=f"Verification Required: {complaint.ticket_number}",
        message=f"Worker {worker.name if worker else 'Field Crew'} marked {complaint.category} completed in Ward {complaint.ward_number}. Ready for your verification.",
        complaint_id=complaint.id, notification_type="ALERT"
    )

    return {"status": "SUCCESS", "message": "Work marked WORK_COMPLETED, awaiting officer verification", "completed_at": now}
