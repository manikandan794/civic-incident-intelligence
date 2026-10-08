import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from ..core.database import get_db
from ..core.config import settings
from ..core.security import get_optional_user, get_current_user
from ..models.models import (
    Complaint, ComplaintReport, ComplaintMedia, AIAnalysis,
    DuplicateMatch, ComplaintTimeline, ComplaintStatus, User,
    SystemSetting, CitizenEvidenceReport
)
from ..schemas.schemas import (
    ComplaintOut, ComplaintDetailOut, SubmissionResponse,
    DuplicateCheckRequest, DuplicateCheckResponse, DuplicateCheckMatch,
    TimelineEventOut, PaginatedComplaintsOut, CitizenEvidenceReportOut
)
from ..services.geospatial_service import (
    haversine_distance_meters, assign_ward_from_coordinates, reverse_geocode_location,
    search_places_geocoding
)
from ..services.ai_service import analyze_civic_media
from ..services.duplicate_engine import evaluate_duplicate_candidates, get_active_duplicate_radius
from ..services.priority_service import calculate_priority
from ..services.notification_service import create_notification, clean_safe_ascii

logger = logging.getLogger("urbangrid.complaints")
router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

def generate_ticket_number(db: Session) -> str:
    """Generates next human-readable civic ticket identifier (e.g. UG-1001)"""
    last = db.query(Complaint).order_by(desc(Complaint.id)).first()
    next_id = 1001 if not last else (1001 + last.id)
    return f"UG-{next_id}"

@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate_preview(req: DuplicateCheckRequest, db: Session = Depends(get_db)):
    """
    Real-time spatial radius pre-check before final submission.
    Searches within the configured radius (Default: 50m).
    """
    active_radius = get_active_duplicate_radius(db)
    
    # Bounding box filter for efficiency
    lat_delta = (active_radius / 111000.0) * 1.5
    lng_delta = (active_radius / (111000.0 * 0.9)) * 1.5
    
    candidates = db.query(Complaint).filter(
        Complaint.latitude.between(req.latitude - lat_delta, req.latitude + lat_delta),
        Complaint.longitude.between(req.longitude - lng_delta, req.longitude + lng_delta)
    ).all()
    
    active_matches = []
    resolved_matches = []
    
    for c in candidates:
        dist = haversine_distance_meters(req.latitude, req.longitude, c.latitude, c.longitude)
        if dist <= active_radius:
            match = DuplicateCheckMatch(
                complaint_id=c.id,
                ticket_number=c.ticket_number,
                category=c.category,
                status=c.status,
                distance_meters=round(dist, 1),
                report_count=c.report_count,
                created_at=c.created_at,
                is_resolved=(c.status == ComplaintStatus.RESOLVED.value)
            )
            if c.status == ComplaintStatus.RESOLVED.value:
                resolved_matches.append(match)
            else:
                active_matches.append(match)
                
    return DuplicateCheckResponse(
        active_radius_meters=active_radius,
        has_active_duplicate=len(active_matches) > 0,
        has_resolved_past_issue=len(resolved_matches) > 0,
        active_matches=active_matches,
        resolved_matches=resolved_matches
    )

@router.post("/submit", response_model=SubmissionResponse)
async def submit_civic_complaint(
    file: UploadFile = File(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    citizen_name: Optional[str] = Form("Citizen"),
    citizen_phone: Optional[str] = Form(None),
    is_recurring_confirmed: Optional[bool] = Form(False),
    parent_ticket_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Main Civic Grievance Submission & Automated Dispatch Pipeline:
    1. Media Storage & Validation
    2. Multimodal AI Analysis (Gemini API with Fallback)
    3. Spatial Ward Auto-Assignment
    4. 50-Meter Active Deduplication Engine
    5. Priority Aggregation & Escalation
    6. Realtime Timeline Event Creation
    7. Multi-Role Notification Dispatch
    """
    # 1. Validate and Store Media
    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed 50MB")
        
    mime_type = file.content_type or "image/jpeg"
    is_video = "video" in mime_type
    media_type = "video" if is_video else "image"
    
    file_ext = os.path.splitext(file.filename)[1] or (".mp4" if is_video else ".jpg")
    stored_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    file_url = f"/uploads/{stored_filename}"
    
    # 2. Multimodal AI Analysis
    ai_result = await analyze_civic_media(
        image_bytes=contents if not is_video else None,
        description=description,
        filename=file.filename
    )
    detected_category = ai_result.get("category", "Other")
    detected_severity = ai_result.get("severity", "MEDIUM")
    
    # 3. Ward Assignment & Address Resolution
    ward_info = assign_ward_from_coordinates(latitude, longitude)
    ward_number = ward_info["ward_number"]
    city_name = ward_info.get("city", "Chennai")
    
    final_address = address
    if not final_address or len(final_address.strip()) < 5:
        final_address = await reverse_geocode_location(latitude, longitude)

    active_radius = get_active_duplicate_radius(db)
    citizen_id = current_user.id if current_user else None
    actual_name = current_user.full_name if current_user else (citizen_name or "Anonymous Citizen")
    actual_phone = current_user.phone if current_user else citizen_phone

    # Handle recurring confirmation if citizen explicitly confirmed "YES — REPORT AGAIN"
    if is_recurring_confirmed and parent_ticket_id:
        parent_comp = db.query(Complaint).filter(Complaint.id == parent_ticket_id).first()
        if parent_comp:
            new_ticket_num = generate_ticket_number(db)
            new_recurrence_count = parent_comp.recurrence_count + 1
            calculated_priority = calculate_priority(detected_severity, 1, new_recurrence_count)
            
            new_comp = Complaint(
                ticket_number=new_ticket_num,
                category=detected_category,
                severity=detected_severity,
                priority=calculated_priority,
                status=ComplaintStatus.SUBMITTED.value,
                title=f"{detected_category} (Recurring Civic Issue)",
                description=description,
                latitude=latitude,
                longitude=longitude,
                address=final_address,
                ward_number=ward_number,
                city=city_name,
                report_count=1,
                supporting_report_count=0,
                recurrence_count=new_recurrence_count,
                parent_recurrence_ticket_id=parent_comp.id,
                active_duplicate_radius_meters=active_radius
            )
            db.add(new_comp)
            db.commit()
            db.refresh(new_comp)
            
            report = ComplaintReport(
                complaint_id=new_comp.id,
                citizen_id=citizen_id,
                citizen_name=actual_name,
                citizen_phone=actual_phone,
                description=description,
                latitude=latitude,
                longitude=longitude,
                is_master_report=True
            )
            db.add(report)
            db.commit()
            db.refresh(report)
            
            media_rec = ComplaintMedia(
                complaint_id=new_comp.id,
                report_id=report.id,
                media_type=media_type,
                file_url=file_url,
                file_name=file.filename,
                file_size_bytes=len(contents),
                mime_type=mime_type
            )
            db.add(media_rec)
            
            ai_rec = AIAnalysis(
                complaint_id=new_comp.id,
                report_id=report.id,
                model=ai_result.get("provider", "Gemini API"),
                category_detected=detected_category,
                severity_detected=detected_severity,
                confidence=ai_result.get("confidence", 0.9),
                summary=ai_result.get("summary", ""),
                keywords=ai_result.get("keywords", []),
                safety_impact=ai_result.get("safety_impact", ""),
                latency_ms=ai_result.get("latency_ms", 0),
                is_fallback=ai_result.get("is_fallback", False)
            )
            db.add(ai_rec)
            
            # Timeline
            t1 = ComplaintTimeline(
                complaint_id=new_comp.id,
                event_type="RECURRING_SUBMISSION",
                actor_role="CITIZEN",
                actor_name=actual_name,
                description=f"Recurring grievance re-reported at site of previous ticket {parent_comp.ticket_number}."
            )
            db.add(t1)
            db.commit()
            
            # Notifications
            create_notification(
                db, target_role="OFFICER",
                title=f"Recurring Civic Issue: {new_comp.ticket_number}",
                message=f"Repeat complaint reported in Ward {ward_number} ({parent_comp.ticket_number} resolved earlier). Recurrence count: {new_recurrence_count}.",
                complaint_id=new_comp.id, notification_type="ESCALATION"
            )
            if citizen_id:
                create_notification(
                    db, target_role="CITIZEN", user_id=citizen_id,
                    title="Recurring Issue Registered",
                    message=f"Your report for recurring {detected_category} has been logged as {new_comp.ticket_number}.",
                    complaint_id=new_comp.id, notification_type="INFO"
                )

            return SubmissionResponse(
                status="CREATED",
                is_duplicate=False,
                ticket_number=new_comp.ticket_number,
                complaint_id=new_comp.id,
                message=f"Recurring civic issue registered successfully as {new_comp.ticket_number}.",
                details={"recurrence_count": new_recurrence_count, "parent_ticket": parent_comp.ticket_number}
            )

    # 4. Run Core Deduplication Engine (Multi-Signal within 50m)
    dup_eval = evaluate_duplicate_candidates(
        db=db,
        latitude=latitude,
        longitude=longitude,
        category=detected_category,
        description=description,
        ai_keywords=ai_result.get("keywords", [])
    )

    # Case A: DUPLICATE DETECTED WITHIN CONFIGURED RADIUS
    if dup_eval.is_duplicate and dup_eval.matched_complaint:
        master = dup_eval.matched_complaint
        old_priority = master.priority
        
        # Link report to existing master ticket
        new_report = ComplaintReport(
            complaint_id=master.id,
            citizen_id=citizen_id,
            citizen_name=actual_name,
            citizen_phone=actual_phone,
            description=description,
            latitude=latitude,
            longitude=longitude,
            distance_to_master_meters=dup_eval.distance_meters,
            is_master_report=False
        )
        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        media_rec = ComplaintMedia(
            complaint_id=master.id,
            report_id=new_report.id,
            media_type=media_type,
            file_url=file_url,
            file_name=file.filename,
            file_size_bytes=len(contents),
            mime_type=mime_type
        )
        db.add(media_rec)

        # Record Duplicate Match Breakdown
        dup_match = DuplicateMatch(
            new_report_id=new_report.id,
            matched_complaint_id=master.id,
            distance_meters=dup_eval.distance_meters,
            spatial_score=dup_eval.breakdown.get("spatial_score", 0.0),
            visual_score=dup_eval.breakdown.get("visual_score", 0.0),
            text_score=dup_eval.breakdown.get("text_score", 0.0),
            category_score=dup_eval.breakdown.get("category_score", 0.0),
            final_duplicate_score=dup_eval.final_score,
            decision="DUPLICATE",
            radius_used_meters=dup_eval.radius_used
        )
        db.add(dup_match)

        # Increment report counts and recalculate priority
        master.report_count += 1
        master.supporting_report_count += 1
        new_priority = calculate_priority(master.severity, master.report_count, master.recurrence_count)
        master.priority = new_priority
        master.updated_at = datetime.now(timezone.utc)
        
        # Timeline Event
        t_event = ComplaintTimeline(
            complaint_id=master.id,
            event_type="SUPPORTING_REPORT_MERGED",
            actor_role="SYSTEM",
            actor_name="AI Spatial Deduplication Engine",
            description=clean_safe_ascii(
                f"Citizen supporting report merged (Distance: {dup_eval.distance_meters:.1f}m within {dup_eval.radius_used:.0f}m radius, "
                f"Duplicate Confidence: {dup_eval.final_score:.1f}%). "
                f"Reports: {master.report_count - 1} -> {master.report_count}. "
                f"Priority escalated: {old_priority} -> {new_priority}."
            ),
            metadata_json=dup_eval.breakdown
        )
        db.add(t_event)
        db.commit()

        # Officer & Citizen Notifications
        create_notification(
            db, target_role="OFFICER",
            title=f"Duplicate Report Merged: {master.ticket_number}",
            message=(
                f"Citizen report verified as duplicate of {master.ticket_number} in Ward {master.ward_number} "
                f"(Distance: {dup_eval.distance_meters:.1f}m). Priority updated to {new_priority}."
            ),
            complaint_id=master.id,
            notification_type="ESCALATION" if old_priority != new_priority else "INFO"
        )
        if citizen_id:
            create_notification(
                db, target_role="CITIZEN", user_id=citizen_id,
                title="Existing Complaint Found - Report Added",
                message=(
                    f"Your grievance matches active ticket {master.ticket_number} ({dup_eval.distance_meters:.1f}m away). "
                    f"Your evidence has been attached to expedite municipal action."
                ),
                complaint_id=master.id, notification_type="INFO"
            )

        return SubmissionResponse(
            status="DUPLICATE_MERGED",
            is_duplicate=True,
            ticket_number=master.ticket_number,
            complaint_id=master.id,
            duplicate_score=dup_eval.final_score,
            distance_meters=dup_eval.distance_meters,
            message=(
                f"An active municipal complaint ({master.ticket_number}) already exists at this location "
                f"({dup_eval.distance_meters:.1f}m away). Your submission has been attached as supporting evidence."
            ),
            details={
                "master_ticket": master.ticket_number,
                "total_reports": master.report_count,
                "old_priority": old_priority,
                "new_priority": new_priority,
                "breakdown": dup_eval.breakdown
            }
        )

    # Case B: NEW DISTINCT COMPLAINT
    ticket_num = generate_ticket_number(db)
    initial_priority = calculate_priority(detected_severity, 1, 0)

    new_comp = Complaint(
        ticket_number=ticket_num,
        category=detected_category,
        severity=detected_severity,
        priority=initial_priority,
        status=ComplaintStatus.SUBMITTED.value,
        title=f"{detected_category} at {ward_info['name']}",
        description=description,
        latitude=latitude,
        longitude=longitude,
        address=final_address,
        ward_number=ward_number,
        city=city_name,
        report_count=1,
        supporting_report_count=0,
        recurrence_count=0,
        active_duplicate_radius_meters=active_radius
    )
    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)

    # Initial Master Report
    initial_report = ComplaintReport(
        complaint_id=new_comp.id,
        citizen_id=citizen_id,
        citizen_name=actual_name,
        citizen_phone=actual_phone,
        description=description,
        latitude=latitude,
        longitude=longitude,
        distance_to_master_meters=0.0,
        is_master_report=True
    )
    db.add(initial_report)
    db.commit()
    db.refresh(initial_report)

    # Media
    media_rec = ComplaintMedia(
        complaint_id=new_comp.id,
        report_id=initial_report.id,
        media_type=media_type,
        file_url=file_url,
        file_name=file.filename,
        file_size_bytes=len(contents),
        mime_type=mime_type
    )
    db.add(media_rec)

    # AI Analysis
    ai_rec = AIAnalysis(
        complaint_id=new_comp.id,
        report_id=initial_report.id,
        model=ai_result.get("provider", "Gemini API"),
        category_detected=detected_category,
        severity_detected=detected_severity,
        confidence=ai_result.get("confidence", 0.9),
        summary=ai_result.get("summary", ""),
        keywords=ai_result.get("keywords", []),
        safety_impact=ai_result.get("safety_impact", ""),
        latency_ms=ai_result.get("latency_ms", 0),
        is_fallback=ai_result.get("is_fallback", False)
    )
    db.add(ai_rec)

    # Timeline Events
    events = [
        ComplaintTimeline(
            complaint_id=new_comp.id,
            event_type="REPORT_SUBMITTED",
            actor_role="CITIZEN",
            actor_name=actual_name,
            description=f"Citizen filed civic report for {detected_category}."
        ),
        ComplaintTimeline(
            complaint_id=new_comp.id,
            event_type="AI_ANALYSIS_COMPLETED",
            actor_role="SYSTEM",
            actor_name="Gemini Multimodal AI",
            description=f"Vision inspection completed. Detected {detected_category} with {detected_severity} severity ({ai_result.get('confidence', 0.9)*100:.0f}% confidence)."
        ),
        ComplaintTimeline(
            complaint_id=new_comp.id,
            event_type="DUPLICATE_CHECK_PASSED",
            actor_role="SYSTEM",
            actor_name="Spatial Deduplication Engine",
            description=f"Spatial deduplication scan verified zero active complaints within {active_radius:.0f}m radius."
        ),
        ComplaintTimeline(
            complaint_id=new_comp.id,
            event_type="WARD_ASSIGNED",
            actor_role="SYSTEM",
            actor_name="Tamil Nadu GIS Routing",
            description=f"Geospatially routed to Ward {ward_number} ({ward_info['name']}, {city_name})."
        )
    ]
    for ev in events:
        db.add(ev)
    db.commit()

    # Notifications
    create_notification(
        db, target_role="OFFICER",
        title=f"New Complaint: {new_comp.ticket_number} ({detected_category})",
        message=f"New {detected_severity} priority {detected_category} registered in Ward {ward_number}.",
        complaint_id=new_comp.id,
        notification_type="ALERT" if detected_severity in ["HIGH", "CRITICAL"] else "INFO"
    )
    if citizen_id:
        create_notification(
            db, target_role="CITIZEN", user_id=citizen_id,
            title=f"Report Registered: {new_comp.ticket_number}",
            message=f"Your complaint for {detected_category} has been assigned to Ward {ward_number}.",
            complaint_id=new_comp.id, notification_type="SUCCESS"
        )

    return SubmissionResponse(
        status="CREATED",
        is_duplicate=False,
        ticket_number=new_comp.ticket_number,
        complaint_id=new_comp.id,
        message=f"Civic grievance registered successfully with Ticket ID {new_comp.ticket_number}.",
        details={
            "category": detected_category,
            "severity": detected_severity,
            "priority": initial_priority,
            "ward_number": ward_number,
            "city": city_name
        }
    )

@router.get("", response_model=List[ComplaintOut])
def list_complaints(
    category: Optional[str] = None,
    status: Optional[str] = None,
    ward_number: Optional[int] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if category:
        query = query.filter(Complaint.category == category)
    if status:
        query = query.filter(Complaint.status == status)
    if ward_number:
        query = query.filter(Complaint.ward_number == ward_number)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if city:
        query = query.filter(Complaint.city == city)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Complaint.ticket_number.ilike(search_filter),
                Complaint.title.ilike(search_filter),
                Complaint.description.ilike(search_filter),
                Complaint.address.ilike(search_filter)
            )
        )
    return query.order_by(desc(Complaint.created_at)).offset(offset).limit(limit).all()

@router.get("/paginated", response_model=PaginatedComplaintsOut)
def list_complaints_paginated(
    page: int = 1,
    limit: int = 15,
    category: Optional[str] = None,
    status: Optional[str] = None,
    ward_number: Optional[int] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Server-side paginated list of complaints for Officer Dashboard"""
    query = db.query(Complaint)
    if category and category != "ALL":
        query = query.filter(Complaint.category == category)
    if status and status != "ALL":
        query = query.filter(Complaint.status == status)
    if ward_number:
        query = query.filter(Complaint.ward_number == ward_number)
    if priority and priority != "ALL":
        query = query.filter(Complaint.priority == priority)
    if city and city != "ALL":
        query = query.filter(Complaint.city == city)
    if search and search.strip():
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Complaint.ticket_number.ilike(search_filter),
                Complaint.title.ilike(search_filter),
                Complaint.description.ilike(search_filter),
                Complaint.address.ilike(search_filter)
            )
        )
    total = query.count()
    offset = (page - 1) * limit
    items = query.order_by(desc(Complaint.created_at)).offset(offset).limit(limit).all()
    total_pages = max(1, (total + limit - 1) // limit)
    return PaginatedComplaintsOut(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.get("/search-location")
async def search_location_endpoint(q: Optional[str] = Query(None), query: Optional[str] = Query(None)):
    """Real location search across Tamil Nadu via Nominatim geocoding service"""
    term = q or query or ""
    if not term.strip():
        return []
    return await search_places_geocoding(term)

@router.get("/my-reports", response_model=List[ComplaintOut])
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns complaints submitted by current authenticated citizen"""
    report_complaint_ids = db.query(ComplaintReport.complaint_id).filter(
        ComplaintReport.citizen_id == current_user.id
    ).distinct().all()
    ids = [r[0] for r in report_complaint_ids]
    return db.query(Complaint).filter(Complaint.id.in_(ids)).order_by(desc(Complaint.created_at)).all()

@router.get("/ticket/{ticket_number}", response_model=ComplaintDetailOut)
def get_complaint_by_ticket(ticket_number: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.ticket_number == ticket_number.upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail=f"No complaint found with ticket number {ticket_number}")
    return complaint

@router.get("/track/{ticket_number}", response_model=ComplaintDetailOut)
def track_complaint_by_ticket(ticket_number: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.ticket_number == ticket_number.upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail=f"No complaint found with ticket number {ticket_number}")
    return complaint

@router.get("/{id}", response_model=ComplaintDetailOut)
def get_complaint_detail(id: int, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@router.get("/{id}/evidence-reports", response_model=List[CitizenEvidenceReportOut])
def get_complaint_evidence_reports(id: int, db: Session = Depends(get_db)):
    """Returns all citizen evidence reports associated with complaint ID"""
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    reports = db.query(CitizenEvidenceReport).filter(CitizenEvidenceReport.complaint_id == id).all()
    results = []
    for r in reports:
        out = CitizenEvidenceReportOut.model_validate(r)
        out.attachment_count = len(r.attachments)
        results.append(out)
    return results

@router.get("/{id}/timeline", response_model=List[TimelineEventOut])
def get_complaint_timeline(id: int, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return db.query(ComplaintTimeline).filter(ComplaintTimeline.complaint_id == id).order_by(ComplaintTimeline.created_at.asc()).all()
